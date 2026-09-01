---
kind: proof-record
merged_sha: "a744fd7694b2de6c134e54a236aeede9fbb4e8f3"
environment: "Disposable detached worktree .worktrees/verify-CORE-127 at a744fd7694b2de6c134e54a236aeede9fbb4e8f3 (detached HEAD, clean at creation, own `npm ci` node_modules) — Windows 11 Pro 10.0.26200, Node v24.15.0, npm workspace kanmer@0.3.12"
verified_at: "2026-09-01T20:25:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-01T19:43:50Z"
    command: "git fetch origin && git merge-base --is-ancestor a744fd7694b2de6c134e54a236aeede9fbb4e8f3 origin/main"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "origin/main resolves to a744fd7694b2de6c134e54a236aeede9fbb4e8f3; the merge SHA is an ancestor of origin/main. Subject: 'Detect forbidden-file changes, stale evidence and plan deviation before the next step packet (CORE-127) (#307)'."
  - attempted_at: "2026-09-01T19:43:58Z"
    command: "git worktree add --detach .worktrees/verify-CORE-127 a744fd7694b2de6c134e54a236aeede9fbb4e8f3 && git -C .worktrees/verify-CORE-127 rev-parse HEAD && git -C .worktrees/verify-CORE-127 symbolic-ref --short -q HEAD && git -C .worktrees/verify-CORE-127 status --short --branch"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "rev-parse HEAD = a744fd7694b2de6c134e54a236aeede9fbb4e8f3; symbolic-ref empty (exit 1, detached); status '## HEAD (no branch)' with no entries. Neither .worktrees/kanmer nor .worktrees/core-127 was touched; no branch was checked out, reset or pulled."
  - attempted_at: "2026-09-01T19:44:14Z"
    command: "npm ci"
    cwd: ".worktrees/verify-CORE-127"
    exit_code: 0
    result: PASS
    summary: "647 packages added, 652 audited, 16.9s. Deprecation and audit warnings only; no install error."
  - attempted_at: "2026-09-01T19:44:38Z"
    command: "npm run verify (first attempt, killed by the verifier's own 10-minute tool cap)"
    cwd: ".worktrees/verify-CORE-127"
    exit_code: 143
    result: INCONCLUSIVE
    summary: "Attempt retained for completeness. Exit 143 is SIGTERM from the verification harness's 600 s foreground command cap, not a test result — the rail needs ~13 minutes on this host. No suite reported a failure before the kill. Re-run detached below."
  - attempted_at: "2026-09-01T19:54:46Z"
    command: "npm run verify (detached, logged to verify-core127-a744fd76.log)"
    cwd: ".worktrees/verify-CORE-127"
    exit_code: 0
    result: PASS
    summary: "Exit 0 in 12m52.607s wall (19:54:46Z-20:07:39Z). Per-suite totals: build (ESM+CJS standalone) OK; @kanmer/core 24 test files / 826 passed / 0 failed (144.90s); GUI 54 test files / 524 passed / 0 failed (267.11s); mcp-server test:http pass 236 / fail 0 / skipped 1 (the documented 'clean executable-bit change hidden by core.fileMode=false' Windows stat skip); test:scripts pass 161 / fail 0 / skipped 0; typecheck across core, mcp-server, ui, gui clean; verify:docs PASS; MCP stdio smoke 381/381; smoke:headless 6/6 PASS; mcpb:check 3 files / 1787134 bytes PASS; smoke:protocol 50/50; smoke:discovery 13/13; verify:skills ALL CHECKS PASSED (including the step-packet/2 and constrained-reconciliation prose pins); verify:agents-block 31/31; plugin:check 'plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 41 tools'. No Windows timing flake (store/claims/docs 5 s timeout, teardown ENOTEMPTY, antigravity EBUSY) occurred; no flake-rule re-run was required."
  - attempted_at: "2026-09-01T20:16:51Z"
    command: "KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-CORE-127"
    exit_code: 0
    result: PASS
    summary: "381/381 checks passed in 52 s against the committed plugin bundle at this SHA (not the workspace build)."
  - attempted_at: "2026-09-01T20:17:47Z"
    command: "KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke-protocol.mjs"
    cwd: ".worktrees/verify-CORE-127"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed in 3 s against the committed plugin bundle at this SHA."
  - attempted_at: "2026-09-01T20:17:55Z"
    command: "node --test packages/mcp-server/src/step-reconciliation.test.mjs packages/mcp-server/src/reconciliation.test.mjs"
    cwd: ".worktrees/verify-CORE-127"
    exit_code: 0
    result: PASS
    summary: "tests 92, pass 91, fail 0, skipped 1, duration 110.1 s. The single skip is the declared Windows stat limitation ('a clean executable-bit change hidden by core.fileMode=false is refused — Windows does not expose a stable executable bit through Node stat'), not a suppressed assertion. All six acceptance-mapped named tests passed; see the mapping in the body."
  - attempted_at: "2026-09-01T20:21:44Z"
    command: "npm exec --workspace @kanmer/core -- vitest run src/step-packet.test.ts --no-file-parallelism --reporter=verbose"
    cwd: ".worktrees/verify-CORE-127"
    exit_code: 0
    result: PASS
    summary: "1 test file, 61 passed / 0 failed, 1.13 s. Includes the four acceptance-mapped reconcileStepPacket cases named in the body."
  - attempted_at: "2026-09-01T20:12:00Z"
    command: "gh run list --branch main --limit 8 && gh run view 33551121824"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Hosted push-to-main run 33551121824 ('Pull request verification', event push, headSha a744fd7694b2de6c134e54a236aeede9fbb4e8f3, created 2026-09-01T19:43:02Z) completed with conclusion success; jobs regate=success, verify=success, kanmer-gate=skipped (post-merge push, no PR context). A second workflow_dispatch run at the same SHA, 33551247107, is also success. https://github.com/collisionengineers/kanmer/actions/runs/33551121824"
