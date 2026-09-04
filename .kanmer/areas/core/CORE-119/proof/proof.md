---
kind: proof-record
merged_sha: "04a977516fcb29500b5df2fd6aacea24e2e3d54e"
environment: "detached worktree .worktrees/verify-core-119-04a977516fcb29500b5df2fd6aacea24e2e3d54e on the Windows 11 workstation, Node 24, npm ci, default TMP"
verified_at: "2026-09-04T06:29:47Z"
result: PASS
attempts: []
---
# Proof — CORE-119 (command-log)

Verified on merged `main` at `04a977516fcb29500b5df2fd6aacea24e2e3d54e` (PR #318 squash merge, reviewer attestation `ae79e67e4815cc16` at head `b1a1eee1`) in a disposable detached worktree (detached, clean, exact SHA; not the board or an implementation worktree).

## Deterministic checks

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npm ci` | verify worktree | 0 | dependencies installed (`C:\kt-tmp\core119\npmci-merged.log`) |
| `npm run verify` (default `TMP`) | verify worktree | 0 | VERIFY_PASS (`C:\kt-tmp\core119\verify-merged.log`) |
| Hosted `verify` on the push to `main` at `04a97751` (run 33843422690) | GitHub Actions | — | HOSTED_PASS |

## Acceptance census (from the plan)

| Check | Evidence |
|---|---|
| AC1: `coverageGaps` empty; a gap is a startup exit 2; `npm run golden` prints `20/20 scenarios passed` with a transcript carrying every tool call and the FRD-035 counters | the rail's golden step at the merge SHA: `20/20 scenarios passed in 17865 ms (budget 300000 ms)`; reviewer's independent run 20/20 in 18 281 ms with counters identical to the author's (derived, not hard-coded) |
| AC2: GB-00 green, `--root` rejected, no `KANMER_ROOT` in any child env, `git -C .worktrees/kanmer status --porcelain` empty after a full rail run | reviewer called `assertDisposable` against the live board, the repo root and `~/.kanmer` (all refused); `--root` exit 2; board clean before and after; this rail ran with the live board untouched |
| AC3: `PROMOTION_STEPS` marks `backup`, `install-candidate`, `migrate-reconcile`, `workflow-acceptance` required; a missing required attempt is INCOMPLETE | `scripts/golden-promotion.test.mjs` in the rail's `test:scripts` (180/180); dry run 10 steps / 10 required, INCOMPLETE |
| AC4: a failed `rollback` is FAIL; retained non-terminal failures preserved; GB-19 evaluates the recorded v0.4.0 transcript PASS | same suite; reviewer spot-checked four recorded attempts against CORE-136's proof |
| AC5: `npm run golden` is a `VERIFY_STEPS` entry so hosted `verify` covers it; `kanmer-gate` green; one fresh exact-head review | hosted run 33842230661 at `b1a1eee1` (`verify` success 10m30s, `kanmer-gate` success); this proof's rail; one independent review, verdict pass |
| Edge cases: GB-16 `simulated` with injected evidence; missing `git` / `obsolete-after-change` → `unavailable` exit 1; GB-12 superseded attempt stays readable | transcript at the merge SHA: `simulated` confined to GB-16, 0 fail, 0 unavailable |

## Residual risk carried to CORE-137

Reviewer finding F-002 (minor, accepted): `driveCopiedBoard()` in `scripts/golden-promotion.mjs` spawns the `--launcher` server and calls `create_item` without binding that server to `--board-copy`; unreachable from CI and from `npm run golden`, but the operator-only live rehearsal must bind the launcher to the copied board explicitly before step 10d of CORE-137's plan.

## Result

**PASS** on the deterministic rail at the exact merge SHA (local with default TMP, and hosted); the acceptance census above is covered by the suites the rail runs.
