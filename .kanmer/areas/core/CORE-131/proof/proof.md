---
kind: proof-record
merged_sha: "452159553bef03cf634bd5d6a2ffb6b9a9415de6"
environment: "detached worktree .worktrees/verify-core-131-45215955 at 452159553bef03cf634bd5d6a2ffb6b9a9415de6, own npm ci; Windows 11 Pro 10.0.26200, node v24.15.0, npm 11.14.1, git 2.54.0.windows.1"
verified_at: "2026-08-28T06:49:48Z"
result: PASS
attempts:
  - attempted_at: "2026-08-28T06:12:00Z"
    command: "gh pr view 301 --json state,mergeCommit,title,headRefName,baseRefName,mergedAt"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 452159553bef03cf634bd5d6a2ffb6b9a9415de6, head core-131-apply-reconciliation into main, merged 2026-08-28T06:09:02Z. Matches the binding fact exactly."
  - attempted_at: "2026-08-28T06:14:00Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-131-45215955 452159553bef03cf634bd5d6a2ffb6b9a9415de6"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Disposable verification worktree created at the exact merge SHA. No existing worktree reused or overwritten."
  - attempted_at: "2026-08-28T06:15:00Z"
    command: "git -C <wt> rev-parse HEAD; git -C <wt> symbolic-ref --short -q HEAD; git -C <wt> status --short --branch"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "HEAD = 452159553bef03cf634bd5d6a2ffb6b9a9415de6; symbolic-ref empty (detached); status clean (## HEAD (no branch)). Re-asserted clean after every build in this run."
  - attempted_at: "2026-08-28T06:24:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "Required: this ticket edits packages/core, and without its own node_modules the worktree resolves @kanmer/core to a stale sibling checkout."
  - attempted_at: "2026-08-28T06:52:00Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "core + mcp-server + standalone bundles built from the merge-SHA source."
  - attempted_at: "2026-08-28T06:56:00Z"
    command: "node --test C:/Users/Alex/AppData/Local/Temp/core131-verify/harness.mjs"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "Verifier's own independent harness, written for this verification and run against the shipped dist: 18/18. Covers F-015 with both controls, the six typed-routing classes plus two junk literals, the never default, the board worktree at BOTH layers with an expired claim, the backward-move authority ladder, AC4 on a real dirty git worktree, and confirmation of R-001, R-002 and R-004."
  - attempted_at: "2026-08-28T07:00:00Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "core, mcp-server, ui and gui all clean. This is what makes the `const exhaustive: never` default a real exhaustiveness guarantee."
  - attempted_at: "2026-08-28T07:02:00Z"
    command: "npm test -w @kanmer/core -- reconciliation"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "43/43 classifier tests, including the explicit refusal-ordering assertion."
  - attempted_at: "2026-08-28T07:04:00Z"
    command: "node --test packages/mcp-server/src/reconciliation.test.mjs"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "23/23 boundary tests, including the shipped F-015 regression and the AC4 byte-identical porcelain assertion."
  - attempted_at: "2026-08-28T07:07:00Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "338/338, including AC1's byte-identical dry-run regression, tools/list = 40, apply_reconciliation's annotations and exact input properties, and a real end-to-end apply through an MCP client."
  - attempted_at: "2026-08-28T07:10:00Z"
    command: "npm run smoke:protocol && npm run smoke:discovery && npm run smoke:headless"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "50/50 (40 tools on all four protocol revisions), 13/13, and headless all green."
  - attempted_at: "2026-08-28T07:14:00Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 40 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 40 tools."
  - attempted_at: "2026-08-28T07:16:00Z"
    command: "sha256sum plugins/kanmer/mcp/kanmer-mcp.cjs; npm run plugin:build; sha256sum plugins/kanmer/mcp/kanmer-mcp.cjs; git status --porcelain"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "Committed bundle is byte-identical to the verifier's own fresh build: b4ac801c0f91a86d2b5943acc851c0d11b91d065df7a289d066f2e97924e2369 before and after, and git status --porcelain is empty after regeneration."
  - attempted_at: "2026-08-28T07:20:00Z"
    command: "npm run verify:docs && npm run check:manual && npm run verify:skills && npm run verify:agents-block"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "verify-docs PASS (generated manual current), manual up to date (22 chapters), skills ALL CHECKS PASSED, agents-block 31/31."
  - attempted_at: "2026-08-28T07:39:00Z"
    command: "npm run mcpb:check"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "mcpb: check passed (3 files, 1722700 bytes)."
  - attempted_at: "2026-08-28T07:28:00Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 1
    result: FAIL
    summary: "FIRST FAILURE, KEPT. The fail-fast rail aborted at its `npm test` step: core 4 failed / 558 passed across 23 files. Failures were claims.test.ts (batch workspaces CORE-124) x2 and store.test.ts (blocks / order) x2, all `Test timed out in 5000ms` plus `ENOTEMPTY: directory not empty, rmdir C:\\...\\Temp\\kanmer-claims-uOpA24\\.kanmer`. No assertion reported a wrong value. Discharged below; the rail's later steps were each run individually and all exited 0."
  - attempted_at: "2026-08-28T07:40:00Z"
    command: "npm test -w @kanmer/core -- claims (isolated re-run 1)"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 1
    result: FAIL
    summary: "3 failed / 45 passed — a DIFFERENT failing set from the rail, including one test that had passed there. Same two error shapes only."
  - attempted_at: "2026-08-28T07:44:00Z"
    command: "npm test -w @kanmer/core -- claims (isolated re-run 2)"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 1
    result: FAIL
    summary: "1 failed / 47 passed — the failing set shrank again, to AC4 alone, with `Test timed out in 5000ms` and `ENOTEMPTY ... rmdir ...kanmer-claims-OzkLv9\\.kanmer`."
  - attempted_at: "2026-08-28T07:47:00Z"
    command: "npm test -w @kanmer/core -- store (isolated)"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 1
    result: FAIL
    summary: "1 failed / 84 passed, and it was a THIRD distinct test (`blocked flips off when the blocker reaches the last stage or is archived`), not either of the two the rail reported. Same 5s timeout + ENOTEMPTY rmdir signature."
  - attempted_at: "2026-08-28T07:50:00Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 1
    result: FAIL
    summary: "119/121. The sole two failures are scripts/antigravity-plugin-config.test.mjs — the shipped installer shim launching %LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd. This is CORE-128's known Windows failure and is off-limits to this verification; it touches nothing in this diff."
  - attempted_at: "2026-08-28T07:52:00Z"
    command: "git show 452159553bef... -- packages/core/src/store.ts | grep -c '^-[^-]'; git show --stat | grep -E 'claims.test|store.test'"
    cwd: ".worktrees/verify-core-131-45215955"
    exit_code: 0
    result: PASS
    summary: "Mechanism control: store.ts's diff deletes ZERO lines — two purely additive hunks (one import, one new method at line 1625). No existing code path was modified. claims.test.ts and store.test.ts are not in the changed-file set at all, and claims.test.ts contains no reference to reconciliation."
  - attempted_at: "2026-08-28T07:54:00Z"
    command: "gh api repos/collisionengineers/kanmer/commits/452159553bef03cf634bd5d6a2ffb6b9a9415de6/check-runs"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Hosted CI at the EXACT merge SHA: verify SUCCESS, regate SUCCESS, kanmer-gate skipped (run 33146971709). The authoritative rail is green on this commit."
