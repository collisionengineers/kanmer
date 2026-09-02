# Plan — SKILL-039: encode the anti-churn amendment into the skills and core

*The plan. Not the checklist — reasoning establishes bounded work; the checklist
distils it into independently observable actions.*

## Objective

One PR that makes the HZN-008 anti-churn amendment executable: the attestation
schema accepts `obsolete-after-change`, `kanmer-review` states the root-cause
class, outdated-thread and no-budget rules plus the pre-merge board-push
re-check, `kanmer-verify`/`kanmer-closeout`/`kanmer-auto` reconcile a resumed
Review/Verifying ticket before re-reading it by hand, every new sentence is
pinned by `verify-skill-prose`, and FRD-034 carries the normative text.

## Starting state

- `main` = `7e114cd1` (released v0.4.0), which is also the live stable control
  plane. Verified line numbers as recorded in `research/` — re-read each before
  editing, since an earlier edit in the same file shifts the later ones.
- `packages/core/src/review-attestation.ts:32` `DISPOSITIONS` has five values;
  `:74` requires a `reason` for `rejected-with-reason` and `accepted-risk`.
- `packages/core/src/merge-gate.ts:284` blocks only
  `(blocker|major) && disposition === "open"`; `packages/mcp-server/src/check-pr.mjs:13`
  imports the core parser and holds no second enum. Neither file changes.
- `outdated` appears nowhere in `kanmer-review` or `kanmer-auto`;
  `apply_reconciliation` appears in no skill.
- `AGENTS.md:78` rule 22 sits inside the managed block; its source is
  `scripts/agents-block-body.mjs:100` with a byte-identical hand-kept fence at
  `plugins/kanmer/skills/kanmer-setup/SKILL.md:295`.
- Evidence: `research`@`43ad9e47dd1a1dda`, `files`@`b3ecbcca5fb9d9bf`, both
  written in this same Preparing pass against `7e114cd1`; `get_ticket_doc`
  returns each version, so a later worker can tell whether this plan went stale.
  HZN-008 `context.md` "Review budget and root-cause rule (adopted 2026-09-01)"
  and untracked `goal.md` §1–§10 are the normative source text.

## Governing docs

