## Objective

Edit `BLOCK_BODY` in `scripts/agents-block-body.mjs` (the bullet list above
`## Agent conduct`) so the managed block routes work by purpose (direct vs
tracked), names the configured integration branch instead of a literal
`main`, scopes ticket-folder loading to what the current step needs, and
states a one-heavy-verifier-per-host rule. The 24 numbered conduct rules and
their 4 group headings, and both board-branch paragraphs, stay byte-identical
(`verify-agents-block.mjs` check 1 pins the rule count/order). Every mirror
(`plugins/kanmer/skills/kanmer-setup/SKILL.md` fenced copy, this repo's
`AGENTS.md`, the built `plugins/kanmer/scripts/agents-block-body.mjs`) stays
byte-consistent with the canonical body.

## Starting state

- `scripts/agents-block-body.mjs` `BLOCK_BODY` currently reads (bullet list
  order): session-start, doc-gates-not-board.yml, stages/one-boundary,
  gates-constrain-move_item-only, open-questions, "Read the whole ticket
  folder before starting …", branch/worktree convention, set_ticket_doc /
  append_scratch, "Proof is written on merged `main` …", archive-not-delete,
  skills-order, "Each skill ends by naming what comes next …".
- This repo's `AGENTS.md` (lines 1-81) and `plugins/kanmer/skills/kanmer-setup/SKILL.md`
  (fenced block, lines ~220-300) both carry a byte-identical copy of that body
  today.
- `get_status` already exposes `delivery.integrationBranch` via
  `resolveDelivery(board)` at `packages/mcp-server/src/index.ts:777` (`delivery:
  { ...resolveDelivery(board), source: deliveryPolicySource(board) }`);
  `resolveDelivery` lives at `packages/core/src/board.ts:229` and defaults
  `integrationBranch` to `main` when the board declares no `delivery:` block.
  No new plumbing is needed — only the prose must stop assuming `main`.
- `scripts/verify-agents-block.mjs` currently has checks 1-9 (24-rule/4-group
  structure, present/prepend/idempotent/malformed-marker behaviour, SKILL.md
  fenced-copy equality, this repo's AGENTS.md carries the body, GUI re-export
  structure). No routing/integration-branch checks exist yet.
- `scripts/agents-block-routing.test.mjs` does not exist.

## Required changes

Five bullet-level edits to `BLOCK_BODY` in `scripts/agents-block-body.mjs`,
each stated as the exact resulting text (Markdown, verbatim — these are the
literal bytes to write, modulo the JS template-literal escaping of backticks
already used throughout the file):

1. **Replace** the existing bullet
   `- Proof is written on merged \`main\`, after review and the merge, not before.`
   with:
   `- Proof is written on the configured integration branch after review and the merge, not before. Read it from \`get_status\` → \`delivery.integrationBranch\` (default \`main\`); never hardcode a branch name. Ordinary Done means integrated and accepted there. Deployment belongs to a release or an explicitly deployment-scoped ticket and is never a condition of ordinary Done.`

2. **Insert** a new bullet as the FIRST bullet in the list (immediately before
   the existing `- Start every session with \`get_status\`…` bullet):
   `- **Resolve the request before starting a workflow.** Explaining code, reviewing a reference the owner supplied, or producing an isolated artifact is direct work: no ticket, no branch, no worktree. Track work when it changes this repo's shipped behaviour or when the owner asks. Then pick the profile by consequence, not size — a two-line change to authorization, schema, release behaviour or irreversible data still owes its profile's evidence. Never bypass a gate through late-stage creation or an empty \`custom\` profile.`

3. **Replace** the existing bullet
   `- Read the whole ticket folder before starting — documents are folders (\`research/\`, \`plan/\`, …), so there may be several files per type. If the ticket is in a group, read the group's \`context.md\` too: the constraint binding the batch is written once, there.`
   with:
   `- Read what the current step needs: the ticket body, \`get_doc_gates\`, the governing decision, the relevant plan/checklist section and the latest proof/review pointer. Documents are folders (\`research/\`, \`plan/\`, …) so a type can hold several files — pull older attempts only when a claim or a failure investigation needs them. If the ticket is in a group, read the group's \`context.md\` too: the constraint binding the batch is written once, there.`

