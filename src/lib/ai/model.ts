/**
 * Single source of truth for the Anthropic model ID used by EVERY AI feature in
 * the app — invoice parsing, cost-intelligence (match / extract / convert /
 * classify), proposal extraction + classification, support chat, and the
 * vision-verification harness.
 *
 * Override per environment with the `ANTHROPIC_MODEL` env var; the default below
 * is the current model. Retiring or upgrading the model is a ONE-LINE change
 * here (or an env-var flip in Vercel) — never a codebase hunt again.
 *
 * History: the dated snapshot `claude-sonnet-4-20250514` was retired and began
 * 404'ing every AI call (invoice parse especially). That is exactly the class of
 * failure this constant exists to make trivial to fix.
 */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