- **FRD-034 — Durable goal control and independent review** (`refs`):
  **Modifies**, with explicit operator authorization recorded in HZN-008
  `context.md` (adopted 2026-09-01) and in the ticket body item 5. The
  amendment is appended as a new `## Amendment — …` section; no existing
  Behaviour/Acceptance text is deleted or renumbered. It makes acceptance
  criterion 5 ("Review and verification budgets stop repeated unchanged audits
  while preserving durable minor/note dispositions and residual risk")
  executable.
- **FRD-028 — Rescue and reconciliation** (`refs`): **Meets** it. The
  reconcile-first sentences name the already-shipped `reconcile_ticket` (dry
  run) and `apply_reconciliation` (explicit apply) exactly as
  `tool-reference.md:26` and `:124` document them. No tool, argument or
  behaviour changes.
- **No new ADR.** One enum value added to an existing validated set and prose
  that describes existing behaviour is a local implementation choice, not a
  cross-cutting or hard-to-reverse decision.

## Required changes

1. `DISPOSITIONS` gains `obsolete-after-change`, and the reason condition
   requires a non-empty `reason` for it. The reason names the superseding
   commit, e.g. `superseded by <sha>`.
2. `kanmer-review/SKILL.md` gains a `### Root-cause classification` subsection
   inside "Consolidated review, remediation batch, delta review", stating: the
   one-class/one-remedy rule; the outdated-thread rule; and the
   "consumes no budget" list as the deliberate property of `backwardMoveEffects`.
3. `kanmer-review/SKILL.md` "Decide and merge" gains the pre-merge board-push
   re-check and states `required_conversation_resolution` as load-bearing.
4. `kanmer-verify`, `kanmer-closeout` and `kanmer-auto` name `reconcile_ticket`
   (dry run) then `apply_reconciliation` as the first act on a resumed or
   suspicious Review/Verifying ticket.
5. The enum and reason rule are restated in `kanmer-review/SKILL.md:212–214`,
   `tool-reference.md:395–401`, and AGENTS.md rule 22 via its source module.
6. `verify-skill-prose.mjs` pins every new sentence; its test gains one
   negative fixture.
7. FRD-034 gains the amendment; `.gitignore` gains three untracked paths.
8. `npm run plugin:build` refreshes the two committed generated artifacts.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/review-attestation.ts` | disposition enum + reason condition |
| Modify | `packages/core/src/review-attestation.test.ts` | accept / unknown / missing-reason cases |
| Modify | `packages/core/src/merge-gate.test.ts` | one non-blocking row |
| Modify | `plugins/kanmer/skills/kanmer-review/SKILL.md` | root-cause subsection, enum, merge re-check |
| Modify | `plugins/kanmer/skills/kanmer-verify/SKILL.md` | reconcile-first in Workflow step 1 |
| Modify | `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | reconcile-first in §0 |
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | reconcile-first in the Review/Verifying invariants |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | finding enum + reason rule |
| Modify | `scripts/agents-block-body.mjs` | rule 22 wording (source of truth) |
| Modify | `plugins/kanmer/skills/kanmer-setup/SKILL.md` | byte-identical fenced copy of the block body |
| Modify | `AGENTS.md` | regenerated managed block; never hand-edited |
| Modify | `scripts/verify-skill-prose.mjs` | new named section pinning the new sentences |
| Modify | `scripts/verify-skill-prose.test.mjs` | one negative fixture |
| Modify | `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | appended amendment + tests A–G |
| Modify | `.gitignore` | `goal.md`, `.infisical.json`, `skills-lock.json` |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` | generated committed bundle; `plugin:build` output only |
| Modify | `plugins/kanmer/scripts/agents-block-body.mjs` | generated committed copy; `plugin:build` output only |

## Do not modify

- `packages/core/src/merge-gate.ts` — no logic change; the new test row is the proof.
- `packages/core/src/store.ts` — `backwardMoveEffects` behaviour is unchanged.
- `packages/mcp-server/src/check-pr.mjs` — it imports the core parser; adding a
  second enum copy is the defect this avoids.
- `packages/core/src/profiles.ts`, `packages/core/src/types.ts`,
  `packages/core/src/reconciliation.ts`, `packages/mcp-server/src/smoke.mjs`.
- `MASTERPLAN.md` — historical retro prose, validated by nothing.
- `scripts/verify.mjs` — the rail already runs every needed step.
- `.worktrees/**` — never touched, and never `.worktrees/kanmer`.

## Constraints

- **One enum value only.** No new attestation field (`outdated`,
  `superseded_by`), no `threads_snapshot` key, no new tool, stage, profile or
  gate. The outdated-thread rule is expressed as a disposition plus a reason.
- **`AGENTS.md` is generated.** Edit `scripts/agents-block-body.mjs`, mirror the
  fence in `kanmer-setup/SKILL.md` byte for byte, then run
  `node scripts/agents-block.mjs .`. `verify-agents-block.mjs:43` also requires
  the Conduct rule numbers to stay contiguous, so rule 22 stays numbered 22.
- **`verify-skill-prose.mjs` may read only** the skills tree, `AGENTS.md` and
  `packages/core/src/profiles.ts`. Its negative fixtures copy exactly those, so
  a check that read an FRD or a core source would throw in every existing test.
  The FRD amendment is therefore deliberately unpinned by that script.
- **Prose is hard-wrapped** at ~78 columns, so every pin regex must tolerate the
  wrap with `\s+` / `\s*` at each line break.
- **Generated artifacts are committed.** Core compiles into
  `plugins/kanmer/mcp/kanmer-mcp.cjs`, so `plugin:build` runs before
  `plugin:check` and therefore before `npm run verify`.
- `check-plugin-sync.mjs` refuses unless the checkout owns its `@kanmer/core`
  resolution: run `npm install` in the implementation worktree first, or run the
  plugin steps from the main checkout.
- Serial skills lane: no other PR may be open against `plugins/kanmer/skills/**`
  or `scripts/verify-skill-prose*.mjs` while this one is in flight.

## Ordered steps

### Step 1 — Add the `obsolete-after-change` disposition to the core parser
- Preconditions: on the ticket's branch at `7e114cd1`; `npm run build:core` works.
- Files: `packages/core/src/review-attestation.ts`
- Symbols: `DISPOSITIONS`, `parseReviewAttestation`
- Change: add `"obsolete-after-change"` as the last member of the `DISPOSITIONS`
  set (`:32`). In the reason condition (`:74`) extend the test to
  `(f.disposition === "rejected-with-reason" || f.disposition === "accepted-risk" || f.disposition === "obsolete-after-change")`,
  leaving the existing `findings[${index}].reason is required for ${f.disposition}`
  message unchanged so the error names the new value automatically. Add a
  one-line comment stating the reason names the superseding commit
  (`superseded by <sha>`).
- Preserved behaviour: `open`, `fixed`, `rejected-with-reason`, `accepted-risk`
  and `deferred-to-ticket` all keep their current validity and messages; the
  `deferred-to-ticket` → `ticket` rule and every optional CORE-123 field check
  are untouched; an unknown disposition still returns
  `findings[N].disposition is invalid`.
- Forbidden: a new frontmatter field; a second enum copy anywhere; relaxing the
  reason requirement for any existing value.
- Negative cases: `disposition: obsolete-after-change` with no `reason` must be
  `invalid`; `disposition: superseded` must still be `invalid`.
- Tests: `packages/core/src/review-attestation.test.ts` (Step 2).
- Commands: `npm run build:core`
- Expected output: build exits 0.
- Done when: the new value is in the set and in the reason condition, and core builds.
- Deviation stop: if `check-pr.mjs` turns out to hold its own disposition list
  after all, stop and report — that is a second source of truth and changes scope.

### Step 2 — Prove the parser accepts it, rejects an unknown value, and requires a reason
- Preconditions: Step 1 done.
- Files: `packages/core/src/review-attestation.test.ts`
- Symbols: `parseReviewAttestation`
- Change: add one `describe("parseReviewAttestation obsolete-after-change (SKILL-039)")`
  with three `it` blocks reusing the existing fixture style in this file:
  (a) a finding `severity: minor, disposition: obsolete-after-change,
  reason: "superseded by <40-hex>"` parses `state: "valid"`; (b) the same
  finding with `disposition: superseded` is `state: "invalid"` with a reason
  matching `/disposition is invalid/`; (c) the same finding with the `reason`
  key removed is `state: "invalid"` with a reason matching
  `/reason is required for obsolete-after-change/`.
- Preserved behaviour: the existing three `it` blocks pass unchanged.
- Forbidden: weakening any existing assertion; asserting on a full object dump
  where the current tests assert named fields.
- Negative cases: (b) and (c) above.
- Tests: this file.
- Commands: `npm run test -w @kanmer/core -- review-attestation`
- Expected output: all cases pass, including the three pre-existing ones.
- Done when: three new cases pass.
- Deviation stop: if the file's fixture helper cannot express a finding without
  a `reason`, report rather than rewriting the helper's contract.

### Step 3 — Prove the merge gate does not block on the new disposition
- Preconditions: Step 1 done.
- Files: `packages/core/src/merge-gate.test.ts`
- Symbols: the local `finding` helper (`:677`), the `eligible` array (`:720`)
- Change: add exactly one row to `eligible`:
  `finding("blocker", "obsolete-after-change", { reason: "superseded by <sha>" })`.
  The surrounding loop already asserts `result.ok === true` and
  `result.findings` empty for both `strict` values, which is the proof that
  `merge-gate.ts` needs no change.
- Preserved behaviour: the `blocker`/`major` + `open` rows above still fail with
  `STALE_REVIEW`; every existing eligible row still passes.
- Forbidden: editing `packages/core/src/merge-gate.ts`; adding a disposition
  allow-list to the gate.
- Negative cases: covered by the untouched `["blocker","major"] × open` loop.
- Tests: this file.
- Commands: `npm run test -w @kanmer/core -- merge-gate`
- Expected output: the suite passes with the new row named in the output.
- Done when: the new row passes in both `strict` modes.
- Deviation stop: if the row fails, `merge-gate.ts` reads dispositions somewhere
  other than `openBlockingReviewFindings` — stop and report; that is a scope change.

### Step 4 — Add `### Root-cause classification` to `kanmer-review`
- Preconditions: Steps 1–3 done. Re-read the file: `### Batch PRs` is at `:144`
  and the blocking-rules paragraph ends at `:142`.
- Files: `plugins/kanmer/skills/kanmer-review/SKILL.md`
- Change: insert a new `### Root-cause classification` subsection between the
  "Only these block a merge" paragraph and `### Batch PRs`, hard-wrapped at 78
  columns, stating exactly these three things:
  1. Two or more findings arising from one underlying mechanism are **one
     root-cause class**; record the class once and choose exactly one remedy —
     replace the implementation approach, revise the plan, narrow the approved
     contract with a stated threat model, or defer the whole class to one
     follow-up ticket. Never one patch, and never one ticket, per example
     (name the concrete classes: repeated grammar variants against a
     hand-written parser, repeated path-normalization aliases, repeated missing
     registrations from duplicated composition rules).
  2. A GitHub thread GitHub marks **outdated** — a thread on a line the fix
     changed — is dispositioned `obsolete-after-change` with a reason naming the
     superseding commit, `superseded by <sha>`. It is never a current open
     finding; the thread and its history are preserved, and a reviewer that
     reasserts the same defect against the current head raises it as a new
     finding with current evidence.
  3. **What consumes no remediation budget:** re-auditing an unchanged head, a
     restated finding, an outdated thread, an automated bot thread (cross-refer
     "Expected reviewers and the settle rule" rather than restating it), a
     disposition edit, PR metadata that changes no code, and a new minor or
     note finding — stated as the deliberate property of `backwardMoveEffects`
     in `store.ts`, because `review_round` advances only when a `move_item`
     actually returns the ticket to Implementing. Three audits of one head and
     one finding are one observed condition, not three remediation failures.
- Preserved behaviour: `### Batch PRs` and everything after it is byte-identical
  apart from its line offset; the budget paragraph at `:120–137` is unchanged.
- Forbidden: restating the Codex/bot rule from `:75–85`; introducing a fourth
  remedy; implying the budget can be extended without an operator.
- Negative cases: pinned in Step 8.
- Tests: `scripts/verify-skill-prose.mjs` (Step 8).
- Commands: `node scripts/verify-skill-prose.mjs`
- Expected output: `ALL CHECKS PASSED` (the new pins land in Step 8; until then
  the existing checks must stay green).
- Done when: the subsection exists in that position and every existing prose
  check is still green.
- Deviation stop: if the insertion would require deleting or reordering an
  existing sentence, stop — an existing pin protects it.

### Step 5 — Update the disposition enum and reason rule in `kanmer-review`
- Preconditions: Step 4 done; re-read the enum line (was `:212`).
- Files: `plugins/kanmer/skills/kanmer-review/SKILL.md`
- Change: extend the enum to
  `open | fixed | rejected-with-reason | accepted-risk | deferred-to-ticket | obsolete-after-change`
  and extend the following sentence so `rejected-with-reason`, `accepted-risk`
  **and** `obsolete-after-change` require a reason, adding that for
  `obsolete-after-change` the reason names the superseding commit
  (`superseded by <sha>`). Leave the `deferred-to-ticket` sentence intact.
- Preserved behaviour: the frontmatter example block, `board_sha`,
  `expected_reviewers` and `threads_snapshot` paragraphs are unchanged; no
  `threads_snapshot` key is added.
- Forbidden: adding an `outdated:` key to the `threads_snapshot` example.
- Negative cases: pinned in Step 8.
- Tests: Step 8's pins.
- Commands: `node scripts/verify-skill-prose.mjs`
- Expected output: existing checks green.
- Done when: the enum matches `review-attestation.ts` exactly, in order.
- Deviation stop: an enum order mismatch with core — align to core and report.

### Step 6 — Add the pre-merge board-push re-check and the conversation-resolution statement
- Preconditions: Steps 4–5 done; re-read `## Decide and merge` (was `:272`) and
  the `gh pr merge` fence (was `:289`).
- Files: `plugins/kanmer/skills/kanmer-review/SKILL.md`
- Change: in the paragraph immediately before the `gh pr merge` fence, add that
  immediately before `gh pr merge` the reviewer re-checks
  `git -C <absolute-path-to-board-worktree> rev-parse <board-branch>` against
  `git -C <absolute-repository-root> rev-parse origin/<board-branch>`, with
  `<board-branch>` read from `get_status.boardWorktree.expectedBranch` and never
  hardcoded — mirroring `kanmer-auto`'s "Push the board before trusting a gate"
  (`kanmer-auto/SKILL.md:630–631`), because the gate reads the remote board tip
  and does not re-run on a board push. Then state that thread resolution is
  enforced by GitHub branch protection (`required_conversation_resolution`) and
  is **load-bearing**: a PR whose findings are dispositioned but whose threads
  are unresolved sits at a blocked merge state however green its checks, and
  `enforce_admins` leaves no bypass.
- Preserved behaviour: the `pass` requirements list, the `gh pr merge` command
  text, the batch-merge scan, and the "merged SHA belongs to `kanmer-verify`"
  rule are unchanged.
- Forbidden: hardcoding `kanmer-board` or `main`; adding a required-approvals claim.
- Negative cases: pinned in Step 8.
- Tests: Step 8's pins.
- Commands: `node scripts/verify-skill-prose.mjs`
- Expected output: existing checks green.
- Done when: both statements appear before the merge fence.
- Deviation stop: if `get_status` no longer exposes `boardWorktree.expectedBranch`, stop.

### Step 7 — Name reconcile-first in `kanmer-verify`, `kanmer-closeout` and `kanmer-auto`
- Preconditions: Step 6 done.
- Files: `plugins/kanmer/skills/kanmer-verify/SKILL.md`,
  `plugins/kanmer/skills/kanmer-closeout/SKILL.md`,
  `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- Change: add one sentence family with an identical pinnable core to each —
  "on any resumed or suspicious Review/Verifying ticket, call `reconcile_ticket
  id: <ID>` as a dry run first and apply its recommendation with
  `apply_reconciliation id: <ID>, expected_revision: <the recommendation's
  revision>` before re-reading anything by hand". Placement:
  `kanmer-verify` Workflow step 1 (was `:16–17`), so it precedes the GitHub
  query; `kanmer-closeout` `## 0. Gate: is the PR actually merged?` (was
  `:20–27`), before the `gh pr view` verdict sentences; `kanmer-auto`
  `### Active Review and Verifying invariants` (was `:712`) in the
  "Anything else is an unexplained state" paragraph (was `:724–732`), as the
  controller's first act.
