-- 00118: Normalized uniqueness for cost_codes (audit #1 hardening).
--
-- The existing UNIQUE (code, org_id) WHERE deleted_at IS NULL index (00001)
-- compares raw bytes, so two codes that render identically but differ by
-- invisible characters (zero-width space/joiner, BOM, non-breaking space) or
-- stray/collapsible whitespace would slip past it and create phantom
-- "duplicate" codes within an org. This migration adds byte-normalized
-- uniqueness so an org can never carry two codes that normalize to the same
-- string, and normalizes codes on write so stored values stay clean.
--
-- NOTE: this org-scopes uniqueness by (org_id, normalized code). It does NOT
-- affect the audit's headline "duplicate 05101" — that was a cross-org query
-- leak (fixed in code by org-scoping the parser's cost-code list), not an
-- intra-org collision. This is future-proofing so no invisible-char variant can
-- ever recreate the ambiguity.

-- Immutable normalizer: strip zero-width + BOM + NBSP, collapse internal
-- whitespace to a single space, trim, empty -> NULL. IMMUTABLE so it can back a
-- functional unique index.
CREATE OR REPLACE FUNCTION public.nw_normalize_cost_code(c text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT nullif(
    btrim(
      regexp_replace(
        -- chr(8203)=U+200B ZWSP, 8204=ZWNJ, 8205=ZWJ, 65279=U+FEFF BOM, 160=NBSP
        translate(c, chr(8203) || chr(8204) || chr(8205) || chr(65279) || chr(160), ''),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

-- Normalize existing stored codes (pre-flight verified: zero (org_id,
-- normalized-code) collisions across all orgs, so the unique index below is
-- safe to create).
UPDATE public.cost_codes
   SET code = public.nw_normalize_cost_code(code),
       updated_at = now()
 WHERE code IS DISTINCT FROM public.nw_normalize_cost_code(code);

-- The normalized unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS cost_codes_org_normalized_code_uniq
  ON public.cost_codes (org_id, public.nw_normalize_cost_code(code))
  WHERE deleted_at IS NULL;

-- Keep stored codes normalized on every write.
CREATE OR REPLACE FUNCTION public.nw_cost_code_normalize_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.code := public.nw_normalize_cost_code(NEW.code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cost_codes_normalize_code ON public.cost_codes;
CREATE TRIGGER cost_codes_normalize_code
  BEFORE INSERT OR UPDATE OF code ON public.cost_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.nw_cost_code_normalize_trg();
