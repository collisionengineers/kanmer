---
kind: proof-record
schema: 2
merged_sha: "4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d"
environment: "detached verification worktree .worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d, Windows 11 / Git Bash, Node 24"
verified_at: "2026-09-05T17:03:12Z"
result: PASS
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33976030780
    attempt: 1
    head_sha: "4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33976030780"
    covers: ["npm run verify (VERIFY_STEPS)"]
    observed_by: "kanmer-verify (CORE-147)"
attempts:
  - attempted_at: "2026-09-05T15:47:12Z"
    exit_code: null
    result: INCONCLUSIVE
    authority: supporting
    failure_class: inconclusive
    summary: "get_status.delivery.verification / verificationSource are not reported by the installed 0.4.1 packaged control plane (sha256 3f7af329), a known stale-control-plane condition already recorded on the board (F-007 in scratch/review.md). Used the shipped default contract { workflow: pr.yml, jobs: [verify], event: push } per the merge-SHA SKILL.md's own stated fallback ('on Kanmer's own board that contract is the default'), which is also the contract Kanmer's own board.yml declares (no delivery.verification block present)."
  - attempted_at: "2026-09-05T15:50:48Z"
    command: "gh run list --workflow pr.yml --event push --commit 4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt; gh run watch 33976030780 --exit-status; gh run view 33976030780 --json jobs,conclusion,status,headSha,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "Run 33976030780 (attempt 1) triggered by the board write's push to main. Job `verify` completed/success in 8m49s; headSha 4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d equals merged_sha; event push equals contract event; workflow pr.yml equals contract workflow. All contract jobs (verify) satisfied -> receipt recorded above. Sibling job `kanmer-gate` was skipped (PR-triggered gate, not part of the declared verification contract job set) and `regate` succeeded."
  - attempted_at: "2026-09-05T16:47:03Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d 4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "Detached worktree created at exact merge SHA. rev-parse HEAD == 4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d; symbolic-ref --short -q HEAD exits 1 (detached); status --short --branch clean (## HEAD (no branch))."
  - attempted_at: "2026-09-05T16:48:10Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "647 packages installed, audited 652; no install-time errors (16 pre-existing audit advisories, unrelated to this change)."
  - attempted_at: "2026-09-05T16:49:40Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "Core, mcp-server (ESM + CJS standalone bundles) built clean; no TypeScript or bundler errors."
  - attempted_at: "2026-09-05T17:00:44Z"
    command: "npx vitest run src/proof-receipts.test.ts src/board.test.ts"
    cwd: ".worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d/packages/core"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "2 files, 59 tests passed (proof-receipts.test.ts 36, board.test.ts 23) — covers declared-contract acceptance/rejection, run_id/attempt validation, assessReceiptSet coverage cases, default/declared delivery resolution and source reporting."
  - attempted_at: "2026-09-05T17:01:20Z"
    command: "node --test packages/mcp-server/src/reconciliation.test.mjs"
    cwd: ".worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "55/55 node:test cases passed, including the contract-bound PROOF_RECEIPT_REJECTED and fallback MOVE_TO_DONE rows described in the plan/post-implementation-report."
  - attempted_at: "2026-09-05T17:03:12Z"
    command: "node -e \"…\" against packages/core/dist/index.js (decisive product check: resolveDelivery + deliveryPolicySource/deliveryVerificationSource + assessReceiptSet on an in-memory board copy)"
    cwd: ".worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d/packages/core"
    exit_code: 0
    result: PASS
    authority: authoritative
    summary: "Against the built core: (a) a board with delivery.integrationBranch=dev and delivery.verification={workflow:ci.yml,jobs:[build,test],event:push} resolves via resolveDelivery/deliveryPolicySource/deliveryVerificationSource to integrationBranch dev, verification {ci.yml,[build,test],push}, source board, verificationSource board. (b) assessReceiptSet([], {mergedSha, contract}) returns {kind:'satisfied'} — the empty-receipt fallback holds under a declared contract, matching the golden GB-11/proof-receipts.test.ts assertions. (c) A pr.yml/verify receipt (the exact receipt shape recorded above from run 33976030780) assessed against that ci.yml/[build,test] contract is rejected: reasons ['receipt job must be one of \\\"build\\\", \\\"test\\\", got \\\"verify\\\"', 'receipt workflow must be \\\"ci.yml\\\", got \\\"pr.yml\\\"'] — names the contract's ci.yml exactly as required. All three checks passed (ALL_PASS: true, script exit 0)."
---

# Proof — CORE-147

**Result: PASS.**

## Merge identity

`gh pr view 330 --json state,mergeCommit,url` returned `state: MERGED`,
`mergeCommit.oid: 4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d`,
`url: https://github.com/collisionengineers/kanmer/pull/330`. This is the
exact SHA used throughout this proof.

## Contract lookup (step 3 of the merge-SHA `kanmer-verify/SKILL.md`)

The live control plane answering this session is 0.4.1 packaged
(sha256 3f7af329d5e634f4d90cf4aa65cea53f72c1b92117e5307329a9bd31d63c9d90) and
`get_status.delivery` does **not** report `verification`/`verificationSource`
— it exposes only `{ integrationBranch: main, releaseBranch: main,
releaseCandidatePattern: null, hotfixBackport: true, source: default }`. This
is the expected stale-control-plane condition already named in this ticket's
own review record (scratch/review.md F-007): the new field is exercised by
the shipped code and its own test suite (built worktree, see below), but is
not yet observable through the installed MCP host. Per the merge-SHA
`SKILL.md`'s own words, "on Kanmer's own board that contract is the default
(`pr.yml`, job `verify`, event `push`)" — and Kanmer's own `.kanmer/board.yml`
carries no `delivery.verification` block (confirmed by the plan/report: the
default resolved contract *is* Kanmer's policy). So the lookup used
`workflow: pr.yml`, `jobs: [verify]`, `event: push` — the shipped default,
stated here explicitly rather than assumed.

## Receipt

`gh run list --workflow pr.yml --event push --commit
4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d` found run `33976030780`, initially
`in_progress` (the board-move push had just triggered it). Waited once with
`gh run watch 33976030780 --exit-status` (exit 0). Final state: job `verify`
completed/success in 8m49s, `headSha` equal to the merge SHA, event `push`,
workflow `pr.yml` — every contract job (`verify`) is `completed`/`success`.
**Satisfied.** Recorded as the single `receipts:` entry above; per the skill,
a fully satisfied receipt needs no new full run.

## Extra local evidence in the detached worktree

Because the installed control plane cannot itself confirm the ticket's core
acceptance criteria (`resolveDelivery`, `deliveryPolicySource`,
`deliveryVerificationSource`, `assessReceiptSet` reading a declared,
non-default contract), this proof additionally exercises the shipped change
directly against the built artefact in a disposable detached worktree at the
exact merge SHA (`.worktrees/verify-core-147-4a1c3a235ccd9f5bfd8ef8ccee18959a15c0fa5d`,
confirmed detached/clean/exact-SHA). `npm ci` and `npm run build` succeeded;
`npx vitest run src/proof-receipts.test.ts src/board.test.ts` in
`packages/core` passed 59/59; `node --test
packages/mcp-server/src/reconciliation.test.mjs` passed 55/55; and the
decisive product check (final authoritative attempt above) proved, against
`packages/core/dist/index.js`:

1. `resolveDelivery` on a board copy with `delivery.integrationBranch: "dev"`
   and `delivery.verification: { workflow: "ci.yml", jobs: ["build","test"],
   event: "push" }` resolves with `source: "board"` and
   `verificationSource: "board"`, carrying the declared `dev` branch and
   `ci.yml`/`[build,test]`/`push` contract through unchanged.
2. `assessReceiptSet([], { mergedSha, contract })` under that same declared
   contract is `{ kind: "satisfied" }` — the empty-receipt fallback is not a
   default-contract-only behaviour.
3. The `pr.yml`/`verify` receipt this proof itself recorded from run
   `33976030780`, assessed against the `ci.yml`/`[build,test]` contract, is
   `rejected`, naming `ci.yml` and `"build", "test"` explicitly in the
   reasons — a receipt genuine and green under Kanmer's own contract is
   correctly refused under a different project's declared contract.

All local commands are supporting evidence beside the authoritative hosted
receipt; the final authoritative attempt (the decisive product check) is
itself a PASS, consistent with the top-level result.

## Verdict

Top-level `result: PASS`. No `failure_class` (only non-PASS records carry
one). This authorises the `verifying` → `done` move.
