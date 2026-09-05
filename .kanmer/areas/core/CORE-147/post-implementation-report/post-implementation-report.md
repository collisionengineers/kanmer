# Post-implementation report — CORE-147

Branch `CORE-147-verification-contract`, worktree `.worktrees/CORE-147`, based
on `origin/main` @ `410bfd22`. Head `7d9ed857dc6c96bae35f30e70c3052b753e71279`
(one commit, 21 files, +915 / −131).

## What changed

**The contract lives on the board.** `DeliveryConfigSchema.verification`
(`{ workflow, jobs[] (nonempty), event: push|pull_request|workflow_run }`,
optional, camelCase) and `DEFAULT_VERIFICATION_CONTRACT` = `pr.yml` /
`["verify"]` / `push`, frozen and exported from core. `resolveDelivery` always
returns a decided `verification`, handing out a fresh `jobs` array so no caller
can mutate the shared default; `deliveryVerificationSource(board)` mirrors
`deliveryPolicySource`. `defaultBoardConfig()` and `.kanmer/board.yml` are
untouched — the resolved default *is* Kanmer's contract, which is exactly what
FRD-031 requires.

Two decisions worth naming:

- **All three keys are required together.** A board that declared only `jobs`
  and silently kept looking for `pr.yml` would reproduce the hardcoding this
  ticket removes, so a half-declared block is a board error. Pinned by test.
- **`deliveryPolicyVersion` is unchanged.** It still enumerates its four
  fields. The contract says which run *proves* a merge, not where the merge
  goes, so declaring one must not invalidate a candidate identity or shift the
  digests already in `.kanmer/releases/` (the recorded `main@1` attempt's
  `5cfe348e…`). A test asserts the digest is identical before and after
  declaring a contract.

**Assessment.** `assessReceipt(receipt, { mergedSha, contract? })` matches
`workflow`/`job`/`event` against the contract and names the expected value in
every reason (`receipt job must be one of "build", "test", got "verify"`).
`run_id` must now be a positive integer and `attempt` likewise when present;
`provider`/`repo` must be non-empty when present — absent stays accepted,
because MCP-057 never required them and this must not retroactively invalidate
an older proof. That closes MCP-057 review F-002; F-010 is closed by the
contract itself.

`assessReceiptSet(receipts, …)` is new and is what reconciliation calls. A
per-receipt loop cannot see the hole it closes: under a two-job contract a
single flawless `build` receipt is individually satisfied while `test` never
ran. The set assessment reports that as incomplete, naming the missing jobs.
An empty list is satisfied — that is the fallback, not a rejection.

**Threading.** `ReconciliationEvidence.verification?` is optional and additive;
absent (an older collector) the classifier falls back to the shipped default,
which is precisely the pre-CORE-147 behaviour, so an old collector paired with
a new classifier cannot start *accepting* receipts it used to reject.
`collectReconciliationEvidence` fills it from `resolveDelivery(board)` at the
host boundary, so core stays pure and store-free. `stableEvidence` copies it
only when present. The `head_sha` precedence and the
`PROOF_RECEIPT_SHA_MISMATCH` finding are untouched.

**Skill and prose.** `kanmer-verify` step 3 reads
`get_status.delivery.integrationBranch` and `delivery.verification`, builds
`gh run list --workflow <workflow> --event <event> --commit <MERGED_SHA>` from
them, and requires *every* contract job `completed`/`success`. The PR-event
rule is kept and sharpened: a `pull_request` run counts only when the contract
asks for one **and** its head SHA equals the merge SHA — which a squash merge
never produces, so such a project always takes the fallback. Coverage is now
"the obligations the contract's jobs actually run", with Kanmer's `verify` job
running `VERIFY_STEPS` given as the worked example rather than the rule. The
fallback has its own paragraph: no matching run → every obligation `missing` →
the designated verifier runs them in the detached worktree → `receipts: []`
plus a body sentence naming why, and that proof authorises Done exactly like a
receipt-bearing one. `kanmer-setup` gains a "declare the contract" section with
the explicit warning about a workflow that does not run on pushes to the
integration branch. AGENTS.md §4, `docs/manual/proof.md`, FRD-006 and FRD-031
(new AC6) updated.

The managed AGENTS block body (`scripts/agents-block-body.mjs` and its mirror
inside `kanmer-setup/SKILL.md`) was deliberately left alone — it is lane A's
file and out of this ticket's scope; the setup guidance was added as its own
section instead.