- Symbols: none (prose). Use the exact tool argument names from
  `tool-reference.md:26` and `:124`.
- Preserved behaviour: every existing numbered workflow step keeps its number and
  meaning; `reconcile_ticket`'s packet-aware usage in `kanmer-auto:470`/`:508`
  and `kanmer-execute:144` is untouched; no `force` and no worktree deletion is
  implied.
- Forbidden: implying `reconcile_ticket` mutates anything; implying
  `apply_reconciliation` takes an action argument; renumbering a workflow step;
  touching `kanmer-execute/SKILL.md`.
- Negative cases: pinned in Step 8.
- Tests: Step 8's pins.
- Commands: `node scripts/verify-skill-prose.mjs`
- Expected output: existing checks green.
- Done when: all three files carry the sentence in the stated position.
- Deviation stop: if a numbered step would have to be renumbered, stop — check 6
  and several `kanmer-auto` pins depend on the current structure.

### Step 8 — Pin every new sentence in `verify-skill-prose`, with one negative fixture
- Preconditions: Steps 4–7 done.
- Files: `scripts/verify-skill-prose.mjs`, `scripts/verify-skill-prose.test.mjs`
- Symbols: `check`, `hits`; the existing `edit` fixture helper in the test
- Change: append one **unnumbered named** section
  `=== review budget, root-cause classes and reconcile-first recovery (SKILL-039) ===`
  before the final `forbiddenGoalClaims` loop — unnumbered, matching every
  section added after check 20. Six named `check(...)` calls, each a
  wrap-tolerant regex family:
  1. `kanmer-review records one root-cause class with exactly one remedy`
  2. `kanmer-review dispositions an outdated thread obsolete-after-change with the superseding commit`
  3. `kanmer-review names what consumes no remediation budget as a backwardMoveEffects property`
  4. `the obsolete-after-change disposition and its reason rule are stated wherever findings are` —
     asserted against **both** `kanmer-review/SKILL.md` and
     `kanmer-tickets/references/tool-reference.md`
  5. `kanmer-review re-checks the pushed board branch immediately before merge and states conversation resolution is load-bearing`
  6. `verify, closeout and auto reconcile a resumed Review or Verifying ticket before re-reading it` —
     asserted against all three skill bodies with `.every(...)`
  Then add one test to `verify-skill-prose.test.mjs` following the existing
  fixture pattern: `mkdtempSync`, `cpSync` the skills tree and
  `packages/core/src/profiles.ts`, write a clean `AGENTS.md`, `edit()` the
  `obsolete-after-change` sentence in `kanmer-review/SKILL.md` to
  `accepted-risk`, `spawnSync` the script against the fixture, and assert
  `status !== 0` plus the check-2 name appearing as FAIL.
