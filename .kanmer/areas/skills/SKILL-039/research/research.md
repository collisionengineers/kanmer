# Research — SKILL-039: encoding the anti-churn amendment in skills and core

*All line numbers verified at `main` = `7e114cd1` (release v0.4.0). Read them
again before editing: any earlier edit in the same file shifts them.*

## Question

Where does the HZN-008 "Review budget and root-cause rule (adopted 2026-09-01)"
amendment — currently living only in the group context and in the untracked
`goal.md` §1–§10 — have to be written so it is executable: which core enum,
which skill sentences, which pinning check, and which governing document?

## Findings

### Core — the disposition enum

- `packages/core/src/review-attestation.ts:32` is the single source of truth:
  `const DISPOSITIONS = new Set(["open", "fixed", "rejected-with-reason", "accepted-risk", "deferred-to-ticket"]);`
  It has no `obsolete-after-change`.
- `:73` rejects an unknown disposition (`findings[${index}].disposition is invalid`).
- `:74–76` is the reason check: `rejected-with-reason` and `accepted-risk`
  require a non-empty `reason`. `obsolete-after-change` must join that
  condition (operator decision 2026-09-02: the reason names the superseding
  SHA, e.g. `superseded by <sha>`).
- `:77–79` is the `deferred-to-ticket` → `ticket` check; unchanged.
- **`packages/mcp-server/src/check-pr.mjs` holds no second copy.** It imports
  `parseReviewAttestation` from `@kanmer/core` (`:13`) and only reshapes the
  result into merge-gate review evidence (`parseReviewEvidence`, `:83–96`). The
  comment at `:79–82` states that intent. The CI gate therefore follows the core
  change with no edit — the architect's scope is correct here.
- `packages/core/src/merge-gate.ts:284` is the only place a disposition is read
  for blocking: `openBlockingReviewFindings` returns a finding only when
  `(severity === "blocker" || severity === "major") && disposition === "open"`.
  A new non-`open` value therefore cannot block, and **no logic change is
  needed** — confirmed. What is missing is the proof.
- `packages/core/src/merge-gate.test.ts:677` defines
  `finding(severity, disposition, extra)`; `:720–727` is the `eligible` array
  of non-blocking rows, already covering `fixed`, `rejected-with-reason`,
  `accepted-risk` and `deferred-to-ticket` for both `strict` values. One added
  row is the whole test.
- `packages/core/src/review-attestation.test.ts` is 47 lines, one
  `describe("parseReviewAttestation optional CORE-123 fields")` with three `it`
  blocks. The new disposition cases go in their own `describe`.
- Every other enum copy, found with `git grep deferred-to-ticket`:
  `plugins/kanmer/skills/kanmer-review/SKILL.md:212`,
  `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:395` and
  `:401`, plus narrative-only `MASTERPLAN.md:77` (a historical retro, not a
  contract; deliberately out of scope) and `packages/mcp-server/src/smoke.mjs`
  (`:1456` `accepted-risk`, `:1461` `deferred-to-ticket`) which asserts an
  *existing* value and needs no change.

### `store.ts` `backwardMoveEffects` — the "consumes no budget" property

- `packages/core/src/store.ts:2012` declares
  `private async backwardMoveEffects(...)`; it is called from `:1870`, `:2110`.
  `:3611` documents that Review → Implementing needs a `needs-changes`
  attestation bound to the head, and `:3728` that an absent attestation must
  reach it and be refused.
- The budget is `review_round` / `remediation_budget` on the ticket, incremented
  **only** by an actual backward move through that function. Re-auditing an
  unchanged head, restating a finding, editing a disposition, a bot thread and
  PR metadata all leave `review_round` untouched because none of them is a
  `move_item`. The amendment's "what consumes no budget" list is therefore
  already true of the code; SKILL-039 states it as the *deliberate property* of
  `backwardMoveEffects` rather than changing anything.

### `kanmer-review/SKILL.md` — placement

Headings: `## Workflow` 15, `## Gather the immutable review inputs` 48,
`## Expected reviewers and the settle rule` 75, `## Consolidated review,
remediation batch, delta review` 120, `### Batch PRs` 144, `## The whole-file
review attestation` 173, `## The sanctioned needs-changes return` 235,
`## Decide and merge` 272.

- The word **`outdated` appears nowhere** in `kanmer-review/SKILL.md` or
  `kanmer-auto/SKILL.md`. Confirmed gap.
- `:138–142` is the "Only these block a merge" paragraph; `:143` is blank;
  `:144` is `### Batch PRs`. The new **`### Root-cause classification`**
  subsection is inserted at `:144`, pushing `### Batch PRs` down — inside
  "Consolidated review, remediation batch, delta review", immediately after the
  blocking-rules paragraph and before the batch rules, exactly as scoped.