## Tests

- `packages/core/src/proof-receipts.test.ts` — declared-contract acceptance for
  each contract job; `pr.yml`/`verify` rejected under a `ci.yml` contract with
  both reasons asserted verbatim; the declared `event` named in the reason; a
  `pull_request` receipt accepted only under a `pull_request` contract and only
  at the merge SHA; `run_id` 0 / `"abc"` / `false` / `1.5` / `-1`; `attempt: 0`
  rejected and absent accepted; empty `provider`/`repo` rejected and absent
  accepted; `assessReceiptSet` empty-list, full-coverage, one-of-two
  (message asserted verbatim), all-rejected (no coverage noise), and default
  contract. 36 tests in the file, all existing MCP-057/CORE-129 cases unchanged
  apart from the one reason string that now reads `must be one of "verify"`.
- `packages/core/src/delivery.test.ts` — default and declared contract,
  separate sources, the shared-default mutation guard, three half-declared
  refusals, and the policy-version stability assertion.
- `packages/core/src/reconciliation.test.ts` — two contract-bound
  `PROOF_RECEIPT_REJECTED` rows (wrong workflow; one of two jobs) and two
  `MOVE_TO_DONE` rows (both jobs covered; `receipts: []` under a declared
  contract).
- `packages/mcp-server/src/reconciliation.test.mjs` — the fallback proof goes
  through the real YAML → CORE-129 parser → `reconcileEvidence` path
  (`record.state === "valid-pass"`), yields zero `PROOF_RECEIPT_*` findings and
  a recommendation `deepEqual` to the receipt-bearing control's; a `pr.yml`
  receipt under the `ci.yml` contract names `ci.yml` in the finding; the
  incomplete-job case names the missing job; and a collector test proves the
  contract is read from the board (default, then declared).
- `packages/mcp-server/src/smoke.mjs` — `get_status.delivery.verification` and
  `verificationSource`.
- `packages/mcp-server/src/golden-board.mjs` GB-11 (existing
  `main-only-and-candidate-delivery` class — no new class invented) — the
  declared contract is read back through `get_status`, and the four set
  assessments (full coverage, incomplete, wrong workflow, empty) run against
  the resolved contract.

## Commands (in the worktree)

| Command | Exit |
|---|---|
| `npm ci` | 0 |
| `npm run build` | 0 |
| `npm run plugin:build` | 0 |
| `node scripts/build-stamp.mjs --write` | 0 |
| `npm run build:manual` | 0 |
| `npm run test:built` | 0 (core 1028 passed, ui 646 passed, every node suite fail 0) |
| `npm run typecheck` | 0 (core, mcp-server, ui, gui) |
| `node packages/core/scripts/check-browser.mjs` | 0 |
| `node packages/mcp-server/src/smoke.mjs` | 0 — 388/388 |
| `npm run golden` | 0 — 20/20 scenarios |
| `npm run verify:skills` | 0 — ALL CHECKS PASSED |
| `npm run verify:docs` | 0 — PASS, generated manual current |
| `npm run check:manual` | 0 — up to date, 22 chapters |
| `npm run plugin:check` | 0 — 41 tools match, bundle bytes match, 12 skill frontmatters |
| `git status --short` | empty after the final build |

The full rail was not run locally; the hosted `verify` job owns it on the PR.

## Deviations

- `packages/core/src/release.ts` carries a comment-only change explaining why
  `deliveryPolicyVersion` still enumerates four fields. It was named in
  `files.md` as comment-only.
- `apps/gui/src/renderer/src/manual/chapters.generated.ts` and
  `plugins/kanmer/mcp/kanmer-mcp.cjs` are in the diff. Both are generated
  (`build:manual`, `plugin:build`) and committed as the repo requires;
  `git status --short` is empty after a fresh build and `plugin:check` reports
  the bundle bytes match. No hand-written `apps/gui/src/**` file was touched —
  GUI Settings does not render the `delivery` block, and `typecheck` covers the
  GUI.
- The golden coverage was added to the existing GB-11 scenario rather than as a
  new scenario, because FRD-035's class list is frozen and a new class with no
  entry in it is a startup refusal.

## Residual risk

Coverage — "is this obligation actually inside what the contract's jobs run?" —
remains a human judgement, now correctly scoped per project rather than
asserted as a Kanmer-specific rule. Provider provenance is still unautomated
(out of scope, R2-EVIDENCE). Both are stated in the skill rather than hidden.
