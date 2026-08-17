# Review — MCP-006 / PR #58

**I am both author and reviewer.** This is not an independent review and should
not be read as one. Everything below was checked against the diff, the running
code and the rail output rather than against my own recollection of writing it,
but a second pair of eyes would still be worth more.

Reviewed: `gh pr diff 58` (10 files), the plan's Governing-docs section, the
post-implementation report, `open-questions`, and the rail run in the worktree.
PR state at review: `OPEN`, `MERGEABLE`, `mergeStateStatus: CLEAN`, no CI checks
configured on the branch.

## Changes — in the reviewer's words

**`packages/core/src/store.ts`** — two edits. `conflictError`'s first parameter
goes from `Item` to `{ updated: string; body?: string }`; the destructure and the
template string underneath are untouched, so the rejection wording is
byte-identical and the `/Conflict/` assertions in `store.test.ts` and `smoke.mjs`
still bind to the same text. `updateGroup` gains `expectedUpdated` and is
reordered: destructure the token off the patch, read, throw on mismatch, prune,
spread, then the existing serialise-compare no-op short-circuit. The three
guards land in the only order that works, and the docblock says why each exists
rather than merely that it does.

**`packages/core/src/store.test.ts`** — 107 added lines, nine tests, in a
`describe("updateGroup")` after the group-filter block. Notably they assert
against **file bytes**, not just returned objects, for the two silent-corruption
cases (token in frontmatter, `title:` erasure) — which is the only way those two
could be caught, since the returned object looks right in both.

**`packages/mcp-server/src/index.ts`** — one new `registerTool` between
`create_group` and `get_group`, plus two description edits. Handler is one
expression, rest-spread, no logic of its own. Annotations
`readOnlyHint:false / destructiveHint:false / idempotentHint:true`.

**`smoke.mjs` / `smoke-protocol.mjs`** — `29 → 30` in both, `update_group` added
to the existence list, and a 13-check block placed *after* `list_groups filters
by kind` and ending with an unarchive, so the pre-existing "list_groups returns
both" check is unaffected either way.

**`tool-reference.md`** — one added row, one corrected row.

**`kanmer-mcp.cjs`** — 1.4 MB regenerated bundle.

**`AGENTS.md` / `FRD-001` / `FRD-022`** — prose only.

## Comments

1. **Non-blocking — the report's headline claim is verifiable and true.** "29 →
   30" was checked independently of the author's arithmetic: 30 `registerTool`
   call sites, 30 first-cell names in the reference tables, no drift in either
   direction, and `smoke:protocol` observing 30 on all three protocol versions.
   The three numbers agree from three different directions.
2. **Blocking-if-wrong, checked and correct — the conflict wording.** The whole
   reason `conflictError` was widened structurally rather than duplicated is that
   its text is contract. `git diff` on the template literal: no change. The
   `body` property survives in the signature purely so the existing
   `const { body: _body, ...frontmatter }` destructure still compiles, which is
   the minimal widening rather than `Record<string, unknown>`.
3. **Non-blocking, and the sharpest thing in the diff — the ordering test.**
   "rejects a stale expectedUpdated even when the patch is a no-op" is the test
   that actually distinguishes correct code from plausible code here. Without it,
   swapping the conflict check and the no-op check passes every other test in the
   file. Good that it exists; it should not be deleted by a future refactor that
   finds it redundant.
4. **Non-blocking — `kind` is ignored, not rejected, and the smoke check is
   honest about it.** The plan expected `update_group(kind: ...)` to error. It
   does not: the MCP SDK parses tool arguments with a non-strict `z.object`, which
   strips unknown keys silently. The author rewrote the check to assert the group
   is still `epic` afterwards rather than asserting an error that never comes.
   That is the right call — an assertion that passes for the wrong reason is
   worse than no assertion — but reviewers of *future* tool work should know this
   is SDK-wide: no Kanmer tool rejects an unknown argument.
5. **Non-blocking — the conflict message says "Re-read the item" for a group.**
   Slightly wrong noun, deliberately left, called out in both the code comment and
   the report. Correct trade: the wording is asserted in two places.