- Preserved behaviour: every existing check and test passes unchanged; the
  script's exit contract and `check`/`hits` signatures are untouched.
- Forbidden: reading `docs/**` or `packages/core/src/*` other than
  `profiles.ts` — every existing fixture would throw; renumbering existing
  sections; an over-broad regex that would flag correct English elsewhere in the tree.
- Negative cases: the one new fixture; run it before and after Step 4–7's edits
  are in place to confirm it actually fails on the mutation.
- Tests: `scripts/verify-skill-prose.test.mjs`
- Commands: `node scripts/verify-skill-prose.mjs` then `npm run test:scripts`
- Expected output: `ALL CHECKS PASSED` with the six new names listed; the new
  negative test passes.
- Done when: deleting any one new sentence turns exactly one named check red.
- Deviation stop: if a pin also matches unrelated prose in another skill,
  narrow the regex; do not delete the pin.

### Step 9 — Change AGENTS.md rule 22 at its source and regenerate
- Preconditions: Steps 1–8 done.
- Files: `scripts/agents-block-body.mjs`,
  `plugins/kanmer/skills/kanmer-setup/SKILL.md`, `AGENTS.md`
- Symbols: `BLOCK_BODY`
- Change: rewrite rule 22 in `scripts/agents-block-body.mjs:100` so it (a) lists
  the dispositions including "mark obsolete after change, naming the superseding
  commit", (b) states that findings from one root cause are one class with one
  remedy, and (c) states that a convention change lands in the same PR as the
  work that needs it. Keep it a single numbered `22. **…**` line so the
  contiguity assertion holds. Paste the identical text into the fenced block at
  `plugins/kanmer/skills/kanmer-setup/SKILL.md:295` — byte for byte, because
  `verify-agents-block.mjs:160–179` compares the fenced region to `BLOCK_BODY`
  with `===`. Then regenerate: `node scripts/agents-block.mjs .`
