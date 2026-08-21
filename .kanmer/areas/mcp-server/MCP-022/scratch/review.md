# Review — MCP-022 (self-review)

**Disclosure:** I am both the implementation author and reviewer for this auto-pipeline pass; this is not an independent review.

## Changes inspected

- `project-identity.ts` owns canonical root handling and the exact ordered SHA-256 fingerprint payload, with `boardSource` excluded from the hash.
- `errors.ts` centralizes all MCP `isError` results and limits structured codes to `WRONG_PROJECT`, `REVISION_CONFLICT`, and narrowly matched real gate/collapsed-pipeline errors.
- `index.ts` applies the optional call-level schema to every write registration and validates/strips it ahead of actor attribution and initialization; `get_status` adds project/compat fields.
- Smokes cover schema inventory, fresh-root zero-byte refusal, bulk/migration mismatches, metadata non-persistence, compatibility text, raw protocol serialization, and deterministic identity vectors.
- The canonical skill reference and committed plugin bundle agree with the tool surface.

## Checks

- PR #102 is open, mergeable, contains only the planned source/test/reference/generated-bundle changes, and has commit `7283abf`.
- `git diff --check origin/main...HEAD` passed.
- Report claims match the diff and its recorded evidence: workspace typecheck/build, stdio 184/184, protocol 42/42, discovery 13/13, HTTP 3/3.
- Linked ADR-0016 / FRD-022 are respected: no core or new tool surface, token remains optional, and MCP-023 is untouched.
- Open questions are all resolved.

## Comments and disposition

- Non-blocking: normal-checkout `plugin:check` cannot truthfully run in the linked ticket worktree; it is explicitly deferred and remains unticked for merged-main verification.
- No blocking findings. The token check is before `ensureInit()`, and `create_items` remains call-level only.

## Verdict

**PASS (self-review, not independent).** Standing full-pipeline delegation authorizes merge; next is merged-main verification.
