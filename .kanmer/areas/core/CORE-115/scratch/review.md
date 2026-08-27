---
kind: review-attestation
pr: "293"
head_sha: "80cdb6e41ec12bb3c497aafeb78589c900f5bad4"
verdict: needs-changes
reviewer: "claude-core115-independent-reviewer"
independent: true
plan_hash: "bfb340758cafe577"
ticket_updated: "2026-08-27T20:00:21.860Z"
board_sha: "4f2a4f0b25ce08771081e31000d291de6f3b6074"
threads_snapshot:
  total: 0
  unresolved: 0
  github_thread_ids: []
attestation_version: 1
findings:
  - id: F-001
    severity: major
    summary: "Lease lock covers only the four lease verbs; updateItem/moveItem (CORE-121 backward-move) and expected_revision CAS paths still write the ticket file unlocked and can clobber a lease write (store.ts:1095-1097, 1173, 1245, 1277, 1370 vs. unlocked moveItem ~:939)."
    disposition: deferred-to-ticket
    ticket: CORE-125
  - id: F-002
    severity: major
    summary: "PR is CONFLICTING against current main (e903289e, MCP-054): content conflict in AGENTS.md (both sides edit the tool-count/§8 region); index.ts, smoke.mjs, tool-reference.md and the plugin bundle auto-merge textually. Requires a rebase; the bundle must be rebuilt (a textual merge of kanmer-mcp.cjs is not a valid artefact) and the 38-tool count in AGENTS.md:411, smoke.mjs:62, plugin:check output and docs must become 39 on the rebased branch."
    disposition: open
  - id: F-003
    severity: blocker
    summary: "No workflow run exists for head 80cdb6e4 (actions/runs?head_sha → 0; gh pr checks: none). Required checks verify and kanmer-gate are absent, not red; nothing to rerun. A pull_request run must exist and be green at the reviewed head (the rebase push will create one)."
    disposition: open
  - id: F-004
    severity: minor
    summary: "Renew compatibility lane: a renew naming no lease_id passes on the CORE-121 owner check only (store.ts:1382-1401); any MCP caller can pass assignee=<owner> and renew, and now also bumps lease_revision, forcing the real holder's next strict renew into REVISION_CONFLICT (a re-read, not a loss). Extends CORE-121 accepted-risk F-003; installed v0.3.12 skills need this lane."
    disposition: accepted-risk
    reason: "Same identity model as CORE-121 F-003 (client names are not credentials); FRD-030 strict lane is honoured whenever lease_id is named; closing it is the parked open question, gated on rolling the installed skills forward."
  - id: F-005
    severity: minor
    summary: "transfer does not refuse recovery.claimIdentity === 'branch-mismatch' (store.ts:1302-1311); the reclaim succeeds with the mismatch only recorded in the transition line, leaving the new controller a worktree checked out on the wrong branch. Packet-time checks remain the physical guard."
    disposition: accepted-risk
    reason: "Plan and FRD-030 only require board-worktree and foreign-repository refusals; evidence is recorded verbatim and never acted on; a branch-mismatch worktree is recoverable by the new controller from the recorded branch."
  - id: F-006
    severity: minor
    summary: "WORKSPACE_OCCUPIED path comparison is lexical (normalizeWorktreePath: separator + win32 lowercase only; no realpath, 8.3 short names or junction/symlink resolution) and branch comparison is exact-string; assertWorkspaceFree also does not skip archived tickets despite its docstring (store.ts:1117)."
    disposition: accepted-risk
    reason: "Core is filesystem/git-free by design; get_execution_packet performs the physical alias checks (report deviation 5). Including archived taken tickets is conservative (refuses more, never less)."
  - id: F-007
    severity: minor
    summary: "Six-store concurrent renewal test (claims.test.ts:536) depends on withExclusiveFileLock's bounded retry schedule (~2.15 s total, io.ts:74); on a slow windows-latest runner a waiter that exhausts retries throws EEXIST rather than Conflict and the 1/5 split assertion fails."
    disposition: accepted-risk
    reason: "Passed locally 411/411; watch the first CI runs after rebase and widen retries in the test via the injection seam if it flakes."
  - id: F-008
    severity: note
    summary: "force on take still bypasses LEASE_LIVE for another holder's live lease (store.ts:1183); only WORKSPACE_OCCUPIED is force-proof. This is unchanged CORE-121/FRD-016 semantics and a parked open question."
    disposition: accepted-risk
    reason: "Plan explicitly keeps force unchanged; skills instruct transfer, never force, for recovery."
  - id: F-009
    severity: note
    summary: "errors.ts maps LEASE_EXPIRED and seven conflict prefixes; LEASE_PHASE_INVALID, LEASE_EXTENSION_* and CLAIM_NOT_TAKEN surface as uncoded errors. A renew naming a lease_id on a legacy claim silently ignores the id (falls to owner check)."
    disposition: accepted-risk
    reason: "Validation errors, not ownership decisions; message prefixes are stable for callers."
