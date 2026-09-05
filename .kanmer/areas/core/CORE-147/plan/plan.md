# Plan — CORE-147

Make the verification contract project-declared so evidence-first verification
works in a repository that is not Kanmer's own. The contract extends the
existing FRD-031 `delivery` block; nothing parallel is introduced.

## 1. The contract shape

`board.yml` (camelCase, like the rest of `delivery`):

```yaml
delivery:
  integrationBranch: dev
  verification:
    workflow: ci.yml
    jobs: [build, test]
    event: push
```

`VerificationContractSchema = z.object({ workflow: z.string().min(1), jobs:
z.array(z.string().min(1)).min(1), event: z.enum(["push","pull_request","workflow_run"]) })`,
attached as `DeliveryConfigSchema.verification` (optional). All three keys are
required *together* when the block is present: a half-declared contract is a
board error, not a silent partial default, because the whole point is that a
consumer can see exactly which run Kanmer will look for.

`DeliveryPolicy` gains `verification: VerificationContract` (always decided).
`DEFAULT_VERIFICATION_CONTRACT = { workflow: "pr.yml", jobs: ["verify"], event:
"push" }` is exported from core and frozen; `resolveDelivery(board)` returns a
copy (fresh `jobs` array) so no caller can mutate the shared default.

`deliveryVerificationSource(board): "board" | "default"` mirrors
`deliveryPolicySource` — `board.delivery?.verification ? "board" : "default"`.
It is separate from `deliveryPolicySource` on purpose: a board can declare
`integrationBranch` and no contract, and reporting one `source` for both would
lie about which half came from the file.

`defaultBoardConfig()` is unchanged and Kanmer's own `.kanmer/board.yml` still
carries no `delivery:` block: the resolved default *is* Kanmer's policy and
FRD-031 forbids changing it to demonstrate another.

`deliveryPolicyVersion()` keeps enumerating its four existing fields, so the
recorded `main@1` release digest `5cfe348e…` is unchanged. A test pins that.

## 2. `get_status`

`delivery: { ...resolveDelivery(board), source: deliveryPolicySource(board),
verificationSource: deliveryVerificationSource(board) }` — the resolved
`verification` object rides in via the spread, and the source sits beside the
existing `source`, matching how the policy source is already reported.

## 3. `assessReceipt` / `assessReceiptSet`

`assessReceipt(receipt, { mergedSha, contract? })`, `contract` defaulting to
`DEFAULT_VERIFICATION_CONTRACT` so every existing caller and test keeps its
meaning. Rules, each with its own distinct reason string (existing reasons keep
their wording apart from the literal being interpolated):

- `kind` in the known set.
- `workflow` `=== contract.workflow`; reason names the expected value.
- `job` present, and one of `contract.jobs`; reason names the expected set.
- `event` `=== contract.event`.
- `conclusion === "success"`.
- `head_sha` full 40-hex and equal to `mergedSha` (untouched — the
  `PROOF_RECEIPT_SHA_MISMATCH` finding still owns that class, and
  `receiptAssessmentRejections` still filters `head_sha` reasons out).
- `run_id` a positive integer (`Number.isInteger` and `> 0`) — closes F-002;
  `0`, `"abc"`, `false`, `1.5` all rejected.
- `attempt`, when present, a positive integer. Absent is accepted: MCP-057
  never required it and existing proofs may omit it.
- `provider`/`repo`, when present, non-empty strings. Same additive rule.
- `url` non-empty.

`assessReceiptSet(receipts, { mergedSha, contract })` returns
`{ kind: "satisfied" } | { kind: "rejected"; reasons: string[] }` where the
reasons are every per-receipt rejection **plus**, when at least one receipt was
accepted, an `incomplete` reason naming the required jobs no accepted receipt
covers: `receipts do not cover every required job: missing "test" (contract
jobs: "build", "test")`. An empty receipt list is `satisfied` (the fallback —
no receipts means the verifier ran everything itself, and nothing to reject).
So a single `build` receipt under a two-job contract is rejected as incomplete,
which is precisely the hole a per-receipt check cannot see.

## 4. Reconciliation

