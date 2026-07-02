"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export type SignupState = { error?: string } | undefined;

// Mirrors the /api/organizations/logo route contract (bucket "logos", stable
// path {org_id}/logo.{ext}, 2 MB cap). The signup form uploads the logo here,
// once, right after sign-in — so a brand-new org lands with its G702/header
// branding already in place.
const LOGO_ACCEPTED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function logoExt(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "png";
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();
  const companyAddress = String(formData.get("company_address") ?? "").trim();
  const companyPhone = String(formData.get("company_phone") ?? "").trim();
  const companyType = String(formData.get("company_type") ?? "").trim();
  const revenueBand = String(formData.get("revenue_band") ?? "").trim();
  const logo = formData.get("logo");

  if (
    !fullName ||
    !email ||
    !password ||
    !companyName ||
    !companyAddress ||
    !companyPhone ||
    !companyType
  ) {
    return { error: "Please fill in all required fields." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = createServerClient();

  // create_signup is a SECURITY DEFINER RPC that atomically creates the auth
  // user (pre-confirmed), profile row, organization (onboarding_complete =
  // TRUE — the one-screen signup IS onboarding), and owner membership. It now
  // also persists the company address/phone and the two segmenting fields.
  // See supabase/migrations/00113_one_screen_signup.sql.
  const { data: rpcData, error: rpcErr } = await supabase.rpc("create_signup", {
    p_email: email,
    p_password: password,
    p_full_name: fullName,
    p_company_name: companyName,
    p_company_address: companyAddress,
    p_company_phone: companyPhone,
    p_company_type: companyType,
    p_revenue_band: revenueBand || null,
  });
  if (rpcErr) {
    if (rpcErr.code === "23505" || /already exists/i.test(rpcErr.message)) {
      return { error: "An account with that email already exists." };
    }
    return { error: `Sign-up failed: ${rpcErr.message}` };
  }

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    return { error: `Account created but sign-in failed: ${signInErr.message}` };
  }

  // Best-effort logo upload — now authenticated as the org owner. A failure
  // here NEVER blocks signup: the org already exists and the logo can be set
  // any time in Settings. Stranding a new customer on a logo hiccup would be
  // worse than a missing logo.
  const orgId = (rpcData as { org_id?: string } | null)?.org_id;
  if (
    orgId &&
    logo instanceof File &&
    logo.size > 0 &&
    logo.size <= LOGO_MAX_BYTES &&
    LOGO_ACCEPTED.has(logo.type)
  ) {
    try {
      const buffer = Buffer.from(await logo.arrayBuffer());
      const path = `${orgId}/logo.${logoExt(logo.type)}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, buffer, {
          contentType: logo.type,
          upsert: true,
          cacheControl: "3600",
        });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
        await supabase
          .from("organizations")
          .update({ logo_url: `${pub.publicUrl}?v=${Date.now()}` })
          .eq("id", orgId);
      }
    } catch {
      // swallow — logo is not required for signup to succeed
    }
  }

  // Straight into the app. Invoices (/financials/bills) is the default landing
  // for the flat IA; its empty state guides first-time setup (cost codes →
  // job → upload invoice).
  redirect("/financials/bills");
}