---

# Proof — CORE-131 at `452159553bef03cf634bd5d6a2ffb6b9a9415de6`

Independent post-merge verification of `apply_reconciliation`, the apply half of
FRD-028. I did not write or review this code. Every judgement below is backed by
a command I ran myself in a disposable detached worktree at the exact GitHub
merge SHA, with its own `npm ci`. The mutable `main` checkout, `.worktrees/kanmer`,
`.worktrees/core-131`, `.worktrees/core-128` and `.worktrees/skill-036` were not
created, switched, written or removed.

**Result: PASS.**

## The F-015 regression, re-established independently with controls

CORE-113 died because `item.updated` was the only CAS token and `setDoc` never
bumps it, so a proof rewritten between collect and apply was invisible. I proved
this by execution against the shipped `dist`, not by reading the tests:

```
[F-015] stale=rev1:2aff2d7f8a1ce756  fresh=rev1:44fdf266e9a64316
        ticket-file-identical=true  code=REVISION_CONFLICT  audit-bytes=0
```

1. **The premise still bites.** After rewriting *only* `proof/proof.md` from PASS
   to FAIL, the entire ticket file is **byte-identical** — so `updated` did not
   move, and PR #286's `expectedUpdated` CAS would still be blind today.
2. **The revision does move**, `rev1:2aff2d7f8a1ce756` → `rev1:44fdf266e9a64316`,
   because it is document-inclusive.
3. **The stale apply is refused** `REVISION_CONFLICT`, the ticket is still in
   Verifying, and `scratch/execution` is still absent — **no audit line written
   on the refusal** (`audit-bytes=0`).

The refusal **discriminates**; it is not a blanket refusal that a naive test
would also pass:

- **Control A** — a *current* revision with a PASS proof still applies
  `MOVE_TO_DONE`, the ticket reaches Done, and exactly **one**
  `reconcile MOVE_TO_DONE by …; stage verifying → done; revision …` line is
  appended.
- **Control B** — a *fresh* revision with a FAIL/`implementation` proof applies
  the **new** route, `ROUTE_VERIFICATION_FAILURE` → Implementing, never the
  stale `MOVE_TO_DONE`.

