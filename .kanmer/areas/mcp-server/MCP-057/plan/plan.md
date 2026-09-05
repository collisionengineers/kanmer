## Objective

Make `kanmer-verify` consult the bound post-merge `pr.yml` `verify` run for the
exact PR merge SHA before creating a disposable verification worktree, and
record that evidence as a typed `receipts[]` list beside `attempts[]` in the
proof frontmatter. Receipts are additive: an absent `receipts` list leaves
existing behaviour and existing proofs unaffected.

## Starting state

- Base: `main` at `c088be13` (current HEAD observed at planning time).
- PR #321 (DOC-028) touches `scripts/agents-block-body.mjs` and
  `kanmer-setup` — not touched here.
- PR #322 (CORE-140) touches verify-rail scripts — not touched here.
- CORE-129 (typed `attempts[]` / `proof-record/2`) is Preparing and is planned
  to implement *after* this ticket so the `receipts[]` shape is settled first;
  this plan therefore adds `receipts[]` beside the existing free-form
  `attempts[]` without touching `attempts[]` semantics.
- CORE-133 (merge-SHA binding for PASS/FAIL routing in
  `packages/core/src/reconciliation.ts`) is Done; this plan extends its
  comparison rather than replacing it.

## Governing docs

- `docs/functional/frd/FRD-006-typed-proof.md` — proof frontmatter contract;
  amended with a short additive "Receipts" paragraph describing `receipts[]`
  as optional evidence beside `attempts[]`.
- `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md`
  — already requires exact-merge-SHA verification; unaffected, receipts
  reinforce it.
- No new ADR: this is an additive evidence field and a skill workflow
  reordering, not a new architectural decision.

## Required changes

