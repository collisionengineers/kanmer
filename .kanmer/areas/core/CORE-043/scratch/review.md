---
kind: review-attestation
pr: "168"
head_sha: "3957a1e67ab7d6ccd201a2b2bc1d272e9baf5d70"
base_sha: "fdaededcf8bff0c5d5867e386782d8bdc32324e9"
verdict: pass
reviewer: "codex-core041-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-23T23:45:00Z"
findings:
  - id: F-001
    summary: "CORE-043 protection-aware rename and lifecycle behavior survives the mainline merge."
    severity: blocker
    disposition: fixed
    reason: "The refreshed cumulative tree retains fail-closed protected-default rename behavior, serialized lifecycle operations, retained handoff state, and the CORE-026 source/board-sync integration."
  - id: F-002
    summary: "GUI lifecycle/provider remediation remains wired after refresh."
    severity: blocker
    disposition: fixed
    reason: "The cumulative GUI lifecycle, provider branch propagation, project-scoped Connect broadcasts, retry recovery, and native reconnect state are retained; GUI typecheck passes."
  - id: F-003
    summary: "Hosted verification is currently red on environment/procedure evidence."
    severity: major
    disposition: accepted-risk
    reason: "Run 32605945580 verify records one Windows store-test timeout (309/310) and kanmer-gate records the pre-refresh Verifying stage plus the prior invalid attestation syntax. The source merge itself is independently reviewed; a fresh hosted rerun is required after this board attestation and stage correction."
  - id: F-004
    summary: "Live GitHub protection and installed provider runtime proof remains unavailable."
    severity: minor
    disposition: accepted-risk
    reason: "No authorized live protection mutation, packaged/native provider host, or visual environment was available; no external PASS is claimed."
---

# Independent review — CORE-043 refreshed cumulative PR #168

Reviewed exact head `3957a1e67ab7d6ccd201a2b2bc1d272e9baf5d70` against merged CORE-026 mainline `fdaededcf8bff0c5d5867e386782d8bdc32324e9`. The merge conflict resolution preserves both cumulative feature sets: CORE-026 project-declared sources/board-sync and CORE-043 provider lifecycle/branch protection behavior.

Local evidence: GUI typecheck passed; no conflict markers remain; the refreshed commit is pushed to PR #168. Hosted run `32605945580` is preserved as failed evidence: verify reached 309/310 core tests before a Windows store test timeout, and kanmer-gate correctly rejected the board's stale Verifying stage and the previous invalid review disposition. Those procedural/environment failures are not claimed as source PASS; this attestation corrects the stage and uses only valid dispositions. A fresh hosted run is required before protected merge.

Live GitHub protection mutation, installed native/provider runtime behavior, packaged runtime, and visual evidence remain INCONCLUSIVE under ADR-0016/FRD-020.

---
kind: review-attestation
pr: "168"
head_sha: "3957a1e67ab7d6ccd201a2b2bc1d272e9baf5d70"
base_sha: "fdaededcf8bff0c5d5867e386782d8bdc32324e9"
verdict: needs-changes
reviewer: "codex-core041-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-23T00:00:06Z"
findings:
  - id: F-001
    summary: "Retry of a retained board root can select protected kanmer-board instead of the saved team-board setting."
    severity: blocker
    disposition: open
    reason: "Hosted verify run 32605945580 fails both index.sync.test.ts Retry cases (lines 380 and 447): expected branch team-board but received kanmer-board. The merged source retries with readSettings().kanmerBranch, while the test setup's no-open-board preference guard retains kanmer-board; the production caller then renames the retained team-board root back to the protected branch. Reconcile the CORE-026 saved-branch retry contract with CORE-043 no-board preference guarding and add a passing production-caller regression."
  - id: F-002
    summary: "Protected closed-project branch refusal returns an unpaused status."
    severity: major
    disposition: open
    reason: "Hosted verify run 32605945580 fails kanmerGit.test.ts line 805 in 'preserves the board root when rename succeeds before ignore reconciliation fails': ensureBoardWorktree returns available:false with paused:false after renameBoardBranch refuses the protected default. The retained board root is visible, but the refusal must be represented as paused so Retry/health state and the regression agree."
  - id: F-003
    summary: "External protection/native/packaged proof remains unavailable."
    severity: minor
    disposition: accepted-risk
    reason: "No authorized live GitHub protection mutation or installed native/packaged host was available; no external PASS is claimed. This is non-blocking only after F-001 and F-002 are fixed."
---

# Independent review — CORE-043 PR #168 exact refreshed head

Reviewed exact head `3957a1e67ab7d6ccd201a2b2bc1d272e9baf5d70` against `fdaededcf8bff0c5d5867e386782d8bdc32324e9`. The merge contains both CORE-026 project-declared source/cache/orphan board-sync code and CORE-043 protected-branch/provider lifecycle code; no conflict markers remain and the cumulative diff is limited to the expected source, tests, docs, workflow, and generated plugin/manual surfaces.

Deterministic local evidence: `npm run build:core` exit 0; syncBranch/syncTimer/syncLifecycle focused rail 11/11 PASS; GUI typecheck exit 0; `npm run verify:docs` PASS; `npm run check:manual` PASS; `npm run test:scripts` 89/89 PASS; `git diff --check fdaededc..3957a1e` PASS. The Git-heavy local rail was not treated as PASS because this linked worktree resolved the parent checkout's stale @kanmer/core dist; the clean hosted verify is authoritative for the source findings.

Hosted run `32605945580`: verify job `97110889714` failed with 3 GUI test failures (455/458 passed), exactly the F-001 two retained-root Retry branch mismatches and F-002 paused-state mismatch above. kanmer-gate job `97110889651` also failed on the board's current Verifying stage and the prior stale review record. These are preserved as evidence, not reclassified as PASS.

Verdict: NEEDS-CHANGES. Do not merge or move CORE-043; re-run hosted verify after F-001/F-002 are resolved. Live protection retargeting and native/packaged/visual proof remain INCONCLUSIVE under ADR-0016/FRD-020.