`ReconciliationEvidence.verification?: VerificationContract` — optional and
additive so an older collector's evidence still classifies (falling back to the
default contract, which is exactly today's behaviour). `stableEvidence` copies
it. `receiptAssessmentRejections(evidence, mergedSha)` calls `assessReceiptSet`
with `evidence.verification ?? DEFAULT_VERIFICATION_CONTRACT`; both existing
`PROOF_RECEIPT_REJECTED` findings (PASS and FAIL routes) are otherwise
untouched, as is the `receiptNamesOtherMerge` precedence.
`collectReconciliationEvidence` in the MCP server sets
`verification: resolveDelivery(board).verification` — the host boundary reads
the board, core stays pure and store-free.

## 5. Skill changes (`kanmer-verify/SKILL.md`)

- Step 3 reads `get_status.delivery.integrationBranch` and
  `delivery.verification`, and builds
  `gh run list --workflow <workflow> --event <event> --commit <MERGED_SHA> …`
  from them. **Satisfied** requires the run's `headSha` to string-equal the
  merge SHA, the workflow and event to equal the contract's, and *every* job in
  `jobs` to be `completed`/`success`. One green job out of two is not satisfied.
- The PR-event rule stays and gets sharper: a `pull_request` run counts only
  when the contract's `event` is `pull_request` **and** the run's `head_sha`
  equals the merge SHA — which a squash merge never produces, so such a
  repository takes the fallback.
- The coverage rule becomes "the obligations the contract's jobs actually run",
  with Kanmer's own mapping (`verify` in `pr.yml` runs `VERIFY_STEPS`) as the
  worked example rather than the rule.
- Step 5's fallback is stated explicitly: no matching run at the exact merge
  SHA → every obligation `missing` → the designated verifier runs them in the
  detached worktree → the proof carries `receipts: []` (or no key) and a body
  sentence naming why there was no receipt. That is a normal, complete proof,
  not a degraded one.
- The "what is validated by code" section is rewritten against the contract.

## 6. Fallback test design

`packages/mcp-server/src/reconciliation.test.mjs` (real YAML → `proofEvidence`
→ `reconcileEvidence`, the same end-to-end path MCP-057's tests use):

1. **Fallback proof.** Evidence carrying `verification: { workflow: "ci.yml",
   jobs: ["build","test"], event: "push" }` and a valid schema-2 PASS at the
   merge SHA with `receipts: []` → no finding whose code starts with
   `PROOF_RECEIPT_`, and the identical `MOVE_TO_DONE` recommendation a
   receipt-bearing proof produces. Asserted against a receipt-bearing control
   in the same test, so "same recommendation" is proved, not assumed.
2. **Wrong workflow under that contract.** A well-formed `pr.yml`/`verify`
   receipt → `PROOF_RECEIPT_REJECTED` whose message names `ci.yml`.

Plus, in `packages/core/src/proof-receipts.test.ts`: the declared-contract
acceptance case, the incomplete-job-set case, and the `run_id`/`attempt`
validation rows. Every existing MCP-057/CORE-129 case runs unchanged under the
default contract — that is the back-compat proof.

## 7. Prose

`kanmer-setup/SKILL.md` gets the "declare your verification contract" block
with the explicit note that a workflow which does not run on pushes to the
integration branch will always take the fallback until the repository adds such
a run (renaming another repository's workflows is out of scope). `AGENTS.md` §4
board.yml example gains the block; `docs/manual/proof.md` stops saying
"push-to-`main` `verify` job" as a universal; FRD-006 states the contract is
read from the board; FRD-031 states the contract belongs to the delivery
policy. `npm run build:manual` regenerates the chapters;
`npm run plugin:build` rebuilds and commits the bundle.

## 8. Stop condition

Done when: `get_status.delivery.verification` reports the effective contract
and its source; `assessReceipt`/`assessReceiptSet` reject by contract with
messages naming the expected values, including the incomplete-job case;
reconciliation threads the board's contract through; the fallback proof yields
no `PROOF_RECEIPT_*` finding and the same recommendation; the skill and prose
name no workflow as universal; roster still 41; and the scoped checks
(`build` + `plugin:build` + stamp + `test:built`, `typecheck`, `check-browser`,
`smoke`, `golden`, `verify:skills`, `verify:docs`, `check:manual`) are green
with a clean `git status --short`. No merge, no self-review.
