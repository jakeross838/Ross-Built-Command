import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The 5-step onboarding wizard has been retired in favor of a single signup
// screen (src/app/signup). Onboarding is now inline: signup collects the
// company essentials (name, address, phone, logo, type, revenue) and marks the
// org onboarding_complete, and the empty Invoices state guides first-time
// setup (cost codes → first job → upload invoice). Financial defaults and team
// invites live in Settings. Any lingering /onboard link lands in the app.
export default async function OnboardPage() {
  redirect("/financials/bills");
}