- `:212–214` is the disposition enum plus the reason/ticket rules.
- `:75–85` already carries the Codex/bot correction ("Codex, GitHub
  code-review bots and similar automated commenters are **never** expected
  reviewers and never a gate"), so the amendment's bot clause needs no new
  wording there — only a cross-reference from the new budget list.
- `:213–221` documents `threads_snapshot`, whose entries carry
  `source | id | author | resolved | finding`. There is **no `outdated`
  field**, and the ticket forbids a new field. The outdated-thread rule is
  therefore expressed purely as `disposition: obsolete-after-change` plus a
  `reason` naming the superseding SHA, with the thread still mapped to its
  `F-###`.
- `## Decide and merge` `:272`: the pass list is `:274–282`; the pre-merge
  re-gather paragraph is `:284–287`; the `gh pr merge` fence is `:289–291`
  (the architect's "~:284-290" is one line off at the fence). The board-push
  re-check sentence goes into `:284–287`, before the fence.
- `:245–252` (in "The whole-file review attestation") already states the
  `required_conversation_resolution` obligation. "Decide and merge" restates it
  as load-bearing at the merge boundary, which is what the ticket asks for.

### The board-push re-check to mirror

`plugins/kanmer/skills/kanmer-auto/SKILL.md:622` `### Push the board before
trusting a gate`; the command pair is `:630–631`:

```sh
git -C <absolute-path-to-board-worktree> rev-parse <board-branch>
git -C <absolute-repository-root> rev-parse origin/<board-branch>
```

`:634–636` states that `<board-branch>` is read from
`get_status.boardWorktree.expectedBranch` and is never a hardcoded
`kanmer-board`. `kanmer-review` must mirror both facts.

### `reconcile_ticket` / `apply_reconciliation` in the skills

- `git grep` in `plugins/kanmer/skills/*/SKILL.md` finds `reconcile_ticket`
  only at `kanmer-auto/SKILL.md:470`, `:508` and `kanmer-execute/SKILL.md:144`
  — and all three are the **packet-aware** step reconciliation, not state
  reconciliation. `apply_reconciliation` appears in **no** skill. Confirmed gap.
- `tool-reference.md:26` documents `reconcile_ticket` as the read-only
  inspector (`id`, optional `step_packet`) returning typed `findings` plus one
  advisory `recommendation` and the document-inclusive `revision`;
  `tool-reference.md:124` documents `apply_reconciliation` (`id`,
  `expected_revision`, `reason?`, `controller?`) applying the one recommended
  action. The dry-run-then-apply wording must use those exact argument names.
- Insertion points: `kanmer-verify/SKILL.md` Workflow step 1 is `:16–17`
  ("Read `get_item` and `get_doc_gates`; confirm the ticket is Verifying …").
  `kanmer-closeout/SKILL.md` `## 0. Gate: is the PR actually merged?` is `:20`,
  its `gh pr view` fence `:22–24`, its verdict sentences `:26–27`.
  `kanmer-auto/SKILL.md` `### Active Review and Verifying invariants` is `:712`;
  the "Anything else is an unexplained state" paragraph is `:724–732`, which is
  where the reconcile-first sentence belongs.

### `AGENTS.md` rule 22 — the managed block

- `AGENTS.md:78` is rule 22 (`**Review findings get dispositions.** Fix, reject
  with reason, accept risk, or defer to a ticket; never silence them.`) and it
  is **inside the managed block**: `:1` is
  `<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will
  be overwritten -->` and `:81` is the end marker.
- The block body is defined once in **`scripts/agents-block-body.mjs:100`**.
  `scripts/agents-block.mjs` re-exports `START`, `END`, `BLOCK_BODY` from it and
  owns `applyManagedBlock` / `writeManagedBlock`; the GUI Connect flow imports
  the same module. CLI: `node scripts/agents-block.mjs <repoDir>`.
- The one hand-kept copy is the fenced block in
  **`plugins/kanmer/skills/kanmer-setup/SKILL.md:295`**, and
  `scripts/verify-agents-block.mjs:160–179` asserts that fenced region equals
  `BLOCK_BODY` **byte for byte** (not `includes`). `:43` also asserts the
  Conduct rule numbers are contiguous, so the rule must stay numbered 22.
- `plugins/kanmer/scripts/agents-block-body.mjs:100` is the **generated**
  plugin copy: `scripts/build-plugin.mjs:10` lists
  `setupScripts = ["agents-block.mjs", "agents-block-body.mjs"]` and copies them
  to `plugins/kanmer/scripts/`; `scripts/check-plugin-sync.mjs:157–166`
  sha256s each against its source. So it is refreshed by `plugin:build`, never
  edited.
- **Source of truth order:** edit `scripts/agents-block-body.mjs`, then
  `plugins/kanmer/skills/kanmer-setup/SKILL.md`, then regenerate `AGENTS.md`
  with `node scripts/agents-block.mjs .`, then `plugin:build`.

### How `verify-skill-prose` pins work

- `scripts/verify-skill-prose.mjs` (1775 lines) walks
  `plugins/kanmer/skills` into `files`, plus `AGENTS.md` (`:22`), and reads
  `packages/core/src/profiles.ts`. Its root is `process.argv[2] ?? repo root`
  (`:20`), which is why the negative fixtures can hand it a temp directory.
- The API is `check(name, ok, detail)` (`:35–39`) printing `PASS`/`FAIL` plus
  the detail, and `hits(re, searched)` (`:40–47`) for line-level scans. The
  script exits non-zero on any failure (`:1774–1775`).
- Sections 1–20 are numbered (`=== N. … ===`, `:48` … `:701`); every section
  after 20 is an **unnumbered named** section (e.g. `=== constrained-step
  authority and reconciliation contract ===` at `:1525`). The convention for
  new work is therefore an unnumbered named section appended before the final
  `forbiddenGoalClaims` loop, not a "check 21" — that is the only place the
  architect's scope is inaccurate.
- The pinning idiom is a regex per sentence, whitespace-tolerant
  (`\s+` or `\s*` across the wrap point, because the prose is hard-wrapped at
  ~78 columns), asserted against the whole skill body — e.g.
  `:812–813` pins `deferred-to-ticket` in `kanmer-auto`. Several sentences are
  combined into one named `check(...)` with `&&`, so one deletion fails a
  named check.
- `scripts/verify-skill-prose.test.mjs` (2650 lines) is the negative half. Each
  test `mkdtempSync`s a fixture, `cpSync`s `plugins/kanmer/skills` and
  `packages/core/src/profiles.ts` into it, writes an `AGENTS.md`, mutates one
  sentence with an `edit(file, from, to)` helper, runs
  `spawnSync(process.execPath, [script, fixture])`, and asserts
  `status !== 0` plus the named check appearing as FAIL.
  **Consequence:** a new check may only read the skills tree, `AGENTS.md` and
  `profiles.ts`. A check that read `docs/functional/frd/…` or
  `packages/core/src/*` would throw in every existing fixture. This is why the
  FRD amendment is **not** pinned by this script.

### FRD-034 and `verify:docs`

- `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md`
  is frontmatter `status: draft`, then `# FRD-034 — Durable goal control and
  independent review` (`:5`), `**Implements:** PRD-002 requirement 7.` (`:7`),
  `## Behaviour` (`:9`), `## Acceptance criteria` (`:36`), `## Edge cases`
  (`:49`, five lines to EOF). Acceptance criterion 5 already says budgets must
  "stop repeated unchanged audits while preserving durable minor/note
  dispositions and residual risk" — the amendment makes that executable.
- **`npm run verify:docs` imposes no heading rules on FRDs.**
  `scripts/verify-docs.mjs` validates only `docs/manual/remote-access.md`,
  `remote-access-troubleshooting.md`, `providers/cloudflared.md`, the 26 doctor
  ids, the generated manual, and `checkDocStructureFiles` (which compares
  `plugins/kanmer/skills/kanmer-docs/assets/doc-structure.md` against
  `docs/contributing/doc-structure.md`). `scripts/check-doc-numbering.mjs` only
  checks file numbering. So `## Amendment — …` is unconstrained, and there is
  precedent: `FRD-011-backlog-list-view.md:45` is `## Amendment (GUI-070)`.

### `.gitignore`

- `goal.md`, `.infisical.json` and `skills-lock.json` are all untracked and
  absent from `.gitignore`. The file's own comment (in the Connect block)
  records why this matters: "`scripts/release.mjs` counts untracked files as a
  dirty tree, so leaving them here blocks every release."

### The verification rail

`scripts/verify.mjs` `VERIFY_STEPS` is the authoritative ordered rail and
already contains `npm run build`, `npm run build -w @kanmer/gui`, `npm test`,
`npm run typecheck`, `npm run verify:docs`, `smoke.mjs`, `smoke:headless`,
`mcpb:check`, `smoke:protocol`, `smoke:discovery`, `npm run verify:skills`,
`npm run verify:agents-block`, `npm run plugin:check`. So `npm run verify`
subsumes the prose, agents-block, docs and plugin-sync checks — but
`plugin:build` must run **before** it, because `plugin:check` sha256s the
committed bundle against a fresh build and core compiles into that bundle
(AGENTS.md §8 gotcha 8, `:655`).

## Implications

1. One PR, one serial skills lane. Core change is one enum value plus one
   clause in an existing condition; everything else is prose plus its pin.
2. No new field, tool, stage or gate. The outdated-thread rule and the
   "consumes no budget" list are *statements about existing behaviour*.
3. `check-pr.mjs` and `merge-gate.ts` need no edit; both are covered by tests.
4. Rule 22 must be changed in three hand-edited places (body module, setup
   skill fence, regenerated `AGENTS.md`) or `verify:agents-block` fails.
5. The new prose check must be an unnumbered named section reading only the
   skills tree, and its negative fixture must mutate a skill file.
6. `plugin:build` is mandatory: core changed, so the committed
   `plugins/kanmer/mcp/kanmer-mcp.cjs` bytes change too.

## Open questions

None. See `open-questions` — every question carries its recorded decision.
