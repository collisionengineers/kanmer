# Checklist — SKILL-039

*One independently tickable box per ordered plan step, then the pre-review
verification the post-implementation report will summarise. Append progress
notes rather than rewriting.*

- [x] Step 1 — Add `"obsolete-after-change"` to `DISPOSITIONS` (`review-attestation.ts:32`) and to the non-empty-`reason` condition (`:74`); `npm run build:core` exits 0.
- [x] Step 2 — Three new `review-attestation.test.ts` cases pass: the value is accepted with a `superseded by <sha>` reason; `superseded` is rejected as an invalid disposition; the value without a `reason` is rejected.
- [x] Step 3 — One `finding("blocker", "obsolete-after-change", { reason: "superseded by <sha>" })` row added to `merge-gate.test.ts`'s `eligible` array passes in both `strict` modes, with `merge-gate.ts` unchanged.
- [x] Step 4 — `### Root-cause classification` inserted in `kanmer-review/SKILL.md` between the "Only these block a merge" paragraph and `### Batch PRs`, stating one class/one remedy, the outdated-thread rule, and the no-budget list as a `backwardMoveEffects` property.
- [x] Step 5 — `kanmer-review/SKILL.md` disposition enum and reason rule extended to `obsolete-after-change`, with no new `threads_snapshot` key.
- [x] Step 6 — `## Decide and merge` re-checks the pushed board branch (`get_status.boardWorktree.expectedBranch`, never hardcoded) immediately before `gh pr merge`, and states `required_conversation_resolution` is load-bearing.
- [x] Step 7 — `kanmer-verify` Workflow step 1, `kanmer-closeout` §0 and `kanmer-auto`'s Review/Verifying invariants each name `reconcile_ticket` dry-run then `apply_reconciliation id: <ID>, expected_revision: <revision>` as the first act, with no step renumbered.
- [x] Step 8 — Six named pins added as one unnumbered section in `verify-skill-prose.mjs`; one negative fixture added to `verify-skill-prose.test.mjs`; deleting any one new sentence turns exactly one named check red.
- [x] Step 9 — Rule 22 rewritten in `scripts/agents-block-body.mjs`, mirrored byte-for-byte into `kanmer-setup/SKILL.md`, `AGENTS.md` regenerated with `node scripts/agents-block.mjs .`; `node scripts/verify-agents-block.mjs` green and `git diff AGENTS.md` shows only rule 22.
- [x] Step 10 — `## Amendment — review budget and root-cause classes (2026-09-01)` appended to FRD-034 with §1–§10 and tests A–G (attributed to CORE-119); `goal.md`, `.infisical.json`, `skills-lock.json` added to `.gitignore` and absent from `git status --porcelain`.
- [x] Step 11 — `npm run plugin:build` run and the new `plugins/kanmer/mcp/kanmer-mcp.cjs` and `plugins/kanmer/scripts/agents-block-body.mjs` bytes committed; `npm run plugin:check` green.
- [x] [pre-review] `npm run verify` green end to end (it runs `verify:docs`, `verify:skills`, `verify:agents-block`, `plugin:check` and four smokes); every Windows-flake attempt retained with its re-run evidence.
- [x] [pre-review] Both bundle smokes exit 0 with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`: `packages/mcp-server/src/smoke.mjs` and `packages/mcp-server/src/smoke-protocol.mjs`.
- [x] [pre-review] Production caller named: `parseReviewAttestation` is consumed by `packages/mcp-server/src/check-pr.mjs:13` (the `kanmer-gate` check) and by the store's Review → Implementing rule — no new registration, and `check-pr.mjs` is unchanged.
- [x] [pre-review] No new field, tool, stage, profile or gate was added, and `merge-gate.ts`, `store.ts`, `check-pr.mjs` and `scripts/verify.mjs` are untouched.
- [ ] [pre-review] PR opened with a `Kanmer: SKILL-039` footer and the post-implementation report written, recording exact commands and exit codes.
- [ ] [pre-review] Stop at the approved boundary — do not review, do not merge, do not start CORE-133 or CORE-119.
- [ ] [post-merge] This PR's independent reviewer dispositioned at least one genuinely outdated Codex thread as `obsolete-after-change` with `superseded by <sha>`, resolved it, and took **no** extra remediation round for it — recorded in `scratch/review.md`. This satisfies the ticket's "fixture PR with an outdated thread" verification; no separate fixture PR is created.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.

- 2026-09-02 — Steps 1–11 complete on `SKILL-039-anti-churn-amendment` at
  `.worktrees/skill-039` (base `7e114cd1`). Exit codes so far: `build:core` 0,
  `vitest review-attestation` 0 (6 tests), `vitest merge-gate` 0 (37 tests),
  `verify-skill-prose.mjs` 0 (156 checks, six new named pins),
  `verify-skill-prose.test.mjs --test-name-pattern=anti-churn` 0 (each of six
  mutations reddens exactly one named check), `agents-block.mjs .` 0,
  `verify-agents-block.mjs` 0 (31/31), `verify:docs` 0, `plugin:build` 0,
  `plugin:check` 0, `smoke.mjs` 0 (381/381), `smoke-protocol.mjs` 0 (50/50).
  Exactly the 17 planned files are modified; `package-lock.json` is unchanged.
  `npm run verify` is the remaining pre-review item.

- 2026-09-02 resume — exact recorded worktree validated; branch rebased cleanly
  from `51f56d7a` onto `origin/main` `7a206202`, producing `444f9605`.
  `npm run plugin:build` exited 0 and changed no tracked bytes. The first
  rebased `npm run verify` attempt was interrupted after core passed while the
  long GUI suite was still running; the identical retry at unchanged SHA
  `444f9605` exited 0 (core 829/829, GUI 538/538, MCP/HTTP 236 pass + one
  Windows platform skip, scripts 168/168, smoke 383/383, protocol 54/54,
  agents block 31/31, plugin sync green). Separate plugin-bundle `smoke.mjs`
  and `smoke-protocol.mjs` runs both exited 0. Worktree remained clean and the
  diff stayed at exactly the 17 planned paths.
