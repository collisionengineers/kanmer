# Checklist — SKILL-013

## Measure first (the before half of the table)

- [ ] Write the four-profile gate harness: every multi-stage move, all four
      profiles, every document present, asking the real gate engine
- [ ] Run it on `origin/main` and capture the **BEFORE** table verbatim
- [ ] Confirm the widened-check-7 expectation before writing it: 6 per-profile
      sites in the tree, of which `kanmer-plan:11-12` is the wrong one

## Part 1 — the gate change

- [ ] `profiles.ts`: `DEFAULT_PROFILES.fix` gains `enter-review: ["post-implementation-report"]`
- [ ] `board.ts`: add the `fix`-gains-`enter-review` resolve-time injection as a
      **separate** function from the `questions-resolved` one, scoped to `fix` +
      `enter-review`, no-op when the board already declares it
- [ ] Order the two injections so the new boundary also inherits `questions-resolved`
- [ ] `board.ts`: cite ADR-0011 (and ADR-0013) from the doc comment instead of
      being the only place the limits exist
- [ ] Core tests: the new injection reaches a board whose `profiles:` predates it;
      it does not double up; it does not touch `chore`/`spike`/`custom`
- [ ] Check `apps/gui/src/renderer/src/lib/profileDraft.ts` needs nothing (ADR-0011
      Consequences flags it as a known trap)
- [ ] Run the harness again and capture the **AFTER** table

## Part 2 — the AGENTS block

- [ ] `scripts/agents-block.mjs` `BLOCK_BODY`: **delete** the per-profile clause
- [ ] Add `questions-resolved` + the literal `## Parked (explicitly deferred)`
- [ ] Add: gates constrain `move_item` and nothing else (`gh pr merge` is outside)
- [ ] Add: `board.yml`'s `profiles:` is not the effective requirement set (as a
      clause on the `get_doc_gates` bullet)
- [ ] Add: creation is ungated
- [ ] Mirror byte-identically into `plugins/kanmer/skills/kanmer-setup/SKILL.md`
- [ ] Record the block's before/after byte count — it must get shorter
- [ ] Regenerate the repo's own `AGENTS.md` via `node scripts/agents-block.mjs .`
- [ ] `git diff AGENTS.md` shows only the intended change

## Part 3 — the third copy

- [ ] `apps/gui/src/main/agentsBlock.ts` stops declaring its own `BLOCK_BODY` and
      takes the canonical one
- [ ] `connect.ts` (re-read after GUI-079) writes the canonical body
- [ ] The Electron main still builds with the cross-workspace import
- [ ] `providers.test.ts` still passes; add one asserting the GUI body is canonical

## Part 4 — skill prose

- [ ] `kanmer-closeout`: board-worktree invariant + a `.worktrees/kanmer` row in
      the 11-row edge-case table
- [ ] `kanmer-verify`: board-worktree invariant on its step-2 checkout-of-main
- [ ] `kanmer-execute`: board-worktree invariant + one-gated-boundary
- [ ] `kanmer-auto`: board-worktree invariant (leave `:38-41` untouched)
- [ ] `kanmer-review`: one-gated-boundary (leave `:59-75` untouched)
- [ ] `kanmer-research`: one-gated-boundary
- [ ] `kanmer-tickets`: one-gated-boundary + board-worktree
- [ ] `kanmer-groom`: one-gated-boundary + board-worktree
- [ ] `kanmer-plan:11-12`: replace the false `chore` claim with a `get_doc_gates`
      pointer
- [ ] Confirm `kanmer-docs` and `kanmer-report` need nothing (measured, not assumed)

## Part 5 — the committed check

- [ ] `scripts/verify-skill-prose.mjs`: SKILL-014's seven checks, ported
- [ ] Widen check 7: drop the boundary-name precondition; widen the verb list
- [ ] Encode the illustrative carve-out (one profile + `get_doc_gates` nearby = ok;
      a profiles-to-requirements list = fail)
- [ ] Verify check 6's skill count by `ls` rather than assuming 12
- [ ] `verify-agents-block.mjs`: substring → equality of the fenced region
- [ ] `verify-agents-block.mjs`: assert the repo's own `AGENTS.md` carries the body
- [ ] `verify-agents-block.mjs`: assert the GUI copy is canonical
- [ ] `package.json`: `verify:skills`
- [ ] `scripts/release.mjs`: add it to the rail beside `verify:agents-block`

## Part 6 — governing docs

- [ ] `docs/architecture/adr/ADR-0013-fix-gains-enter-review.md` — decision,
      mechanism, the measured table, and what happens to an in-flight `fix`
- [ ] `link_doc` ADR-0013 onto the ticket
- [ ] ADR-0011 Consequences: the two limits, and that ADR-0013 crosses the second
      one deliberately and narrowly
- [ ] `apps/gui/release-notes.md`: the gate change and the escape
- [ ] FRD-023's stale "R1 is not yet true" section

## Verification

- [ ] `npm test`
- [ ] `npm run typecheck` — all four workspaces named in the output
- [ ] `npm run plugin:check` (at the main checkout, not the worktree)
- [ ] `npm run verify:agents-block`
- [ ] `npm run verify:skills`
- [ ] `npm run smoke:protocol`
- [ ] `get_doc_gates` on a real `fix` ticket on this repo's board shows
      `enter-review` — the existing-board reach, demonstrated
- [ ] No in-flight `fix` ticket is stranded in a way that cannot be cleanly
      resolved (if one is: **stop and report**)
- [ ] Post-implementation report written; PR opened naming SKILL-013
