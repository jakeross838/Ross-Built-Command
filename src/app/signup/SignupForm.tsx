"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = undefined;

// Segmenting dropdowns. Stored on the org for future use — nothing keys off
// them yet (per the one-screen-signup spec).
const COMPANY_TYPES = [
  "Custom Homes",
  "Remodeler",
  "Production Builder",
  "General Contractor",
];
const REVENUE_BANDS = ["<$5M", "$5–20M", "$20M+"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full mt-2 py-3 bg-[var(--nw-stone-blue)] text-[color:var(--nw-white-sand)] font-display text-[13px] tracking-[0.1em] uppercase hover:bg-[var(--nw-gulf-blue)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Creating account…" : "Create Account"}
    </button>
  );
}

export default function SignupForm({ plan }: { plan: string | null }) {
  const [state, formAction] = useFormState(signupAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {plan && <input type="hidden" name="plan" value={plan} />}

      <SectionLabel>Your account</SectionLabel>
      <Field label="Full Name" name="full_name" type="text" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <SectionLabel>Your company</SectionLabel>
      <Field
        label="Company Name"
        name="company_name"
        type="text"
        autoComplete="organization"
        required
      />
      <Field
        label="Address"
        name="company_address"
        type="text"
        autoComplete="street-address"
        placeholder="Street, City, State ZIP"
        required
      />
      <Field label="Phone" name="company_phone" type="tel" autoComplete="tel" required />
      <LogoField />
      <SelectField label="Company Type" name="company_type" required defaultValue="">
        <option value="" disabled>
          Select one…
        </option>
        {COMPANY_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </SelectField>
      <SelectField label="Annual Revenue" name="revenue_band" hint="Optional" defaultValue="">
        <option value="">Prefer not to say</option>
        {REVENUE_BANDS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </SelectField>

      {state?.error && (
        <p className="text-[13px] text-[color:var(--nw-danger)] border border-[rgba(176,85,78,0.35)] bg-[rgba(176,85,78,0.08)] px-3 py-2">
          {state.error}
        </p>
      )}

      <SubmitButton />
      <p className="text-[11px] text-[color:var(--text-secondary)] text-center leading-relaxed">
        Company name, address, phone, and logo appear on your G702 draws and invoice
        headers. You can change any of them later in Settings.
      </p>
      <p className="text-[11px] text-[color:var(--text-secondary)] text-center leading-relaxed">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mt-2 text-[10px] uppercase text-[color:var(--text-tertiary)] first:mt-0"
      style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.14em" }}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  name,
  type = "text",
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]"
      >
        {label}
        {hint && (
          <span className="ml-1.5 tracking-normal normal-case text-[color:var(--text-tertiary)]">
            · {hint}
          </span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        {...rest}
        className="px-3 py-2.5 border border-[var(--border-default)] bg-[var(--bg-card)] text-[color:var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--nw-stone-blue)]"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  hint,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]"
      >
        {label}
        {hint && (
          <span className="ml-1.5 tracking-normal normal-case text-[color:var(--text-tertiary)]">
            · {hint}
          </span>
        )}
      </label>
      <select
        id={name}
        name={name}
        {...rest}
        className="px-3 py-2.5 border border-[var(--border-default)] bg-[var(--bg-card)] text-[color:var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--nw-stone-blue)]"
      >
        {children}
      </select>
    </div>
  );
}

function LogoField() {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="logo"
        className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]"
      >
        Logo
      </label>
      <input
        id="logo"
        name="logo"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        required
        className="text-[13px] text-[color:var(--text-secondary)] file:mr-3 file:border file:border-[var(--border-default)] file:bg-[var(--bg-card)] file:px-3 file:py-1.5 file:text-[11px] file:uppercase file:tracking-[0.08em] file:text-[color:var(--text-primary)] hover:file:border-[var(--nw-stone-blue)] file:cursor-pointer"
      />
      <span className="text-[10px] text-[color:var(--text-tertiary)]">
        PNG, JPG, WebP or SVG · max 2 MB · appears on draws &amp; headers
      </span>
    </div>
  );
}