- Preserved behaviour: rules 1–21 and 23+ unchanged; the `Scope`/`Build`/`Prove`/
  `Conduct` group headings and contiguous numbering preserved; every byte of
  `AGENTS.md` outside the markers untouched.
- Forbidden: hand-editing `AGENTS.md:78`; changing the rule's number; editing
  `plugins/kanmer/scripts/agents-block-body.mjs` (generated in Step 11).
- Negative cases: `node scripts/verify-agents-block.mjs` must fail if the fence
  and the module diverge — confirm by observing it pass only after both edits.
- Tests: `scripts/verify-agents-block.mjs`
- Commands: `node scripts/agents-block.mjs .` then `node scripts/verify-agents-block.mjs`
- Expected output: the regenerate step reports `AGENTS.md refreshed`; the verify
  step reports all checks passing, including the fenced-block equality.
- Done when: `git diff AGENTS.md` shows only rule 22 changed.
- Deviation stop: if `applyManagedBlock` throws about malformed markers, stop and
  do not repair by hand.

### Step 10 — Append the FRD-034 amendment and extend `.gitignore`
- Preconditions: Steps 1–9 done.
- Files: `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md`,
  `.gitignore`
- Change: append `## Amendment — review budget and root-cause classes (2026-09-01)`
  after `## Edge cases`, carrying `goal.md` §1–§10 as ten `###` subsections in
  the same order and wording (remediation-attempt counting; finding severity;
  what blocks; outdated threads; consolidated review; root-cause
  classification; budget exhaustion; the follow-up rule; the terminal review
  decision; and acceptance tests A–G), noting that A–G become golden-board
  scenarios owned by CORE-119. Follow the `FRD-011:45 ## Amendment (GUI-070)`
  precedent; delete and renumber nothing above. Then add `goal.md`,
  `.infisical.json` and `skills-lock.json` to `.gitignore` with a one-line
  comment explaining that these are machine-local operator inputs and that
  `scripts/release.mjs` counts untracked files as a dirty tree.
