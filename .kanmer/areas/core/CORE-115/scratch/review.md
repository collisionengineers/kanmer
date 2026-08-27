---
kind: review-attestation
pr: "293"
head_sha: "085861768557451d14bcc24fb6431544adfdce8c"
verdict: pass
reviewer: "claude-core115-delta-reviewer"
independent: true
plan_hash: "bfb340758cafe577"
ticket_updated: "2026-08-27T20:22:23.488Z"
board_sha: "429b315886807ac40b08403ec1ec70489dc872a9"
threads_snapshot:
  total: 10
  unresolved: 0
  github_thread_ids:
    - PRRT_kwDOT2PEds6c9pu2
    - PRRT_kwDOT2PEds6c9pu8
    - PRRT_kwDOT2PEds6c9pvE
    - PRRT_kwDOT2PEds6c9pvK
    - PRRT_kwDOT2PEds6c9pvR
    - PRRT_kwDOT2PEds6c9pvW
    - PRRT_kwDOT2PEds6c9pvd
    - PRRT_kwDOT2PEds6c9pvj
    - PRRT_kwDOT2PEds6c9-sV
    - PRRT_kwDOT2PEds6c9-sX
attestation_version: 2
findings:
  - id: F-001
    severity: major
    summary: "Lease lock covers only the four lease verbs; updateItem/moveItem and expected_revision CAS paths still write the ticket file unlocked and can clobber a lease write (store.ts:1095-1097 vs unlocked updateItem/moveItem). Codex thread PRRT_kwDOT2PEds6c9pvE."
    disposition: deferred-to-ticket
    ticket: CORE-125
  - id: F-002
    severity: major
    summary: "PR conflicted with main (e903289e, MCP-054) on AGENTS.md; bundle and 38-tool counts stale."
    disposition: fixed
    reason: "Rebased onto e903289e: AGENTS.md keeps MCP-054 gotcha 16 and adds lease gotcha 17 (AGENTS.md:634-636), §4 says 39 tools (AGENTS.md:411); smoke.mjs:69 asserts 39; no '38' tool count remains in smoke, smoke-protocol, tool-reference, connect.md or the generated manual; bundle rebuilt (plugin:check: 39 tools match, bytes match). PR MERGEABLE."
  - id: F-003
    severity: blocker
    summary: "No workflow run existed for the prior head 80cdb6e4."
    disposition: fixed
    reason: "Run 33112834467 at 08586176: verify SUCCESS, kanmer-gate SUCCESS after re-run once the board tip (429b3158) was pushed; regate skipped (not required). Required contexts are verify and kanmer-gate."
  - id: F-004
    severity: minor
    summary: "Renew compatibility lane (no lease_id) passes on the owner check only; strict lane does not additionally check actor against the controller (store.ts:1386-1400). Codex thread PRRT_kwDOT2PEds6c9pvR."
    disposition: accepted-risk
    reason: "Client names are not credentials (CORE-121 F-003 identity model); the lease id/revision is the FRD-030 fence; a foreign renewer bumping the revision surfaces to the holder as REVISION_CONFLICT (re-read, not loss). Closing it is the parked open question gated on installed skills."
  - id: F-005
    severity: minor
    summary: "transfer did not refuse recovery.claimIdentity === 'branch-mismatch'."
    disposition: fixed
    reason: "store.ts:1314-1319 throws RECOVERY_REFUSED on branch-mismatch before any write; claims.test.ts:525-535 asserts the refusal with a byte-identical ticket file; tool-reference and AGENTS.md gotcha 17 updated. Note: the take_ticket description in index.ts:1454 still lists only board/foreign-repository refusals (F-016)."
  - id: F-006
    severity: minor
    summary: "WORKSPACE_OCCUPIED path comparison is lexical (normalizeWorktreePath: separators + win32 lowercase), branch comparison exact-string; assertWorkspaceFree does not skip archived tickets (store.ts:1114-1130)."
    disposition: accepted-risk
    reason: "Core is filesystem/git-free; get_execution_packet performs the physical alias checks. Including archived taken tickets refuses more, never less."
  - id: F-007
    severity: minor
    summary: "Six-store concurrent renewal test depends on withExclusiveFileLock's bounded retry schedule; could flake on a slow runner."
    disposition: accepted-risk
    reason: "Passed locally (411/411) and on the hosted verify run at 08586176; widen retries via the injection seam if it flakes."
  - id: F-008
    severity: note
    summary: "force on take bypasses LEASE_LIVE for another holder's live lease (store.ts:1183-1195); only WORKSPACE_OCCUPIED is force-proof. Codex thread PRRT_kwDOT2PEds6c9pu2."
    disposition: accepted-risk
    reason: "Plan explicitly keeps CORE-121/FRD-016 force semantics; skills instruct transfer, never force, for recovery; parked open question."
  - id: F-009
    severity: note
    summary: "lease_phase is z.string() in frontmatter (validated in the store); LEASE_PHASE_INVALID, LEASE_EXTENSION_*, CLAIM_NOT_TAKEN surface uncoded. Codex thread PRRT_kwDOT2PEds6c9pvj."
    disposition: accepted-risk
    reason: "Passthrough tolerance is required for the live v0.3.12 board; every write validates the phase; prefixes are stable."
  - id: F-010
    severity: minor
    summary: "MCP release ignores lease_id/lease_revision; a stale worker can release the new controller's lease with only optional expected_revision as a fence (index.ts:1478, store.ts:1244-1266). Codex thread PRRT_kwDOT2PEds6c9pu8."
    disposition: accepted-risk
    reason: "release is the unchanged CORE-121 closeout verb, invoked by kanmer-closeout after Done and by the GUI; expected_revision CAS is available. Lease-token fencing belongs with F-004 once installed skills send lease_id; noted for CORE-125."
  - id: F-011
    severity: minor
    summary: "assertWorkspaceFree skips tickets without taken_at, so branch/worktree-only legacy records do not occupy a workspace (store.ts:1117). Codex thread PRRT_kwDOT2PEds6c9pvK."
    disposition: accepted-risk
    reason: "A claim is defined by taken_at (CORE-121); renew/transfer gate on the same field, so the rule is consistent; such records are pre-claim residue for an operator."
  - id: F-012
    severity: minor
    summary: "lease_workspace persists an absolute (win32-lowercased) path in ticket frontmatter (store.ts:1099-1102, worktree-guard.ts:21-30); machine-specific and stale after a checkout move. Codex thread PRRT_kwDOT2PEds6c9pvW."
    disposition: accepted-risk
    reason: "Descriptive only: occupancy and packet checks recompute from the repo-relative worktree field per host, so it never drives an ownership decision. Repo-relative key recommended under CORE-125."
  - id: F-013
    severity: minor
    summary: "kanmer-review/verify/closeout skills neither heartbeat nor set the review/verifying/closeout phases; only execute/auto renew. Codex thread PRRT_kwDOT2PEds6c9pvd."
    disposition: deferred-to-ticket
    ticket: SKILL-036
  - id: F-014
    severity: minor
    summary: "transfer accepts recovery.claimIdentity === 'detached' (store.ts:1302-1319), minting a lease whose packet will then refuse the worktree. Codex thread PRRT_kwDOT2PEds6c9-sV."
    disposition: accepted-risk
    reason: "Same reasoning as the original F-005: evidence recorded verbatim, nothing deleted, packet-time check is the physical guard, the new controller restores the recorded branch. One-line hardening candidate for CORE-125."
  - id: F-015
    severity: minor
    summary: "leaseConfig does not validate leaseHeartbeatMinutes < claimExpiryMinutes (types.ts:707-715); a misconfigured board advertises a cadence past expiry. Codex thread PRRT_kwDOT2PEds6c9-sX."
    disposition: accepted-risk
    reason: "Defaults are 5/30; an expired-but-unreclaimed lease still renews for its holder, so a healthy worker is only at risk if a reclaim also races. Validation noted for CORE-125."
  - id: F-016
    severity: note
    summary: "take_ticket tool description (index.ts:1454, mirrored in the bundle) still says RECOVERY_REFUSED applies to 'a board or foreign-repository workspace'; branch-mismatch (F-005) is missing from the wording."
    disposition: accepted-risk
    reason: "Documentation string only; tool-reference and AGENTS.md carry the correct contract. Fix opportunistically in CORE-124/125."