**F-015 is genuinely closed.**

## Confirmed by execution, not by reading

| Claim | How I proved it | Result |
|---|---|---|
| **Exhaustiveness** | `ReconciliationAction` is a closed union of exactly six members; the dispatcher's default is `const exhaustive: never = input.action`; `npm run typecheck` clean across all four workspaces; calling the store verb with the out-of-union literal `NOT_A_REAL_ACTION` reaches the default | `Unknown reconciliation action: NOT_A_REAL_ACTION`, nothing mutated, no audit line |
| **Typed routing** (new decoder, no prior TS reader) | Six non-routing inputs driven end to end: **absent**, `inconclusive`, `transient`, the junk literal `banana-not-a-class`, the empty string, and the near-miss `Implementation-ish` | **All six** yield `recommendation: null`, the apply refuses `RECONCILIATION_INCONCLUSIVE`, the ticket stays in **Verifying** and no audit line is written. `implementation` → Implementing and `plan` → Preparing both route and apply |
| **No third backward-move authority** | Drove the full ladder as a non-`gui` actor | no reason → `BACKWARD_MOVE_NEEDS_REASON`; `reason: "reconcile: the bot says so"` → `REVIEW_RETURN_NEEDS_ATTESTATION`; only an `operator:` reason applies it. Ticket stayed in Review on both refusals. **No default reason in the new code begins `operator:`** — the only `operator:` occurrence in `applyReconciliation` is a comment explaining why one is never synthesised |
| **AC4, no destruction** | A **real** `git worktree` with two real untracked files, the claim **aged on disk** (`claim_expires_at` rewritten in the ticket file) rather than via an injected clock, so `transferTicket`'s own real-time expiry check is exercised | `git status --porcelain` **byte-identical** before and after (`?? sub/`, `?? wip.txt`), `ls-files --others` identical, both file contents intact, `taken_at`, `branch` and `worktree` unchanged, controller `ctl-a` → `ctl-b`, one audit line |
| **Board worktree at BOTH layers** | Layer 1 through the classifier; layer 2 by calling `store.applyReconciliation` directly with `RECOVER_EXPIRED_CLAIM`, **with the claim aged to expired** so `CLAIM_LIVE` cannot mask it | Layer 1: `BOARD_WORKTREE_PROTECTED` is the first finding, `recommendation: null`, apply refuses `RECONCILIATION_INCONCLUSIVE`. Layer 2: `RECOVERY_REFUSED`, and I asserted the message does **not** contain `CLAIM_LIVE`. Item byte-identical |
| **Roster 39 → 40** | `grep -c 'server.registerTool('` in `index.ts` = **40**; `plugin:check` isolated MCP handshake = 40; `smoke.mjs` tools/list = 40; `smoke-protocol.mjs` = 40 on four protocol revisions | All nine sites moved (AGENTS.md §4 and §8 item 19, new §8 item 21, `docs/manual/connect.md`, `chapters.generated.ts`, `smoke.mjs` count + roster list, `smoke-protocol.mjs` message + predicate, `tool-reference.md`, the bundle). Repo-wide grep for `"39 tools"` finds **nothing** |
| **Plugin bundle** | `sha256sum` before, `npm run plugin:build`, `sha256sum` after | **Byte-identical to my own fresh build**: `b4ac801c0f91a86d2b5943acc851c0d11b91d065df7a289d066f2e97924e2369`, and `git status --porcelain` empty afterwards |

## FRD-028, criterion by criterion

| AC | Requirement | Verdict | Evidence |
|---|---|---|---|
| **1** | Dry run returns evidence and a proposed action without changing board, Git or workspace state | **Not regressed** | `smoke.mjs` 338/338 includes CORE-122's byte-identical dry-run assertion and `reconcile_ticket`'s `readOnlyHint: true`; boundary suite's "reconcile_ticket is a dry run" passes |
| **2** | Apply corrects only a still-current action and records an audit entry; a changed revision returns a structured conflict | **Met** | Three ordered refusals confirmed by execution: `RECONCILIATION_INCONCLUSIVE`, `REVISION_CONFLICT`, `RECONCILIATION_DRIFT`. The durable audit is the committed `## Transitions` line — I saw exactly one per applied action, naming action, actor, stage-or-controller change and revision — and **zero** lines on every refusal path |
| **3** | Merged Review, PASS Verifying, plan/implementation verification failures and abandoned claims route to their correct stages | **Met, with one known gap** | Merged Review → Verifying, PASS → Done, closed-unmerged → Implementing, `implementation` → Implementing, `plan` → Preparing all applied from real evidence; abandoned claims recover for clean and dirty workspaces. **Gap: R-001** — an abandoned claim with a missing or unrecorded workspace does not route. Confirmed, not a new finding, owner CORE-133 |
| **4** | Dirty expired workspace preserved and reported; cleanup only for a terminal, clean, explicitly authorised target | **Met** | Porcelain byte-identical over a real dirty worktree (above). `RELEASE_CLEAN_TERMINAL_CLAIM` is gated on `done` + `clean` + `matches-claim` and releases the **claim**, never the worktree; the store dispatcher re-asserts each precondition before any verb is reached |
| **5** | Board-worktree protection, required checks and immutable release evidence intact in every recovery path | **Not regressed** | `BOARD_WORKTREE_PROTECTED` and `RELEASE_EVIDENCE_PRESERVED` still return before any recommendation is formed; failing/pending required checks still stop the non-Review routes; `release.state` still hard-coded `not-applicable`. A grep of the whole diff for `--force`, `push --force`, `rm -rf`, `worktree remove`, `branch -D` or check bypass finds **only prose asserting their absence** — no such operation was added |

