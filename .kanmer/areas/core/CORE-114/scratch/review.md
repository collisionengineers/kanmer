---
kind: review-attestation
pr: "291"
head_sha: "631e3a0eef68da61c7d55c1d9948d6583db6f470"
verdict: pass
reviewer: "claude-core114-delta-reviewer"
independent: true
plan_hash: "07d6ef79454ca753"
ticket_updated: "2026-08-27T18:58:25.408Z"
board_sha: "bc7c928bfc67e6f402a6fa746196552d986b336b"
threads_snapshot:
  reviews: 1
  comments: 0
  review_threads: 7
  unresolved_threads: 7
  gathered_head: "631e3a0eef68da61c7d55c1d9948d6583db6f470"
findings:
  - id: F-001
    severity: major
    summary: "Identity allocation was read-then-rename; concurrent first writes on a legacy board minted N identities and N activity entries"
    disposition: fixed
  - id: F-002
    severity: minor
    summary: "migrate_board dry_run over MCP allocated project.json via write()'s lazy ensureInit; wouldAllocate unreachable"
    disposition: fixed
  - id: F-003
    severity: minor
    summary: "get_status.project.location.remoteOrigin reported raw remote.origin.url including embedded userinfo"
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "take_ticket release/renew/transfer ignored expected_revision"
    disposition: fixed
  - id: F-005
    severity: note
    summary: "lastProject is refreshed only by writes/get_status/get_execution_packet; read-only results can report a stale project block"
    disposition: accepted-risk
    reason: "One process serves one project; a stale read block is informational and corrected on the next write or get_status. Re-resolution per endpoint is MCP-054 scope."
  - id: F-006
    severity: note
    summary: "A deleted or malformed project.json is silently re-allocated as a new `migrated` uuid on the next write (also Codex P1 'surface invalid records')"
    disposition: accepted-risk
    reason: "Re-allocation records migratedFrom.fingerprint and a board/project_id activity entry (the FRD-029 auditable fallback); documented in AGENTS.md gotcha 15 and pinned by a core test. Distinguishing malformed from absent is a hardening follow-up, not a contract gap."
  - id: F-007
    severity: note
    summary: "kanmer-gate on run 33102297186 was red only because it ran before the board push"
    disposition: fixed
  - id: F-008
    severity: minor
    summary: "packages/core/src/project.ts embeds a literal NUL byte in the computeRevision separator template literal, so git treats the file as binary (Codex P2 at e2bb6ed8; still present at 631e3a0e, 1 NUL byte)"
    disposition: open
  - id: F-009
    severity: minor
    summary: "assertRevision and the subsequent writeFileAtomic are not under a cross-process per-ticket lock; two processes can both pass the CAS from the same revision and the later rename wins (Codex P1, store.ts:790)"
    disposition: accepted-risk
    reason: "Identical window to the pre-existing expected_updated / expected_version CAS which this ticket must keep unchanged; the plan specifies check-immediately-before-write, not a lock. Cross-process claim serialisation is CORE-115 (lease/batch) scope, which this ticket blocks."
  - id: F-010
    severity: minor
    summary: "get_item / get_execution_packet compute revision in a separate read from the item snapshot; a concurrent change between the two reads returns a newer token with older data (Codex P1, index.ts:808)"
    disposition: accepted-risk
    reason: "Window is a few file reads on one ticket folder; the consequence is at most one accepted write that the caller would have also made with a fresh read. Binding the token to a single snapshot read is a small follow-up hardening, not a contract change."
  - id: F-011
    severity: minor
    summary: "After the process has initialised once, deleting project.json (documented rollback) leaves `initialised` true so the running server stays `unassigned` until restart (Codex P2, index.ts:313)"
    disposition: accepted-risk
    reason: "Rollback is an operator action on a file under the running server; a restart is the expected step and re-migration then happens on the next write as documented. Recorded for the AGENTS.md gotcha to mention restart."
  - id: F-012
    severity: minor
    summary: "dispatch_task / cancel_dispatch do not call ensureInit, so on a legacy board a dispatch can run and append scratch while the project is still unassigned (Codex P2, index.ts:883)"
    disposition: accepted-risk
    reason: "Pre-existing behaviour (dispatch never ran ensureInit before this PR); the dispatch callback's scratch append goes through the store and allocates identity on that first write. Endpoint/dispatch identity wiring is MCP-054 scope."
---

