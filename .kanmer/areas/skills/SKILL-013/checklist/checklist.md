# Checklist — SKILL-013

## Measure first (the before half of the table)

- [x] Write the four-profile gate harness: every multi-stage move, all four
      profiles, every document present, asking the real gate engine
- [x] Run it on `origin/main` and capture the **BEFORE** table verbatim
- [x] Confirm the widened-check-7 expectation before writing it: 6 per-profile
      sites in the tree, of which `kanmer-plan:11-12` is the wrong one

## Part 1 — the gate change

- [x] `profiles.ts`: `DEFAULT_PROFILES.fix` gains `enter-review: ["post-implementation-report"]`
- [x] `board.ts`: add the `fix`-gains-`enter-review` resolve-time injection as a
      **separate** function from the `questions-resolved` one, scoped to `fix` +
      `enter-review`, no-op when the board already declares it
- [x] Order the two injections so the new boundary also inherits `questions-resolved`
- [x] `board.ts`: cite ADR-0011 (and ADR-0013) from the doc comment instead of
      being the only place the limits exist
- [x] Core tests: the new injection reaches a board whose `profiles:` predates it;
      it does not double up; it does not touch `chore`/`spike`/`custom`
- [x] Check `apps/gui/src/renderer/src/lib/profileDraft.ts` needs nothing (ADR-0011
      Consequences flags it as a known trap)
- [x] Run the harness again and capture the **AFTER** table

## Part 2 — the AGENTS block

- [x] `scripts/agents-block.mjs` `BLOCK_BODY`: **delete** the per-profile clause
- [x] Add `questions-resolved` + the literal `## Parked (explicitly deferred)`
- [x] Add: gates constrain `move_item` and nothing else (`gh pr merge` is outside)
- [x] Add: `board.yml`'s `profiles:` is not the effective requirement set (as a
      clause on the `get_doc_gates` bullet)
- [x] Add: creation is ungated
- [x] Mirror byte-identically into `plugins/kanmer/skills/kanmer-setup/SKILL.md`
- [x] Record the block's before/after byte count — it must get shorter
- [x] Regenerate the repo's own `AGENTS.md` via `node scripts/agents-block.mjs .`
- [x] `git diff AGENTS.md` shows only the intended change

## Part 3 — the third copy

- [x] `apps/gui/src/main/agentsBlock.ts` stops declaring its own `BLOCK_BODY` and
      takes the canonical one
- [x] `connect.ts` (re-read after GUI-079) writes the canonical body
- [x] The Electron main still builds with the cross-workspace import
- [x] `providers.test.ts` still passes; add one asserting the GUI body is canonical

## Part 4 — skill prose

- [x] `kanmer-closeout`: board-worktree invariant + a `.worktrees/kanmer` row in
      the 11-row edge-case table
- [x] `kanmer-verify`: board-worktree invariant on its step-2 checkout-of-main
- [x] `kanmer-execute`: board-worktree invariant + one-gated-boundary
- [x] `kanmer-auto`: board-worktree invariant (leave `:38-41` untouched)
- [x] `kanmer-review`: one-gated-boundary (leave `:59-75` untouched)
- [x] `kanmer-research`: one-gated-boundary
- [x] `kanmer-tickets`: one-gated-boundary + board-worktree
- [x] `kanmer-groom`: one-gated-boundary + board-worktree
- [x] `kanmer-plan:11-12`: replace the false `chore` claim with a `get_doc_gates`
      pointer
- [x] Confirm `kanmer-docs` and `kanmer-report` need nothing (measured, not assumed)

## Part 5 — the committed check

- [x] `scripts/verify-skill-prose.mjs`: SKILL-014's seven checks, ported
- [x] Widen check 7: drop the boundary-name precondition; widen the verb list
- [x] Encode the illustrative carve-out (one profile + `get_doc_gates` nearby = ok;
      a profiles-to-requirements list = fail)
- [x] Verify check 6's skill count by `ls` rather than assuming 12
- [x] `verify-agents-block.mjs`: substring → equality of the fenced region
- [x] `verify-agents-block.mjs`: assert the repo's own `AGENTS.md` carries the body
- [x] `verify-agents-block.mjs`: assert the GUI copy is canonical
- [x] `package.json`: `verify:skills`
- [x] `scripts/release.mjs`: add it to the rail beside `verify:agents-block`

## Part 6 — governing docs

- [x] `docs/architecture/adr/ADR-0014-fix-gains-enter-review.md` — decision,
      mechanism, the measured table, and what happens to an in-flight `fix`
- [~] `link_doc` ADR-0014 (renumbered — main already had two 0013s) — the file does not exist under the repo root until merge, so this is done at verify
- [x] ADR-0011 Consequences: the two limits, and that ADR-0013 crosses the second
      one deliberately and narrowly
- [x] `apps/gui/release-notes.md`: the gate change and the escape
- [x] FRD-023's stale "R1 is not yet true" section

## Verification

- [x] `npm test`
- [x] `npm run typecheck` — all four workspaces named in the output
- [~] `npm run plugin:check` — REFUSED from a worktree by MCP-007 (merged mid-ticket). Bundle provenance evidenced with MCP-010's two tells instead; the check itself runs on merged main at verify
- [x] `npm run verify:agents-block`
- [x] `npm run verify:skills`
- [x] `npm run smoke:protocol`
- [x] `get_doc_gates` on a real `fix` ticket on this repo's board shows
      `enter-review` — the existing-board reach, demonstrated
- [x] No in-flight `fix` ticket is stranded in a way that cannot be cleanly
      resolved (if one is: **stop and report**)
- [x] Post-implementation report written; PR opened naming SKILL-013

---

## Progress notes

**Measurement first, as planned.** The BEFORE table was captured on `origin/main`
with the harness that later became `profile-matrix.test.ts`, so both halves come
from the same instrument. Five cells changed, all in the `fix` column.

**Two items are `[~]`, not `[x]`** — done differently from how the plan wrote
them, both explained in the post-implementation report:

- `plugin:check` is **refused from any worktree** by MCP-007, which merged during
  this ticket. Its premise ("a worktree has no node_modules") is false here —
  MCP-010's recipe gives the worktree its own, verified with `realpathSync` — but
  the guard tests the path, not resolution. Bundle provenance is evidenced with
  MCP-010's two tells instead; the check runs on merged main at verify.
- `link_doc` cannot reference a file that only exists on the branch. At verify.

**Deviations worth the reviewer's time**, all in the report:

1. The AGENTS block got **longer** (+273 bytes), not shorter as the plan
   predicted. The plan is corrected in place; the pre-registered fallback was
   considered and deliberately not taken, with the reason recorded.
2. Check 7's "illustrative example" carve-out — which I designed in the plan —
   was **deleted** after measurement showed it exempted the one site known to be
   false. Line-matching also became sentence-matching. Both revisions are
   validated against the *unfixed* tree (8 violations there, 0 here) rather than
   only against the tree they were written for.
3. Check 8 is new, beyond SKILL-014's seven, and asserts the half of R1 a
   deletion check cannot see.

**Found in passing, not fixed:** `origin/main` carries two ADR-0013s. This ADR
took 0014. See `scratch/notes.md`.

**One unplanned R1 improvement:** `kanmer-tickets`' "moving to the final stage
requires proof.md" was also a per-profile claim — a `spike` owes `research`
there, not `proof` — and went with the rest.
