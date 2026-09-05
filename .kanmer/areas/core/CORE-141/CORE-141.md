---
id: CORE-141
type: ticket
title: Release v0.4.2
status: review
area: core
assignee: claude-code
profile: chore
stageEntered:
  preparing: '2026-09-05T14:47:32.100Z'
  review: '2026-09-05T16:06:24.628Z'
taken_at: '2026-09-05T14:48:07.489Z'
branch: CORE-141-release-0.4.2
worktree: .worktrees/CORE-141
claim_expires_at: '2026-09-05T15:18:07.489Z'
claim_controller: claude-code
lease_id: 3b7420d8-cebe-41e2-8257-6960c8bdaf5a
lease_revision: 1
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-141'
lease_phase: implementing
lease_heartbeat_at: '2026-09-05T14:48:07.489Z'
labels:
  - release
  - v0.4.2
groups:
  - HZN-009
links:
  - CORE-137
refs:
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
commits:
  - 415aeb692242547bd394af0e7376e5dbc94db111
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/331'
archived: false
created: '2026-09-05T02:13:04.749Z'
updated: '2026-09-05T16:06:24.628Z'
---

## Why

0.4.2 closes [[HZN-009]]: build-once rail (CORE-140), routed managed instructions and integration-branch wording (DOC-028), retired closeout plan (DOC-026), evidence-first verification with receipts (MCP-057), typed proof record ([[CORE-129]]), reliable PR handoff subset ([[CORE-138]]) and the Focus Board scopes/columns (GUI-152). Release and remediation work ships no new features beyond the roster.

## Route

A **qualified standalone MCP + plugin/skills cut**. The desktop installer is produced by the existing `release.mjs` path and carried forward on Electron 31.7.7 (end of support) with `sandbox: false` on the main window; the release notes and the closeout state that no new runtime or security-posture claim is made for the desktop artifact. Runtime upgrade and IPC/sandbox re-qualification are [[HZN-010]] R2-DESKTOP.

## Verification (operator: Alex, the named heavy verifier)

1. Clean `main`, `npm ci && npm run verify` (one local rail).
2. `npm run golden`; `npm run golden:promotion -- --candidate 0.4.2 --dry-run` then the real rehearsal on a copied board.
3. CORE-129 proof census on a copied board via `migrate_board` dry run; decide the live strict cutover and record it either way.
4. `node scripts/release.mjs 0.4.2 --ticket <this id> --dry-run`, then the real preparation; merge the release PR; publish phase with the post-merge SHA.
5. Fresh non-linked clone: `npm ci && npm run plugin:check && npm run mcpb:check && npm run test:http -w @kanmer/mcp-server`.
6. Install the 0.4.2 MCPB/plugin in the host; `get_status` reports 0.4.2 and the intended skills.
7. Disposable mutation through the installed route on a `mkdtemp --root` board: `get_status → create_item → set_ticket_doc → get_doc_gates → move_item → list_items → archive`.
8. Rollback to the retained 0.4.1 generation and back.
9. Write `HZN-009/closeout.md` (file 11 §5 template) with M1–M5 results as PASS / PROCEDURAL / FAIL / INCONCLUSIVE / NOT RUN, and update `contracts/release-resumption-gate.json` in the pack.

If 6, 7 or 8 fails: keep 0.4.1 as the live control plane and record M5 truthfully.

## Outcome