---

# Proof record — CORE-127 at `a744fd7694b2de6c134e54a236aeede9fbb4e8f3`

Independent exact-merge verification by `claude-opus-verify-core127-a744fd76`. I did
not plan, implement, review or merge this ticket.

## What was verified

PR #307 was squash-merged to `main` as `a744fd7694b2de6c134e54a236aeede9fbb4e8f3` at
2026-09-01T19:42:59Z. Verification ran in a disposable detached worktree,
`.worktrees/verify-CORE-127`, created directly at that full SHA from the source
repository. `rev-parse HEAD` matched the merge SHA exactly, `symbolic-ref --short -q HEAD`
was empty (detached), `status --short --branch` reported `## HEAD (no branch)` with no
entries, and `git merge-base --is-ancestor a744fd76 origin/main` succeeded. The board
worktree `.worktrees/kanmer` and the implementation worktree `.worktrees/core-127` were
never passed to a Git command; no branch was checked out, reset, pulled or merged, and
no source file was edited. Only untracked verification log files
(`verify-core127-a744fd76.log*`, `focused-*-a744fd76.log`) were produced inside the
disposable worktree.

The authoritative rail `npm run verify` passed at exit 0 in 12m52.607s with no failing
suite and no flake, so the Windows timing-flake discharge rule (`CORE-128`) was not
needed and no re-run was performed. Both MCP smokes were additionally run against the
**committed plugin bundle** at this SHA (`KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`)
rather than the workspace build, and both passed. The hosted push-to-main `verify` at the
merge SHA is green.

The change at this SHA is 22 files, +11496/−893 against the pre-merge tip `4fda54b4`.

## Acceptance check → test mapping

The ticket's three `## Verification` boxes are proved by named merged tests that I ran
myself at this SHA, not by prose.

**(a) A fixture worktree that touches a file outside the packet's allowed list produces a
forbidden/undeclared finding, and one that stays inside does not.**