6. **Non-blocking — FRD-022's R2 Phase-0.2 bullet still carries stale line refs**
   (`index.ts:744` / `:800`; the real ones are `:976` / `:1025`). The *claim* is
   still true — `destructiveHint: true` is on exactly two tools — and only the
   line numbers moved. Sitting directly under a freshly recounted R1 it looks
   inconsistent.
7. **Non-blocking — the report's "verification hand-off" is honest about what it
   could not run.** `plugin:check` refused in the worktree by design. Rather than
   claim a pass, the report splits the check in half: the name comparison was
   reproduced by hand and is recorded as done; the byte comparison is explicitly
   deferred to verify with the mitigation (no absolute paths in the bundle)
   stated. That is the right shape for an un-runnable gate.
8. **Non-blocking — scope held.** `git diff AGENTS.md` touches §5 and nothing
   else. No `.claude/skills/…` edit, nothing under `apps/gui/release/`. The three
   parked items in `open-questions` stayed parked; no GUI code was smuggled in
   despite the temptation of an already-wired IPC path.

## Disposition

| # | Point | Disposition |
|---|---|---|
| 1 | Tool count verifiable | **Verified** — 30/30/30 from three directions |
| 2 | Conflict wording unchanged | **Verified** in the diff |
| 3 | Ordering test present | **Verified** — keep it |
| 4 | `kind` ignored not rejected | **Won't-do** — SDK behaviour, not this tool's; the smoke check asserts the honest outcome and the report documents it |
| 5 | "item" in a group's conflict message | **Won't-do** — the wording is contract, asserted twice |
| 6 | FRD-022 R2 stale line refs | **Won't-do in this PR** — out of scope (the operator's instruction was the R1 count), the claim is still true, and line refs across that whole audit note are stale by construction. Flagged in the closing report so it can be swept with the rest. |
| 7 | `plugin:check` deferred | **Accepted** — carried into the verify hand-off as step 1, which is where it can actually run |
| 8 | Scope | **Verified** |

## Checked

- **Report against diff.** All ten changed files appear in the report's Changes
  table with a rationale, and each rationale matches what the diff does. No file
  in the diff is unaccounted for; no row in the table describes a change that
  isn't there.
- **Governing docs.** The plan declared FRD-001 and FRD-022 as *Modified* with
  authorization, and both modifications are the ones the ticket body itself asks
  for — G5's enumeration was the spec half of the gap. FRD-001 G4 and G3 are met
  rather than changed, and the smoke scenario asserts G4's "members untouched"
  directly. FRD-022 R2's annotation rule is met with the reasoning stated (archive
  is reversible, so `destructiveHint` stays on exactly two tools); R3's
  description contract is met — the new description covers all five things R3
  requires of it; R6's rail artefacts all move together in this PR. No new ADR was
  needed and none was written, correctly: every decision here applies an existing
  FRD or copies `update_item`.
- **The code.** Correct, minimal, and the ripple list in `files` was followed:
  callers (none — the optional field keeps the GUI assignable, confirmed by a
  clean `typecheck` across all four workspaces), tests (core + both smoke
  scripts), build artifacts (bundle rebuilt and committed;
  `chapters.generated.ts` correctly *not* touched, confirmed by `check:manual`
  reporting 12 chapters up to date), docs (all four).
- **Open questions.** Re-read before merging. Nothing unticked outside
  `## Parked`; the two OPERATOR judgement calls were both taken as recorded, and
  the diff matches the defaults they took. No fix in this review turns on a
  parked question.
- **Rail.** `npm test` 10/10 + 23/23 core/gui files and 41/41 script tests;
  `npm run typecheck` clean; `npm run smoke:protocol` 26/26; `smoke.mjs` against
  the built bundle **156/156**. No flakes seen — `kanmerGit.test.ts` passed first
  time, so GUI-085 did not bite.

## Verdict

**PASS.** Merging under the standing delegation, then `move_item MCP-006
verifying`. The one gate this PR could not run — `plugin:check`'s byte
comparison — is the first thing `kanmer-verify` runs on merged main, from the
main checkout.