---

# Delta review — CORE-115 / PR #293 (head 08586176)

Independent delta reviewer (`claude-core115-delta-reviewer`); implementer `claude-code-core115`. Scope: the prior attestation (v1 at 80cdb6e4, needs-changes), the rebase onto main e903289e, the F-005 hardening commit 08586176, direct contracts and tests. Reviewed read-only in `.worktrees/core-115`.

## Verdict: pass

## Delta verified (file:line)

- **Rebase resolution**: `AGENTS.md:411` "registers **39 tools**"; `AGENTS.md:632` MCP-054 gotcha 16 kept, `AGENTS.md:634` lease gotcha renumbered 17. `packages/mcp-server/src/smoke.mjs:69` asserts 39; grep for a 38-tool count across smoke.mjs, smoke-protocol.mjs, tool-reference.md, connect.md, chapters.generated.ts, AGENTS.md: none.
- **Bundle**: `npm run plugin:check` — "39 tools match, bundle bytes match, isolated MCP handshake lists 39 tools". Commit 08586176 rebuilt `plugins/kanmer/mcp/kanmer-mcp.cjs` (+462/-164 relative to the textual-merge state).
- **F-005**: `store.ts:1314-1319` refuses `RECOVERY_REFUSED` on `claimIdentity === "branch-mismatch"` before any write; `claims.test.ts:533` asserts the refusal and `:534` the byte-identical file. Diff c76c2927..08586176 touches only store.ts (+9), claims.test.ts (+3/-1), AGENTS.md, tool-reference.md and the bundle — no assertion weakened.
- **Lease contract unchanged**: `withLeaseLock` `store.ts:1095`; take/release/transfer/renew enter it at `:1173`, `:1245`, `:1278`, `:1377`; `assertWorkspaceFree` `:1114-1130` (no expiry consult, force-proof at `:1196`); renew strict/compat lanes `:1386-1400`; `leaseState` sole expiry rule (`types.ts`, imported `store.ts:121`).
- **MCP-054 + CORE-115 coexist**: `index.ts:724` `list_projects`; `index.ts:1454-1483` take_ticket lease params; smoke 299/299.