| Test | File | Result |
|---|---|---|
| `fails forbidden and undeclared changes with typed paths` | `packages/core/src/step-packet.test.ts` | pass — asserts `changedPaths` is exactly `[{src/vendor/bundle.js, forbidden}, {README.md, undeclared}]` and `status === "fail"` |
| `packet-aware reconcile_ticket fails a forbidden path committed and later reverted` | `packages/mcp-server/src/reconciliation.test.mjs` | pass — real Git fixture; `STEP_PATH_FORBIDDEN` with `path === "forbidden/transient.txt"` even though `git diff --name-only <baseline> HEAD` is empty at the endpoint |
| `packet-aware reconcile_ticket classifies actual allowed changes and writes no board byte` | `packages/mcp-server/src/reconciliation.test.mjs` | pass — the negative half: an in-scope edit to `tracked.txt` yields `step.status === "pass"` and `changedPaths === [{tracked.txt, allowed}]`, i.e. **no** forbidden/undeclared finding |
| `derives another change to a pre-dirty path from entry identities` | `packages/core/src/step-packet.test.ts` | pass — a path already dirty at issuance and changed again still classifies `allowed` |
| `an unticked selected step` / `a later step marker` / `a checklist text deviation` `does not suppress actual workspace classification` (3 tests) | `packages/mcp-server/src/reconciliation.test.mjs` | pass — `STEP_PATH_UNDECLARED` for `undeclared.txt` survives every checklist-side failure |

**(b) A packet whose recorded plan version no longer matches the live document is reported
as stale before another step advances.**

| Test | File | Result |
|---|---|---|
| `fails independently stale plan, evidence and checklist deviation` | `packages/core/src/step-packet.test.ts` | pass — a single reconcile emits `STEP_PLAN_STALE`, `STEP_EVIDENCE_STALE`, `STEP_NOT_COMPLETED` **and** `STEP_LATER_ADVANCED` together; the stale plan is reported in the same result that refuses the advance |
| `post-issuance plan drift retains undeclared workspace evidence` | `packages/mcp-server/src/reconciliation.test.mjs` | pass — live `plan` document edited after issuance yields `STEP_PLAN_STALE` from the real store, with the workspace finding retained (the F-026 ordering fix) |
| `a later step marker does not suppress actual workspace classification` | `packages/mcp-server/src/reconciliation.test.mjs` | pass — ticking `Step 2` raises `STEP_LATER_ADVANCED`, so a later step cannot advance past an unreconciled packet |
| `fails stale authority and revision when an unknown YAML timestamp changes beside the exact checklist tick` | `packages/core/src/step-packet.test.ts` | pass — the "exact tick masks a mutation" bypass is closed (`STEP_TICKET_AUTHORITY_STALE` + `STEP_TICKET_REVISION_STALE`), and the same packet against unchanged facts still returns `pass` |

**(c) An unreadable or absent workspace is inconclusive, not a false pass, and the
inspector writes nothing.**

| Test | File | Result |
|---|---|---|
| `is inconclusive when workspace or evidence cannot be read` | `packages/core/src/step-packet.test.ts` | pass — `workspace: null, evidence: null` ⇒ `status === "inconclusive"` |
| `missing workspace evidence is inconclusive rather than PASS` | `packages/mcp-server/src/reconciliation.test.mjs` | pass — the recorded worktree is renamed away; result is `inconclusive` with `STEP_WORKSPACE_UNAVAILABLE`, never `pass` |
| `missing, branch-mismatched and malformed output are inconclusive` | `packages/mcp-server/src/step-reconciliation.test.mjs` | pass |
| `timeout and content-budget overflow are inconclusive` / `the aggregate deadline is enforced inside the non-Git regular-file census` | `packages/mcp-server/src/step-reconciliation.test.mjs` | pass — exhausted budgets are inconclusive, not a fabricated pass |
| `detached, foreign, board, symlink and parent-link workspaces fail closed` | `packages/mcp-server/src/step-reconciliation.test.mjs` | pass |
| `packet-aware reconcile_ticket classifies actual allowed changes and writes no board byte` | `packages/mcp-server/src/reconciliation.test.mjs` | pass — carries the **writes-nothing** half: a byte digest of the whole `.kanmer` tree is taken before the call and asserted identical after |
| `reconcile_ticket is a dry run: the store is unchanged and the claim block follows the bootstrap contract` | `packages/mcp-server/src/reconciliation.test.mjs` | pass — the pre-existing read-only contract still holds with the packet-aware mode added |