1. **`packages/core/src/proof-receipts.ts`** (new, pure, no `node:` imports):
   - `export type ProofReceipt` — `kind`, `provider`, `repo`, `workflow`,
     `event`, `run_id`, `attempt`, `head_sha`, `job`, `conclusion`, `url`,
     `covers`, `observed_by`, plus an index signature to preserve unknown
     fields.
   - `export function parseProofReceipts(frontmatter: unknown): ProofReceipt[]
     | { invalid: string[] }` — takes the already-parsed proof frontmatter
     object (the caller has already run `gray-matter`); absent `receipts` key
     returns `[]`; a non-array `receipts` or a non-object entry returns
     `{ invalid: [...] }`; each valid entry preserves unknown fields verbatim.
   - `export function assessReceipt(receipt: ProofReceipt, opts: { mergedSha:
     string }): { kind: "satisfied" } | { kind: "rejected"; reasons: string[]
     }` — reasons for: unknown `kind` (only `github-actions-run` is known),
     missing `job`/`run_id`/`url`, `event !== "push"`, `conclusion !==
     "success"`, `head_sha` not an exact case-sensitive 40-hex match of
     `mergedSha`.
   - Exported from `packages/core/src/index.ts` only (not `browser.ts`, per
     `check-browser.mjs` and the ticket's technical seam).

2. **`packages/core/src/types.ts`**: extend `ReconciliationEvidence["proof"]`
   with an optional `receipts?: ProofReceipt[]` field (additive; existing
   fixtures/callers that omit it are unaffected).

3. **`packages/core/src/reconciliation.ts`**: in the Verifying-stage
   comparison that binds `evidence.proof.mergedSha` to
   `evidence.pullRequest.mergeSha` (CORE-133), add a second, distinct check:
   when `evidence.proof.receipts` is present and any entry's `head_sha`
   disagrees with `evidence.pullRequest.mergeSha`, push a new finding code
   `PROOF_RECEIPT_SHA_MISMATCH` (distinct from `PROOF_MERGE_SHA_MISMATCH`) and
   return no recommendation, for both the PASS and FAIL binding sites. A proof
   with no `receipts` is unaffected and falls through to today's behaviour
   unchanged.

4. **`packages/mcp-server/src/reconciliation.ts`** `proofEvidence()`: after
   parsing frontmatter with `matter(raw).data`, call
   `parseProofReceipts(parsed)`; on `{ invalid }` leave `receipts` absent from
   the returned evidence (do not fail the whole proof over a receipts-only
   defect — a malformed `receipts[]` is reported, not fatal to the base
   PASS/FAIL/mergedSha reading); on a valid array with length > 0, attach it
   as `receipts` on the returned `pass`/`fail` evidence shape. An absent or
   empty `receipts[]` omits the field entirely, matching existing back-compat
   expectations in the test fixtures.

5. **`plugins/kanmer/skills/kanmer-verify/SKILL.md`**: reorder Workflow steps
   as specified in the ticket (1 read/reconcile, 2 `gh pr view` MERGED +
   mergeCommit.oid, 3 look up the bound receipt via `gh run list`/`gh run
   view` before any Git operation with satisfied/rejected/in-progress rules,
   4 classify each packet obligation satisfied/missing/rejected, 5 create the
   detached worktree only if step 4 left anything missing — move the existing
   worktree section under this condition text otherwise unchanged, 6 run only
   the missing checks unchanged, 7 whole-file proof + Done gate unchanged plus
   `receipts:`). Add the `receipts:` frontmatter example beside the existing
   `attempts:` example, and a short section "What is validated by code and
   what is human judgement in this release". Minimal diff to the rest of the
   file (failure classes, retirement, handoff unchanged).

6. **Docs**: `docs/manual/proof.md` and `FRD-006-typed-proof.md` get a short
   additive "Receipts" paragraph — receipts are additive beside attempts, and
   this is foundational for CORE-129's coming typed `attempts[]` validation.

7. **Build**: `npm run build && npm run plugin:build` — commit the rebuilt
   `plugins/kanmer/mcp/kanmer-mcp.cjs` because `reconciliation.ts` source
   changed. Tool roster stays 41 (no new MCP tool).

## Expected files

See `files/files.md`.

## Do not modify

See `files/files.md`. In particular: no receipt store, no reuse-key digest,
no ancestry reuse, no new MCP tool, no process spawning in core,
`scripts/agents-block-body.mjs`/`kanmer-setup` (PR #321), verify-rail scripts
(PR #322).

## Constraints

- `packages/core/src/proof-receipts.ts` has no IO and no `node:` imports.
- Additive only: a proof with no `receipts` behaves exactly as today; existing
  `reconciliation.test.mjs` fixtures without `receipts` must keep passing
  unchanged.
- Never rewrite existing proofs; never invent a green receipt for evidence
  that was not actually observed.

## Ordered steps

### Step 1 — Pure core module and its unit tests

- Files: `packages/core/src/proof-receipts.ts`, `packages/core/src/proof-receipts.test.ts`, `packages/core/src/index.ts`.
- Symbols: `ProofReceipt`, `parseProofReceipts`, `assessReceipt`.
- Tests: valid; wrong SHA; cancelled/non-success conclusion; `pull_request`
  event; missing `job`; unknown `kind`; absent `receipts` (`[]`); unknown
  extra field preserved.
- Commands: `npm run test -w @kanmer/core` (or the focused vitest file
  first), `npm run typecheck`, `node packages/core/scripts/check-browser.mjs`.
- Done when: the parser and assessor are table-driven tested and not exported
  from `browser.ts`.

### Step 2 — Extend types and the core merge-SHA comparison

- Files: `packages/core/src/types.ts`, `packages/core/src/reconciliation.ts`.
- Symbols: `ReconciliationEvidence["proof"]["receipts"]`,
  `PROOF_RECEIPT_SHA_MISMATCH` finding code.
- Tests: extend or add core reconciliation tests (if a suite exists) for a
  receipt-SHA mismatch on both PASS and FAIL routes; a proof with no
  `receipts` is unaffected.
- Commands: `npm run test -w @kanmer/core`, `npm run typecheck`.
- Done when: the additive comparison is covered without regressing existing
  CORE-133 tests.

### Step 3 — MCP `proofEvidence()` surfacing

- Files: `packages/mcp-server/src/reconciliation.ts`,
  `packages/mcp-server/src/reconciliation.test.mjs`.
- Symbols: `proofEvidence`.
- Tests: valid receipt surfaced; wrong-SHA receipt surfaced and routed to
  `PROOF_RECEIPT_SHA_MISMATCH` via `reconcileEvidence`; no-receipts back-compat
  (existing fixtures unchanged).
- Commands: `npm run build`, `node --test
  packages/mcp-server/src/reconciliation.test.mjs
  packages/mcp-server/src/step-reconciliation.test.mjs`.
- Done when: receipts round-trip through `proofEvidence` and the classifier
  without changing any existing assertion.

### Step 4 — Skill reorder and proof example

- Files: `plugins/kanmer/skills/kanmer-verify/SKILL.md`.
- Tests/commands: `npm run verify:skills`.
- Done when: the workflow is reordered as specified, the `receipts:` example
  is documented beside `attempts:`, and the "validated by code / human
  judgement" section is present; diff stays minimal (failure classes,
  retirement and handoff prose unchanged).

### Step 5 — Docs, build, and full scoped check pass

- Files: `docs/manual/proof.md`, `docs/functional/frd/FRD-006-typed-proof.md`.
- Commands: `npm run verify:docs && npm run check:manual`, `npm run build &&
  npm run plugin:build`, `node packages/mcp-server/src/smoke.mjs`, then the
  fresh-clone `npm run plugin:check` per AGENTS §7.
- Done when: docs updated additively, the plugin bundle is rebuilt and
  committed only because server source changed, and every scoped check in
  the ticket passes.

## Acceptance checks

- Exact matching evidence (push event, `verify` job, `success`, `headSha`
  equal to the full merge SHA) is `assessReceipt` `satisfied`.
- Wrong SHA, `pull_request` event, non-success conclusion, missing
  `job`/`run_id`/`url`, or unknown receipt `kind` is `rejected` with a
  reason; table-driven tests cover each.
- `receipts[]` is optional in proof frontmatter; existing proofs without it
  are unaffected; unknown fields on a receipt are preserved.
- `proofEvidence()` surfaces `receipts` and the core reconciliation
  comparison rejects a proof whose receipt `head_sha` disagrees with the PR
  merge SHA, with a reason distinct from the existing
  `PROOF_MERGE_SHA_MISMATCH`.
- `kanmer-verify/SKILL.md` workflow is reordered exactly as specified; the
  detached worktree section moves under "only if something is missing";
  `npm run verify:skills` passes.
- Tool roster stays 41; `plugins/kanmer/mcp/kanmer-mcp.cjs` is rebuilt and
  committed because `reconciliation.ts` changed.

## Commands

```
npm run test -w @kanmer/core
npm run build && npm run plugin:build
node --test packages/mcp-server/src/reconciliation.test.mjs packages/mcp-server/src/step-reconciliation.test.mjs
node packages/core/scripts/check-browser.mjs
npm run typecheck
npm run verify:skills
npm run verify:docs && npm run check:manual
node packages/mcp-server/src/smoke.mjs
```

## Failure and deviation rules

- If any of the above scoped commands fails, fix in this ticket's scope
  before moving on; do not widen scope into CORE-129's typed `attempts[]`
  validator or CORE-140's rail scripts.
- If `npm run plugin:check` cannot run in the linked worktree, run it from a
  fresh clone of the branch outside the repo per AGENTS §7, and report the
  result rather than skipping it.
- Do not add a receipt store, reuse keys, ancestry reuse, a new MCP tool, or
  process spawning in core — these are explicitly out of scope (ticket "Out
  of scope" section).

## Stop condition

Stop at Review with one clean PR against `main`, a current
post-implementation report, every scoped command run with its exit code
recorded, and the ticket moved `implementing` → `review`. Independent review,
merge, and post-merge verification are separate phases.