- Symbols: none.
- Preserved behaviour: FRD-034's frontmatter (`status: draft`), title,
  `## Behaviour`, `## Acceptance criteria` numbering 1–5 and `## Edge cases` are
  unchanged. Existing `.gitignore` entries and comments are unchanged.
- Forbidden: renumbering acceptance criteria; creating a new FRD or ADR;
  adding a `.gitignore` pattern broad enough to hide a real repo file (no
  bare `*.json`, no `skills*`).
- Negative cases: `git status --porcelain` must no longer list the three files;
  `git ls-files --error-unmatch` must still resolve every previously tracked file.
- Tests: `npm run verify:docs` (which must remain green — it imposes no FRD
  heading rules, so this is a regression guard, not a new pin).
- Commands: `npm run verify:docs` then `git status --porcelain`
- Expected output: `verify-docs: PASS …`; the three paths absent from status.
- Deviation stop: if `verify:docs` fails, the failure is in the doc-structure
  mirror or the manual, not the FRD — report it rather than editing the FRD further.

### Step 11 — Regenerate the committed artifacts and run the full rail
- Preconditions: Steps 1–10 done, from a checkout that owns its `@kanmer/core`
  resolution (`npm install` in the worktree, or run these from the main checkout).
- Files: `plugins/kanmer/mcp/kanmer-mcp.cjs`,
  `plugins/kanmer/scripts/agents-block-body.mjs`