---

# Review — CORE-115 / PR #293 (head 80cdb6e4)

Independent reviewer; implementer was `claude-code-core115`. Reviewed read-only in `.worktrees/core-115` against plan `bfb340758cafe577`, FRD-030 (AC1–AC3 and both edge cases; AC4/AC5 split to CORE-124 by recorded scope decision), FRD-034, FRD-029/CORE-114, FRD-016.

## Verdict: needs-changes (contract is sound; merge is mechanically blocked)

The lease contract itself is correct and matches the plan and FRD-030. The PR cannot merge at this head because (F-003) no CI run exists for it, and (F-002) it conflicts with main after MCP-054 merged. Per the review brief a rebase is not performed here.

## What was checked (file:line in the branch)

1. **Frontmatter**: all nine `lease_*` fields optional on the passthrough `ItemFrontmatterSchema` (types.ts +452-470), `KEY_ORDER` extended after `remediation_budget` (frontmatter.ts:23-31); v0.3.12 fixture test kept. `lease_phase` is `z.string()` (tolerant) with enum validation in the store.
2. **Lock**: `withLeaseLock` → `withExclusiveFileLock(.kanmer/leases.lock)` (store.ts:1091-1097), gitignored on the board branch (`.kanmer/**/*.lock`). take/release/transfer/renew all re-read + `assertRevision` + write inside the lock (1173, 1245, 1277, 1370). Stale-lock recovery/owner markers come from io.ts. Gap: F-001.
3. **Take**: `LEASE_LIVE` (1183-1195, force bypasses — F-008), `assertWorkspaceFree` after it and regardless of force (1196; 1111-1128), expiry not consulted so an expired-unreleased lease still owns its workspace; mints id/rev 1/workspace/phase/heartbeat, clears `lease_reclaimed_from`.
4. **Renew**: strict lane when `lease_id` named on a leased ticket — `LEASE_EXPIRED` on non-current id, `LEASE_REVISION_REQUIRED`, `Conflict:` on stale revision — all thrown before any write (byte-identical file asserted in tests and smoke). Own-expired renew allowed (no expiry check on renew). `running-command` extension clamped to `leaseCommandMaxMinutes` per renew (1422); indefinite renewal is by design (heartbeat), each window bounded. Legacy claim migrated on first renew/transfer via the single `leaseState()` rule (types.ts) — `claimState` is a wrapper; no parallel model.
5. **Transfer**: MCP handler collects `collectReconciliationEvidence` → `leaseRecoverySummary` (index.ts) before the store call; store refuses `CLAIM_LIVE` (non-operator), `RECOVERY_REFUSED` for board worktree / foreign repository (1302-1311); keeps branch/worktree/taken_at/commits/prs; new `lease_id`, rev+1, `lease_reclaimed_from`, transition line with evidence. Never deletes. Evidence collection is outside the lock (git/GH state, not board state) — acceptable.
6. **errors.ts**: `LEASE_EXPIRED` + `LEASE_CONFLICT` codes (F-009 notes).
7. **Docs/skills**: tool-reference, execute/auto skills, AGENTS.md §4/§8 gotcha 16, glossary + generated manual consistent with the code. Tool count 38 on branch; main is now 39 (F-002).

## Independent rail (cwd `.worktrees/core-115`, head 80cdb6e4)

`npm run typecheck` 0; `npm test -w @kanmer/core` 0 (19 files, 411); `npm run build` 0; `node packages/mcp-server/src/smoke.mjs` 287/287; `npm run smoke:protocol` 50/50; `node --test reconciliation.test.mjs` pass; `npm run plugin:check` 0 (38 tools, bytes match); `npm run verify:skills` 0.

## Required checks

`verify`, `kanmer-gate` (branch protection, conversation resolution enabled): **absent** at 80cdb6e4 — no run at all. PR `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`. Review threads: 0 (nothing to disposition).

## Residual risk

F-001 (deferred to CORE-125) is the one substantive ownership-contract gap: lease writes are atomic against each other but not against other ticket-file writers. F-004/F-005/F-006/F-008 are named, bounded risks consistent with the plan's recorded decisions.

## Next step for the author

Rebase onto main (resolve AGENTS.md to a single 39-tool line plus gotcha 16; rebuild the plugin bundle from the rebased tree; fix `smoke.mjs`/docs counts to 39), push, let `verify`/`kanmer-gate` run, then request a fresh attestation at the new head.
