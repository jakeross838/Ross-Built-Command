-- 00120: Per-draw deposit application (BLOCK B / 1.6 — deposit).
--
-- The deposit was previously all-or-nothing: draws.deposit_amount holds the
-- FULL contract deposit (deposit_percentage x original_contract_amount) and was
-- never applied to current_payment_due — while the statement renderer showed
-- the full deposit as a credit on every draw. There is no boolean toggle to
-- migrate (verified: draws has only deposit_amount + is_final), so this adds a
-- granular applied-this-draw column instead of replacing one.
--
-- deposit_applied_cents = how much of the deposit pool THIS draw applies as a
-- credit. Unsigned. The pool is draws.deposit_amount (informational, AIA line
-- 1a). "Applied to date" = SUM(deposit_applied_cents) across all non-void draws
-- on the job (draft applications reserve the pool so two open drafts can't
-- oversubscribe; void returns it). Remaining pool for a draw = deposit_amount
-- minus applied-to-date on OTHER non-void draws. Application is capped at the
-- remaining pool, validated at save AND at approve.
--
-- G702 placement: an explicit "Less Deposit Credit Applied" deduction line
-- BETWEEN line 7 (previous certificates) and line 8 (current payment due) —
-- never folded into line 7 (that would conflate deposit with prior
-- certificates). current_payment_due = line 6 - line 7 - deposit_applied.

ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS deposit_applied_cents BIGINT NOT NULL DEFAULT 0
    CHECK (deposit_applied_cents >= 0);

COMMENT ON COLUMN public.draws.deposit_applied_cents IS
'Cents of the deposit pool (draws.deposit_amount) applied as a credit on THIS draw. Unsigned. Applied-to-date = SUM across all non-void draws on the job (drafts reserve the pool; void returns it). Capped at the remaining pool at save and at approve. Renders as the AIA "Less Deposit Credit Applied" deduction line between line 7 and line 8: current_payment_due = total_earned_less_retainage - less_previous_certificates - deposit_applied_cents. BLOCK B / 1.6.';