- Symbols: none (build output).
- Change: none by hand — `npm run plugin:build` regenerates both, then commit
  their new bytes.
- Preserved behaviour: no source file changes in this step.
- Forbidden: hand-editing either artifact; skipping the rebuild because "only
  core changed" (core compiles into the bundle).
- Negative cases: `npm run plugin:check` must fail on a stale bundle — that is
  its purpose; do not work around a failure by touching the artifact.
- Tests: the whole rail.
- Commands: see `## Commands`.
- Expected output: `plugin:check` reports the generated artifacts in sync;
  `npm run verify` completes every step; both `KANMER_SERVER` smokes exit 0.
- Done when: the rail is green and `git status` is clean apart from the intended diff.
- Deviation stop: a `plugin:check` refusal about `@kanmer/core` resolution means
  run `npm install` in this checkout, not a workaround.

## Acceptance checks

- **Production caller / composition:** `parseReviewAttestation` is the single
  consumer path — `packages/mcp-server/src/check-pr.mjs:13` (the `kanmer-gate`
  CI check) and the store's Review → Implementing rule both call it, so the new
  value is live in both without further wiring. No registration is added.
- No runtime dependency is added, so no packaged-artifact proof is needed beyond
  regenerating the committed bundle (Step 11) and `plugin:check`'s sha256s.