Focused-suite totals at this SHA: `step-packet.test.ts` 61 passed / 0 failed;
`step-reconciliation.test.mjs` + `reconciliation.test.mjs` 92 tests, 91 pass / 0 fail /
1 skipped. The one skip is declared and platform-bound —
`a clean executable-bit change hidden by core.fileMode=false is refused`, skipped with the
reason "Windows does not expose a stable executable bit through Node stat" — and the same
property is covered on this host by `physical executable authority agrees with Git index
mode where the platform represents it`, which passed.

## Hosted verification

Hosted run **33551121824** — workflow "Pull request verification", event `push`,
`headSha` `a744fd7694b2de6c134e54a236aeede9fbb4e8f3`, created 2026-09-01T19:43:02Z —
completed with conclusion **success** (`regate` success, `verify` success, `kanmer-gate`
skipped as expected for a post-merge push with no PR context).
<https://github.com/collisionengineers/kanmer/actions/runs/33551121824>. An additional
`workflow_dispatch` run at the same SHA, 33551247107, is also **success**. No run at this
SHA is red.

## Residual risk carried from the review

The delta review attestation at `171c3697413461d127d90909820d6aa7b8c61f93`
(`claude-opus-delta-review-core127-171c3697`, verdict `pass`) records two open minor
findings, both `accepted-risk`, and I carry them forward unchanged:

- **F-038 (minor)** — `classifyPlanPath` now promotes any bare single-token backticked
  span in `## Do not modify` to a forbidden path, so descriptive prose such as `` `gates` ``
  yields forbidden paths the governing docs do not describe.
- **F-039 (minor)** — `collectPathIssues` validates every `## Do not modify` code span with
  `parsePlanPath`, so a colon-qualified symbol such as `Foo::bar` raises a
  blocker-severity `PLAN_PATH_INVALID` when a step is selected. The review proved by diff
  that this is pre-existing (zero hunks in `4bca89aa..171c3697` touch `collectPathIssues`)
  and not a regression from F-037.

Both belong to one **path-grammar / `## Do not modify` span-grammar** root-cause class,
and both are fail-safe in direction: they can only over-restrict a plan into a visible
typed finding, never authorise an unreviewed change. Under the HZN-008 root-cause rule the
class is recorded once for a **follow-up documentation decision** (one governing-doc
sentence, and optionally reusing `classifyPlanPath` inside `collectPathIssues`) rather than
patched per example inside a spent budget. CORE-127's own `## Do not modify` section
contains no colon-qualified span, so neither finding affects this ticket's acceptance.
Two further deliberate strictnesses are noted and documented in AGENTS.md and three skills:
the intervening-history check refuses **every** `120000`/`160000` mode (resolving to
INCONCLUSIVE rather than a false PASS), and structured-step parsing requires the exact
`### Step N — <title>` em-dash level-three form, degrading visibly to
`PLAN_STEP_UNSTRUCTURED` rather than silently.

The ticket carried `review_round: 1` of `remediation_budget: 1` — one budgeted remediation
batch (commit `171c3697`, +119/−10 across five files, all inside the plan's Expected files),
which fixed F-035 and F-037 and soundly rejected F-036 with reasons pinned by existing tests.

## Decision

**PASS.** The authoritative `npm run verify` rail exits 0 at the exact merge SHA in a clean
detached worktree with its own dependency install; both MCP smokes exit 0 against the
committed plugin bundle at that SHA; all three ticket acceptance checks are proved by named
merged tests that were executed here, including the negative and writes-nothing halves; and
the hosted push-to-main `verify` at `a744fd76` is green. No check was unavailable, no result
was assumed, and no failing attempt was erased. Residual risk is two fail-safe minors in one
recorded path-grammar class with a documentation follow-up.

Verified by `claude-opus-verify-core127-a744fd76`. This record writes no board move; the
Verifying → Done transition and Git cleanup remain controller and closeout work.
