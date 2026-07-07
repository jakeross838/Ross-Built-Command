import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { PUBLIC_APP_NAME } from "@/lib/org/branding";
import { NwWordmark } from "@/components/branding/Wordmark";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  // If already signed in, bounce to the home screen.
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const sessionStalled = searchParams?.reason === "session_stalled";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <NwWordmark size={200} className="mx-auto" />
          <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Sign in to {PUBLIC_APP_NAME}
          </p>
        </div>

        {sessionStalled && (
          <div
            className="mb-4 border px-4 py-3 text-[13px]"
            style={{
              borderColor: "var(--flash-border)",
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
            }}
          >
            Your session needed to refresh and timed out — please sign in again.
          </div>
        )}

        <div
          className="p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-default)",
          }}
        >
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
          New to {PUBLIC_APP_NAME}?{" "}
          <a
            href="/signup"
            className="hover:underline underline-offset-4"
            style={{ color: "var(--nw-gulf-blue)" }}
          >
            Start a free trial
          </a>
        </p>
      </div>
    </div>
  );
}
