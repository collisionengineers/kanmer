2026-08-26: Execution inspection found that MCP annotations and the central expected-project wrapper are static per registered tool. A single `reconcile_ticket` with a runtime `apply` flag would either mislabel dry-run as mutating or leave apply outside the central write guard. The bounded plan is revised to one read-only `reconcile_ticket` tool plus one mutating `apply_reconciliation` tool; no governing requirement changes.

2026-08-26: First `npm run build` attempt exited 1 after core built successfully because the nested worktree inherited the dirty root checkout's stale `node_modules` resolution. The standalone MCP bundle resolved root `packages/core/dist` and reported missing existing exports (including the new `reconcileEvidence`); this is an environment isolation failure, not a code verdict. Retain the failure and install this worktree's lockfile dependencies before retrying.

2026-08-26 — Pre-review verification attempt: `npm run plugin:build && npm run verify` exited 1 after all completed rails had passed through `mcpb:check`. `npm run smoke:protocol` then correctly observed 39 registered tools but still asserted the legacy 37-tool count for each negotiated protocol version (2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05), causing 4 failed expectations (42/46). This was a stale test-contract expectation introduced by CORE-113's two registered tools, not a product-path failure. The candidate remains unchanged except for the planned correction to `packages/mcp-server/src/smoke-protocol.mjs`; the failed attempt is retained here and the full rail will be rerun after regenerated plugin output.

2026-08-26 remediation: independent review F-001 found Verifying evidence without a merge SHA was recognized only when PR state was merged. Created linked review-feedback record [[CORE-120]]. Corrected the existing CORE-113 classifier and added absent, open/pending, closed-unmerged and merged fixture coverage; `npm test -w @kanmer/core -- reconciliation` passed 22 tests, `npm run plugin:build` passed, and the complete `npm run verify` rail passed (345 core, 486 GUI, 107 MCP HTTP, 120 scripts; smoke/protocol/docs/plugin all green).

## 2026-08-27 — authorized F-015 remediation: execution packet refusal

`get_execution_packet` returned `ready: false`, `code: GATE_BLOCKED`.

Reason: `Ticket "CORE-113" is already taken by codex-goal-controller (branch core-113-rescue-reconciliation, worktree .worktrees/core-113).`

Missing: `[]`.

No source, branch, PR, or ticket-stage mutation followed this refusal. The operator authorized a scoped remediation for F-015 (and F-016 if within scope), but the ticket must first be made executable by the workflow owner.
