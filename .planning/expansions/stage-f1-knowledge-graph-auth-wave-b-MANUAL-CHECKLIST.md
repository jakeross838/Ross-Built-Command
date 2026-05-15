# Manual setup checklist — stage-f1-knowledge-graph-auth-wave-b (Slice 1)

**Status:** RESOLVED 2026-05-15 12:46 — Item 1 validated via re-invocation #2 (`gen types --linked` canonical check returned 5230 lines of valid TypeScript). SETUP-COMPLETE.md written. See `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-SETUP-COMPLETE.md` for full evidence.
**Generated:** 2026-05-15 (post-nwrp153 EXPANDED-SCOPE approval)

After completing each item, run `/nightwork-auto-setup stage-f1-knowledge-graph-auth-wave-b` again to validate.

---

## Validation attempt 1 — 2026-05-15 12:38 (FAILED)

`/nightwork-auto-setup stage-f1-knowledge-graph-auth-wave-b` re-invoked. Validation results:

| Check | Result | Error |
|-------|--------|-------|
| V1-V6 (all 6 VALIDATEs) | PASS | n/a — re-verified |
| Item 1 hook H1.a (`npx supabase projects list`) | **FAIL** | `Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.` |
| Item 1 hook H1.b (`ls supabase/config.toml`) | **FAIL** | `No such file or directory` |
| Item 1 hook H1.c (`npx supabase gen types typescript --linked`) | **FAIL** | `Initialising login role... Access token not provided.` |

**Diagnosis:** the `supabase login` step from Item 1 has not been executed yet (no `~/.supabase/access-token` present; no `supabase/config.toml` written by `supabase link`). The auto-setup command cannot run interactive `supabase login` on Jake's behalf — it requires a browser-based OAuth redirect (or a PAT pasted into the terminal).

**Action required:** Jake completes Item 1 below, then re-invokes `/nightwork-auto-setup stage-f1-knowledge-graph-auth-wave-b`.

---

---

## Item 1: Supabase CLI auth + project link

**Why:** Plan B-1b's type-generation pipeline runs `npx supabase gen types typescript --linked > src/lib/types/database.types.ts` (per nwrp152 stated scope). The `--linked` flag requires (a) a logged-in Supabase CLI session and (b) the local repo linked to the project via `supabase link --project-ref <ref>`. Without both, B-1b's type-gen step fails at /nx execute time and blocks Wave-B-Slice-1 ship.

**Time estimate:** 3-5 minutes (one-time setup per PC checkout; subsequent commands use the persisted auth)

**Project ref (already known):** `egxkffodxcefwpqmwrur` (derived from `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`)

**Steps:**

1. Open your terminal in the repo root: `C:\Users\Jake\nightwork-platform`

2. **Authenticate the CLI (interactive — opens a browser):**
   ```
   ! npx supabase login
   ```
   The `! ` prefix is the Claude Code convention so the interactive output lands in this conversation. If running outside Claude Code, just `npx supabase login`. A browser tab opens to `https://supabase.com/dashboard/sign-in` — sign in with your Supabase account (the one that owns this project, `nightwork-platform`). The CLI captures the access token automatically.

3. **Link the repo to the production project:**
   ```
   ! npx supabase link --project-ref egxkffodxcefwpqmwrur
   ```
   This creates `supabase/config.toml` + `supabase/.temp/access-token` (sensitive — see step 5). It may prompt for the database password — paste from your Supabase dashboard project settings or skip if it's already auto-detected from env.

4. **Verify the link:**
   ```
   ! npx supabase projects list
   ```
   Should show the linked project (look for `nightwork-platform` with `LINKED` marker or similar). If it just lists projects without the link marker, run step 3 again.

5. **Verify supabase/.temp/ is gitignored (or add it):**
   ```
   ! git check-ignore -v supabase/.temp/ 2>&1
   ```
   If git check-ignore returns nothing (NOT ignored): add `supabase/.temp/` to `.gitignore` before any commit. This is plan-author scope for B-1b but worth checking now since `supabase link` may have written sensitive auth state.

6. **Test type generation works (optional pre-flight; the actual gen runs at B-1b execute time):**
   ```
   ! npx supabase gen types typescript --linked
   ```
   Should print a TypeScript file to stdout starting with `export type Json = ...`. Don't redirect to a file; just verify the command exits 0 with valid TS output.

**Validation (will run automatically when you re-invoke /nightwork-auto-setup):**
- `npx supabase projects list` returns >0 lines including the project ref `egxkffodxcefwpqmwrur`
- `npx supabase gen types typescript --linked` exits 0 with valid TS output (first line matches `export type Json = `)
- `ls supabase/config.toml` succeeds (link created the config)

**Failure modes + recovery:**
- **Browser-blocked OAuth:** if your browser blocks the Supabase auth redirect, use a Personal Access Token instead. Generate one at https://supabase.com/dashboard/account/tokens, then `! export SUPABASE_ACCESS_TOKEN=<token>` and skip `supabase login`.
- **`supabase link` 401:** access token expired. Re-run `supabase login`.
- **`gen types` 403:** account doesn't have read access to the project. Verify you're signed in with the org-owner account.

---

## After this item completes

Run: `/nightwork-auto-setup stage-f1-knowledge-graph-auth-wave-b`

The command will re-run all 6 VALIDATE checks (already passing) + the validation hooks for Item 1 above. On 100% pass, it writes `stage-f1-knowledge-graph-auth-wave-b-SETUP-COMPLETE.md` and you're cleared to run `/np stage-f1-knowledge-graph-auth-wave-b` to author the 3 slice plans.