## Independent rail (cwd `.worktrees/core-115`, head 08586176)

`npm run typecheck` 0; `npm test -w @kanmer/core` 0 (19 files, 411 tests); `npm run build` 0; `node packages/mcp-server/src/smoke.mjs` 299/299; `npm run smoke:protocol` 50/50; `npm run plugin:check` 0 (39 tools, bytes match); `npm run verify:skills` 0.

## Required checks

Branch protection requires `verify` and `kanmer-gate` with conversation resolution. Run 33112834467 at 08586176: `verify` SUCCESS; `kanmer-gate` FAILURE on first pass (remote board tip still showed Implementing), SUCCESS after re-run with board tip 429b3158 (local == origin/kanmer-board). `regate` skipped (not required).

## Review threads

Ten Codex threads (8 at 80cdb6e4, 2 at 08586176), none previously dispositioned. Each received a reviewer reply naming its finding id and disposition and was resolved: F-008, F-010, F-001, F-011, F-004, F-012, F-013, F-009, F-014, F-015 respectively. No blocker or major remains open (F-001 deferred to CORE-125, F-013 to SKILL-036).

## Residual risk

F-001 (lock coverage of non-lease writers) remains the one substantive gap, owned by CORE-125, which also collects the minor hardening candidates from this round (release fencing F-010, repo-relative workspace key F-012, detached refusal F-014, heartbeat/expiry validation F-015, description wording F-016). Skill-side heartbeat during review/verify/closeout is SKILL-036.