## Discharging the local rail's exit 1

`npm run verify` exited **1**, aborting at `npm test`: 4 failed / 558 passed, in
`claims.test.ts` (batch workspaces, CORE-124) and `store.test.ts` (blocks /
order). This is **not** a regression from this change:

1. **Same-SHA re-runs, and the failing identity changes every time.** Four runs
   of identical commands at the identical SHA produced four *different* failing
   sets: rail 4 (claims ×2 + store ×2) → claims isolated 3 → claims isolated 1 →
   store isolated 1, and the store failure was a third distinct test that the
   rail had reported as passing. A deterministic regression cannot vary.
2. **Diff-untouched.** Neither `claims.test.ts` nor `store.test.ts` is in the
   15-file changed set, and `claims.test.ts` contains no reference to
   reconciliation at all.
3. **Mechanism.** No assertion ever reported a wrong value. Every failure is one
   of exactly two shapes: vitest's 5 s per-test timeout, and
   `ENOTEMPTY: directory not empty, rmdir C:\...\Temp\kanmer-*\...` — a Windows
   temp-directory teardown race in which a briefly-held handle makes the
   recursive remove fail and the hook overrun the 5 s budget. Decisively,
   `packages/core/src/store.ts`'s diff **deletes zero lines**: it is two purely
   additive hunks (one import, one new method). No existing ordering, blocking
   or batch code path was modified, so a behavioural regression in these suites
   is mechanically impossible from this diff.
4. **Hosted CI is green on this exact commit.** Run 33146971709 at
   `452159553bef03cf634bd5d6a2ffb6b9a9415de6`: `verify` **SUCCESS**, `regate`
   **SUCCESS**, `kanmer-gate` skipped. The same `npm test` step passes on the CI
   platform, which is what identifies this as a Windows-host defect.

`npm run test:scripts` exited 1 at 119/121 with the two known
`scripts/antigravity-plugin-config.test.mjs` failures — CORE-128's, off-limits,
and unrelated to any file in this diff. Because the rail is fail-fast, every step
it never reached was run individually and **all exited 0**.

## Known findings — confirmed, not grounds for failure

- **R-001 (major, → CORE-133).** Confirmed by execution. `workspaceEvidence`
  emits `state: "missing"` together with `claimIdentity: "unavailable"`, while
  the `RECOVER_EXPIRED_CLAIM` guard demands `matches-claim | not-applicable` —
  so the guard's `"missing"` arm is **dead code**, and an unrecorded workspace
  (`not-recorded`) is outside the allowed state set too. It **fails closed**: the
  dry run still diagnoses (`WORKSPACE_MISSING|CLAIM_EXPIRED`), the apply refuses
  `RECONCILIATION_INCONCLUSIVE`, and the operator falls back to
  `take_ticket action: "transfer"` at the same authority. The one gap in AC3.
- **R-002 (minor, → CORE-133).** Confirmed: with a proof naming a wrong merge
  SHA, the PASS path refuses `PROOF_MERGE_SHA_MISMATCH` while the FAIL path still
  returns `ROUTE_VERIFICATION_FAILURE`. The asymmetry is real.
- **R-004 (minor, accepted).** Confirmed: `index.ts:957` still asserts
  "there is no apply surface", which is now false, and it ships in the bundle.
- **R-003, R-005, R-006, R-007, R-009** all re-read and consistent with the
  review. R-007 confirmed from the boundary's refusal order (no-recommendation
  is checked before the revision comparison). R-009 confirmed: the shipped test
  at `reconciliation.test.mjs:615` uses a **live** claim, so its
  `/CLAIM_LIVE|RECOVERY_REFUSED/` alternation can only ever match `CLAIM_LIVE`
  and never reaches layer 2 — which is precisely why I exercised layer 2 myself
  with an expired claim.

I looked for a blocker or major the review missed and found none. Nothing in
this change can delete work, bypass a required check, widen an authority, add a
stage, or mutate `.worktrees/kanmer`.
