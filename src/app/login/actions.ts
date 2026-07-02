"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Flat-IA rework: everyone lands on Invoices (/financials/bills), the
  // canonical default surface. The 5-step /onboard wizard has been retired
  // (onboarding is now inline — see src/app/signup + the guided empty
  // Invoices state), so there is no onboarding-state branch here anymore.
  redirect("/financials/bills");
}

export async function logoutAction() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
