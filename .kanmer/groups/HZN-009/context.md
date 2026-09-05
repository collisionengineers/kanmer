# OP-00 snapshot — trustworthy starting point (2026-09-05 ~03:00 BST)

## Runtime and configuration actually observed (live MCP, not the pack's GitHub snapshot)

| Item | Observed |
|---|---|
| Server answering | 0.4.1 packaged, `%LOCALAPPDATA%\Kanmer\mcp\0.4.1-7432\resources\mcp\kanmer-mcp.cjs`, sha256 `3f7af329…` |
| Repo staleness | `upToDate: true` (only the informational `questions-resolved` compensation) |
| Board | format 3, `boardSource: file`, project `dc201ffe-56fa-40b3-aa27-3a01b371c7db`, worktree `.worktrees/kanmer` on `kanmer-board`, local == remote `7586cf74` |
| Source | `main` == `origin/main` == `c088be1391a1198c914fc3ef247103fd52c277c5` |
| Effective profiles | feature / fix / chore / spike / capture / custom; default `fix` (see `get_doc_gates`) |
| Delivery policy | default: integration `main`, release `main`, no candidate pattern, hotfix backport true; `deploymentTracking` off |
| Dispatch | disabled by operator policy |
| Leases | expiry 30 min, heartbeat 5 min, command max 120 min |
| Sources | none declared |
| Release ledger | attempt `main@1` released `v0.4.1` at `4e94ad80…`, verification passed, four asset digests |
| Local toolchain | Node v24.15.0, npm 11.14.1; CI pins Node 20; Electron 31.7.7 pinned |
| Board re-gate hook | `board-regate.yml` on `kanmer-board` is byte-identical to `main` — the CORE-139 operator copy step is complete |

## Inventory

384 tickets + 30 archived = 414 records at the snapshot. By stage: backlog 10, preparing 1, implementing 0, review 0, verifying 0, done 373. Taken 0. Groups: EPIC-001..013 and HZN-001..008 all archived; HZN-009/HZN-010 created today.

Pre-existing active non-Done tickets (all 11) and their package mapping:

| Ticket | Stage | Package | Horizon |
|---|---|---|---|
| CORE-129 | preparing | R1-EVID (typed proof record, `proof-record/2`) | HZN-009 |
| CORE-138 | backlog | R1-GATE (narrowed; successor CORE-142) | HZN-009 |
| DOC-026 | backlog | R1-POL (retire CLOSEOUT_PLAN.md) | HZN-009 |
| CORE-112 | backlog | R2-CONNECT | HZN-010 |
| CORE-130 | backlog | R2-GOV | HZN-010 |
| CORE-134 | backlog | R2-WORKSPACE | HZN-010 |
| GUI-140 | backlog | R2-CONNECT | HZN-010 |
| GUI-143 | backlog | R2 GUI backlog | HZN-010 |
| GUI-145 | backlog | R2 GUI backlog | HZN-010 |
| GUI-148 | backlog | R2-CONNECT | HZN-010 |
| MCP-052 | backlog | owner-parked, `waiting-owner` | none |

Archived-but-non-Done records (CORE-103, CORE-107, MCP-028, MCP-051, GUI-141, GUI-015, CORE-075 and the SKILL-017 scenario fixtures) are retired history, not Verifying congestion. They are preserved as-is.

## Selected R1 packages and their tickets

| Package | Ticket(s) | Lane |
|---|---|---|
| R1-RAIL build once + stamp | CORE-140 | A |
| R1-POL routing + integration branch + scoped loading | DOC-028, DOC-026 | B |
| R1-EVID evidence-first verify + `receipts[]`, typed proof record | MCP-057, CORE-129 | B |
| R1-GATE handoff subset | CORE-138 | A |
| R1-LEASE | procedural (no ticket); permit → CORE-143 (R2) | — |
| R1-UI Focus Board UI-A+B | GUI-152 | C |
| R1-PROMOTE | CORE-141 | operator |

## Deliberately excluded from R1

Implemented heavy permit (CORE-143); gate-only hosted required check and blocking attestation (CORE-142, needs repository administration); Focus Board list view, conflict UI, time-in-stage and packaged qualification (GUI-153); Electron runtime upgrade and `release.yml` Node bump (R2-DESKTOP); receipt store / reuse key / provenance adapter (R2-EVIDENCE); the pack's `tools/audit_board.py` (unnecessary — live inventory read via MCP); every Pegasus item.

## Rollback reference

Source `c088be13` on `main`; board `7586cf74`; installed control plane 0.4.1 generation `0.4.1-7432` retained under `%LOCALAPPDATA%\Kanmer\mcp\`. The release ledger's `main@1` is the last known-good release. Candidate promotion follows ADR-0021 / FRD-035 (`npm run golden:promotion`).

## Operating controls for this horizon

- Alex is the named heavy verifier and the only merger. Implementers run scoped checks only; the full rail runs in CI on each PR and once locally at the cut.
- Shared-file owners: lane A — `pr.yml`, `scripts/verify.mjs`, `check-pr.mjs`, execute/review skills; lane B — `scripts/agents-block-body.mjs` and mirrors, `kanmer-verify/SKILL.md`, `reconciliation.ts`, `proof-record.ts`; lane C — `apps/gui/src/**`.
- Every board mutation goes through MCP with `expected_revision`.