- No schema migration, grants or persistent data change: the attestation is a
  Markdown document with frontmatter, and an added enum value is
  forward-compatible (older documents remain valid; an older core would reject
  a document using the new value, which is why v0.4.1 carries this change).
- Ticket verification item 1 → Step 2 (`parseReviewAttestation` accepts the
  value, rejects an unknown one, and requires the reason).
- Ticket verification item 2 → Step 11 (`npm run verify`, which runs
  `verify:skills`).
- Ticket verification item 3 (a reviewer dispositions an outdated thread without
  a remediation round) → **satisfied by this PR's own review**: Codex reliably
  posts ~10 bot threads per push and remediation makes several of them outdated,
  so this PR's independent reviewer applies the new rule to its own outdated
  threads and records `obsolete-after-change` with `superseded by <sha>` in
  `scratch/review.md`. No separate fixture PR is created; the attestation and the
  resolved threads are the evidence. Record that mapping in the
  post-implementation report.
- FRD-034 amendment tests A–G are written down here and implemented by CORE-119;
  SKILL-039 does not claim them as passing.
- Tests prove the claims without weakened assertions: three new parser cases,
  one new merge-gate row, six new prose pins and one negative fixture. Retain
  exact commands and exit codes.

## Commands

Run from the repository root of the implementation checkout. `plugin:build`
must precede `npm run verify`, because `verify` ends in `plugin:check`.

```sh
npm run build:core
npm run test -w @kanmer/core
node scripts/agents-block.mjs .
node scripts/verify-agents-block.mjs
node scripts/verify-skill-prose.mjs
npm run test:scripts
npm run verify:docs
npm run plugin:build
npm run plugin:check
npm run verify
```

Then the two bundle smokes, which are required because the committed MCP bundle
changed (AGENTS.md §10 step 6). Bash:

```sh
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke-protocol.mjs
```

PowerShell has no inline env prefix — use:

```powershell
$env:KANMER_SERVER = "plugins/kanmer/mcp/kanmer-mcp.cjs"
node packages/mcp-server/src/smoke.mjs
node packages/mcp-server/src/smoke-protocol.mjs
Remove-Item Env:KANMER_SERVER
```

Environment notes: run every command from the ticket's own worktree after
`npm install` there, or run the `plugin:*` steps from the main checkout —
`check-plugin-sync.mjs` refuses a checkout that does not own its `@kanmer/core`
resolution. Never run any of these in `.worktrees/kanmer`.

## Failure and deviation rules

- Stop and report on: a `plugin:check` refusal about `@kanmer/core` resolution
  (run `npm install` in this checkout, do not work around it); a
  `verify-agents-block` fenced-block mismatch (fix the fence, never `AGENTS.md`);
  a prose pin that also matches unrelated correct English (narrow the regex, do
  not delete the pin); any need to edit `merge-gate.ts`, `store.ts`,
  `check-pr.mjs` or `scripts/verify.mjs`.
- The known Windows flakes (`store.test.ts` / `claims.test.ts` / `docs.test.ts`
  5s timeouts and teardown `ENOTEMPTY`; the `antigravity-plugin-config.test.mjs`
  `EBUSY` pair) reach hosted CI too. Discharge one with evidence, not assertion:
  re-run the same job at the same SHA with no code change, confirm the failing
  test is untouched by the diff, and give a mechanism argument for why this diff
  cannot reach it. Retain every attempt.
- Scope expansion — a new field, tool, stage, gate, `MASTERPLAN.md` edit, or a
  golden-board implementation of tests A–G — is a stop, not a judgement call.
- A deviation is reported, never a silent redesign.

## Stop condition

Stop when the rail above is green, both `KANMER_SERVER` smokes exit 0, the
regenerated artifacts are committed, and the PR is open with a
`Kanmer: SKILL-039` footer and the post-implementation report written. Do not
review, do not merge, and do not start CORE-133 or CORE-119 — this skill phase
ends at Review.