# Delta review — CORE-114 (PR #291 @ 631e3a0e)

Independent delta reviewer (not the implementer, not the round-0 reviewer). Scope: the four open findings of attestation v90c6f088f8ec0f8b, the remediation commit 631e3a0e (9 files, +220/-27), the direct contracts it touches, and the tests. Not a fresh unrestricted audit.

## Fix verification

- **F-001** `packages/core/src/project.ts:118-131` — `writeFileExclusive` (io.ts:632, temp + `fs.link`, `wx` fallback) creates `project.json`; on `EEXIST` the winner is re-read and returned with `allocated: false`; only a still-unreadable file falls through to `writeFileAtomic` (documented F-006 fallback, pinned by "a malformed project.json is replaced" test). `store.ts:287-295` appends the `board/project_id` activity entry only when `allocated`. Tests `project.test.ts:89-108` (8 concurrent `store.init` on a legacy board → one uuid across all stores, exactly one migration activity entry, no temp files) and `:110-119` (8 concurrent `allocateProjectRecord` → exactly one `allocated: true`). Both would fail on the e2bb6ed8 code, where every caller read absence before any rename and each reported `allocated: true` (the round-0 probe reproduced 6 allocations).
- **F-002** `packages/mcp-server/src/index.ts:1657-1666` — `migrate_board` now under `guard`; order is `assertExpectedProject` → `setActor` → `ensureInit` only when `!dry_run`, so WRONG_PROJECT is still refuse-before-init and a real migrate still initialises. Smoke (`smoke.mjs:726-747`) asserts dry run returns `allocated:false, wouldAllocate:true, project_id:null`, no `project.json`, `get_status` still `unassigned`, then the non-dry migrate allocates once with exactly one activity entry for that id.
- **F-003** `project-identity.ts:56-71` `redactRemoteOrigin` strips userinfo from `scheme://user:token@host` (https and ssh) and the password segment of scp-like `user:token@host:path`; applied at `index.ts:271` before reporting and hashing. Smoke covers https/ssh/scp/plain/empty/null.
- **F-004** `store.ts:1148`, `:1182`, `:1231` call `assertRevision` before any write on release/transfer/renew; `index.ts:1425-1437` forwards `expected_revision` for every action. Core test `project.test.ts:226-252` (stale → `Conflict:` with byte-identical file and unchanged activity count; fresh accepted) and smoke check (REVISION_CONFLICT on renew/release/transfer, `get_item` unchanged).
- **No assertion weakened**: the two removed smoke checks (dry-run-writes ordering) are replaced by strictly stronger ones (dry run must not write; single allocation entry). No existing test assertion changed elsewhere in the delta.

## Acceptance checks (independent, cwd `.worktrees/core-114`, head 631e3a0e)

| Command | Result |
| --- | --- |
| `npm test -w @kanmer/core` | 19 files, 396 passed, exit 0 |
| `node packages/mcp-server/src/smoke.mjs` | 278/278, exit 0 |
| `npm run smoke:protocol` | 50/50, exit 0 |
| `npm run test:http -w @kanmer/mcp-server` | 118 pass / 0 fail, exit 0 |
| `npm run plugin:check` | 38 tools, bundle bytes match, exit 0 |

Checks at 631e3a0e (run 33106086301): `verify` SUCCESS, `kanmer-gate` SUCCESS, `regate` skipped. No re-run was needed (the gate ran after the board push, board bc7c928b). PR mergeable.

## Review threads

Codex left one review (e2bb6ed8) and 7 inline threads. Dispositions: dry-run (outdated) → F-002 fixed; redact (outdated) → F-003 fixed; take_ticket actions → F-004 fixed; exclusive allocation → F-001 fixed; invalid record → F-006 accepted; NUL byte → F-008 open minor; CAS-without-lock → F-009; revision/snapshot split → F-010; `initialised` after rollback → F-011; dispatch without init → F-012. Threads are left unresolved on GitHub as evidence; none is a blocker or major.

## Verdict

`pass`. No open blocker or major. F-008 (source hygiene) is left open as a minor for a follow-up: replace the literal NUL in `computeRevision` with `\0` (runtime bytes unchanged, so `rev1:` tokens stay stable).

## Residual risk

F-009/F-010 same-ticket cross-process races are bounded to the same window the existing CAS already has and are the subject of CORE-115; F-011/F-012 are operator/edge paths recorded above.