4. **Replace** the start of the skills-order bullet. Existing bullet:
   `- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. How far a ticket walks it depends on its profile, so ask \`get_doc_gates\` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).`
   New bullet (only the opening clause changes; everything from "Off to the
   side" onward is unchanged):
   `- Skills run in this order **when a tracked ticket walks the full pipeline**: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. Direct work runs none of them. How far a tracked ticket walks it depends on its profile, so ask \`get_doc_gates\` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).`

5. **Insert** a new bullet immediately after the (now-rewritten) proof bullet
   from change 1, before the `- Archive, don't delete …` bullet:
   `- **One heavy verification owner per host.** Full rails, packaging and installer builds serialize behind the named verifier recorded in the repo's operating index. A second agent waits for that run — or reuses a matching completed CI result — instead of starting a competing whole-repository build. Lightweight file checks do not queue behind it.`

Resulting bullet order in `BLOCK_BODY` (unlabelled items unchanged from
today): resolve-request-first (new #2), session-start (#1), doc-gates,
stages/one-boundary, gates-constrain-move_item-only, open-questions,
read-what-the-step-needs (#3, rewritten), branch/worktree convention,
set_ticket_doc/append_scratch, proof-on-integration-branch (#1, rewritten),
one-heavy-verifier (new #5), archive-not-delete, skills-order (#4, rewritten
opening clause), each-skill-names-next.

The 24 numbered `## Agent conduct` rules and their `**Scope**` / `**Build**`
/ `**Prove**` / `**Conduct**` headings, and both board-branch paragraphs
above and below the bullet list, are copied byte-for-byte from the current
file — no wording, punctuation, or ordering changes there.

### Mirrors and generated artifacts

- Hand-sync the fenced managed-block copy inside
  `plugins/kanmer/skills/kanmer-setup/SKILL.md` (the block between its
  `<!-- kanmer:instructions:start … -->` / `<!-- kanmer:instructions:end -->`
  markers) to be byte-identical to the new `BLOCK_BODY` (check 7 in
  `verify-agents-block.mjs` asserts exact fenced-region equality, not mere
  substring containment).
- Run `node scripts/agents-block.mjs .` from the worktree root to regenerate
  this repo's own `AGENTS.md` managed block (check 8 asserts this repo's
  `AGENTS.md` carries the current body).
- Run `npm run build && npm run plugin:build` to refresh
  `plugins/kanmer/scripts/agents-block-body.mjs` (and the co-located
  `agents-block.mjs` copy `build-plugin.mjs` also copies). Confirm the
  committed `plugins/kanmer/mcp/kanmer-mcp.cjs` is byte-identical to a fresh
  build afterward (`plugin:check`'s sha256 comparison) — it must not change
  from this ticket's edits, because nothing in `packages/core` or
  `packages/mcp-server` changes. If it does change, stop and report rather
  than committing an unexplained bundle diff.
- `apps/gui/src/main/agentsBlock.ts` re-exports `BLOCK_BODY` from
  `scripts/agents-block-body.mjs` already (verified by check 9's structural
  assertion) and needs no edit.

### `scripts/verify-agents-block.mjs`: four new checks

Add checks 10-13 after the existing check 9, in the same `check(name, cond,
detail)` harness style already used in the file:

- **Check 10** — `BLOCK_BODY` contains no literal `Proof is written on merged`
  (the exact stale phrase being replaced).
- **Check 11** — `BLOCK_BODY` contains the literal substring
  `delivery.integrationBranch`.
- **Check 12** — `BLOCK_BODY` contains both literal substrings
  `Resolve the request before starting a workflow` and
  `One heavy verification owner per host`.
- **Check 13** — `BLOCK_BODY` contains the literal substring
  `Deployment belongs to a release`.

### `scripts/agents-block-routing.test.mjs`: new routing fixture test

New file, `node:test`-based (matches the convention of other
`scripts/*.test.mjs` files, auto-discovered by `scripts/test-scripts.mjs`
which enumerates `scripts/*.test.mjs`). Imports `BLOCK_BODY` from
`./agents-block-body.mjs` and asserts:

- Each of the five sentences below appears **exactly once** in `BLOCK_BODY`
  (a literal `String.prototype.split(...).length === 2` count, or
  equivalent, per sentence — not a regex global-match count that could hide
  an accidental duplicate elsewhere in the file):
  1. `Resolve the request before starting a workflow.`
  2. `Proof is written on the configured integration branch after review and the merge, not before.`
  3. `Ordinary Done means integrated and accepted there.`
  4. `Deployment belongs to a release or an explicitly deployment-scoped ticket and is never a condition of ordinary Done.`
  5. `One heavy verification owner per host.`
- The 24-numbered-rule / 4-group-heading structure is intact: same regex
  approach as `verify-agents-block.mjs`'s existing check 1
  (`/^(\d+)\. \*\*/gm` matches exactly 24, numbered 1..24 in order; all four
  of `**Scope**`, `**Build**`, `**Prove**`, `**Conduct**` present).

## Expected files

- `scripts/agents-block-body.mjs`
- `plugins/kanmer/skills/kanmer-setup/SKILL.md`
- `scripts/verify-agents-block.mjs`
- `scripts/agents-block-routing.test.mjs`
- `AGENTS.md` (regenerated managed block via the script; possibly a small
  prose sentence in §6/§7 if conduct rule 24 requires it — see below)
- `plugins/kanmer/scripts/agents-block-body.mjs` (build output, refreshed by
  `npm run plugin:build`; not hand-edited)
- `post-implementation-report/post-implementation-report.md`

## Do not modify

- The 24 numbered `## Agent conduct` rules or their 4 group headings, in any
  of the three copies.
- The two board-branch paragraphs above and below the bullet list.
- `scripts/verify.mjs`, `.github/workflows/pr.yml`,
  `packages/mcp-server/src/check-pr.mjs`, `plugins/kanmer/skills/kanmer-verify/SKILL.md`,
  `plugins/kanmer/skills/kanmer-execute/SKILL.md`, `plugins/kanmer/skills/kanmer-review/SKILL.md`,
  `packages/core/src/reconciliation.ts`, anything under `apps/gui/src/**`
  (other lanes own these).
- `CLOSEOUT_PLAN.md` (DOC-026's scope, later).
- `plugins/kanmer/mcp/kanmer-mcp.cjs` — must remain byte-identical after
  `npm run plugin:build`, since no core/server source changes.

## Constraints

- Profile is `chore`: only `plan` (+`questions-resolved`) is required to
  leave Preparing, and only `proof` (+`questions-resolved`) to reach Done.
- This is lane B of the R1-POL package (HZN-009); lane A owns
  `pr.yml`/`scripts/verify.mjs`/`check-pr.mjs`/execute+review skills, lane C
  owns `apps/gui/src/**` — none of those are touched here.
- Wording for the new/changed bullets is adapted from
  `Kanmer_Upgrade_Pack_2026-09-05/templates/managed-block-draft.md` but is
  not copied verbatim — that file is a looser prose draft; the exact final
  wording is fixed by the parent orchestrator's ticket body and reproduced
  literally in "Required changes" above.

## Governing docs

- `docs/functional/frd/FRD-013-setup-as-reconciliation.md` — setup/reconcile
  is unaffected; only the block body it writes changes.
- `docs/functional/frd/FRD-023-agent-skills-system.md` R1: skills derive
  rules from `get_doc_gates` rather than restating them (`verify-skill-prose.mjs`
  check 7/8). The new bullets name no per-profile requirement mapping, so
  they do not regress that rule; `npm run verify:skills` (which runs
  `verify-skill-prose.mjs`) confirms this.
- `docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md` —
  the proof-branch bullet is brought into line with `resolveDelivery`'s
  documented default-`main` behaviour; delivery state stays non-gating, only
  the routing text changes to name the accessor instead of a literal branch.

No new ADR is needed: this is a prose-routing change to an existing
mechanism (`resolveDelivery`, `get_doc_gates`), not a new architectural
decision.

## Ordered steps

### Step 1 — Edit `BLOCK_BODY` in `scripts/agents-block-body.mjs`

Files: `scripts/agents-block-body.mjs`
Apply the five bullet-level edits listed under "Required changes" above,
leaving the 24 conduct rules, 4 group headings, and both board-branch
paragraphs byte-identical.

### Step 2 — Hand-sync the `kanmer-setup` SKILL.md fenced copy

Files: `plugins/kanmer/skills/kanmer-setup/SKILL.md`
Replace the fenced block's contents (between its two HTML-comment markers)
with the exact new `BLOCK_BODY` text from Step 1, byte for byte.

### Step 3 — Regenerate this repo's `AGENTS.md` block

Files: `AGENTS.md`
Command: `node scripts/agents-block.mjs .`
Confirm only the span between the markers changed.

### Step 4 — Add checks 10-13 to `scripts/verify-agents-block.mjs`

Files: `scripts/verify-agents-block.mjs`
Add the four checks described above, in the existing `check(...)` style,
after check 9.

### Step 5 — Add the routing fixture test

Files: `scripts/agents-block-routing.test.mjs`
New `node:test` file asserting the five sentences (exactly once each) and
the 24-rule/4-group structure.

### Step 6 — Build and refresh plugin artifacts

Files: `plugins/kanmer/scripts/agents-block-body.mjs`, `plugins/kanmer/mcp/kanmer-mcp.cjs` (verify unchanged)
Commands: `npm run build && npm run plugin:build`
Confirm `git status` shows `plugins/kanmer/mcp/kanmer-mcp.cjs` unchanged; if
changed, stop and report.

### Step 7 — AGENTS.md prose outside the block, if required by conduct rule 24

Files: `AGENTS.md` (§6 or §7 prose, outside the managed block)
Conduct rule 24 requires AGENTS.md be updated in this PR if commands or
conventions changed. No command changed. If `npm run verify:docs` /
`npm run check:manual` demand it, add one minimal sentence noting the
routing rule; otherwise skip this step and say so in the report.

## Acceptance checks

- `node scripts/verify-agents-block.mjs` — checks 1-13 all PASS.
- `node --test scripts/agents-block-routing.test.mjs` — all assertions PASS.
- `npm run verify:skills` — green (FRD-023 R1 compliance, no new per-profile
  requirement list, no dangling skill references).
- `npm run verify:docs && npm run check:manual` — green, or the specific
  failure is resolved with a minimal §6/§7 sentence per Step 7.
- `npm run build && npm run plugin:build` — succeed; `git status --short`
  shows only the intended files changed and `plugins/kanmer/mcp/kanmer-mcp.cjs`
  byte-identical to before.
- `npm run plugin:check` from a fresh clone of the branch outside the
  repository (required because it refuses inside a linked worktree) —
  passes; result recorded in the post-implementation report.

## Commands

```
node scripts/verify-agents-block.mjs
node --test scripts/agents-block-routing.test.mjs
npm run verify:skills
npm run verify:docs && npm run check:manual
npm run build && npm run plugin:build
git status --short
```

Fresh-clone-only (never inside the worktree):
```
git clone <worktree> "$TMP/kanmer-fresh-doc028" && cd "$TMP/kanmer-fresh-doc028" && npm ci && npm run build && npm run plugin:check
```

## Failure and deviation rules

- A failing scoped check stops and is reported, never worked around by
  weakening an assertion (conduct rule 19).
- If `plugins/kanmer/mcp/kanmer-mcp.cjs` changes after `npm run plugin:build`,
  stop immediately and report — this ticket touches no core/server source,
  so any diff there is unexplained and must not be committed blind.
- `npm run plugin:check` is never run inside `.worktrees/DOC-028` (it
  refuses by design); it is run only from the fresh clone described above.
- If `npm run verify:docs` / `check:manual` require more than the minimal
  Step 7 sentence, stop and report the exact requirement rather than
  expanding scope into documentation restructuring.

## Stop condition

Stop after: the five `BLOCK_BODY` edits are made and both mirrors
(`kanmer-setup/SKILL.md`, this repo's `AGENTS.md`) match byte-for-byte; checks
10-13 and the new routing test exist and pass; `verify:skills`,
`verify:docs`, `check:manual` are green (or Step 7 is done and re-verified);
`npm run build && npm run plugin:build` succeed with an unchanged
`kanmer-mcp.cjs`; the fresh-clone `plugin:check` has been run and its result
recorded; the post-implementation report is written; the PR is open against
`main` with the `Kanmer: DOC-028` footer; and the ticket is moved to Review.
Do not merge, self-review, or start another ticket.
