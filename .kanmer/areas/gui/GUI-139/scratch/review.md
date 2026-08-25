---
kind: review-attestation
pr: "265"
head_sha: "464104e04561ac185cfe771d0bb6e8609b8de4b1"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "9af7da453bc2b0c7"
ticket_updated: "2026-08-25T07:02:20.315Z"
findings:
  - id: F-001
    severity: major
    summary: "Incomplete-profile exception is broader than the product-owned default"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Doctor or Initialize makes the product-created incomplete profile unloadable"
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Generated default profile name can fail its own validation on restart"
    disposition: fixed
  - id: F-004
    severity: major
    summary: "Previously persisted non-alphanumeric default names remain unloadable"
    disposition: fixed
  - id: F-005
    severity: blocker
    summary: "Post-attestation hosted authoritative verification is red"
    disposition: open
---
# Independent final review — GUI-139 / PR #265

## Scope and source-review evidence

Independently reviewed exact PR head 464104e04561ac185cfe771d0bb6e8609b8de4b1 against the complete GUI-139 packet, FRD-025, and HZN-007 context. The bounded diff changes only apps/gui/src/main/openaiTunnel.ts and apps/gui/src/main/openaiTunnel.test.ts (78 insertions, 6 deletions). It keeps normal profiles subject to the existing safe/runnable validation while allowing only exact current or legacy product-owned incomplete defaults, with separately bounded diagnostic metadata. A legacy default name is normalized in memory to the current valid default; arbitrary partial, unsafe, or structurally altered profiles remain rejected.

Local source checks passed: npm exec vitest run -- src/main/openaiTunnel.test.ts (14/14), npm run typecheck (all workspaces), and git diff --check 700ae9c46904cd5417abe81dd3b256f6d33000d0...464104e04561ac185cfe771d0bb6e8609b8de4b1. The initial exact-head hosted run 32819650048 passed verify in 4m29s and kanmer-gate in 1m17s, but its gate correctly noted the prior review record as stale. After this SHA-bound review replacement, the rerun gate passed in 50s and the required verify job failed in 1m38s.

## Finding dispositions

- **F-001 — major, fixed:** The incomplete exception is limited to exact structural current/legacy defaults and validated diagnostics; safe populated profiles still require the full runnable contract.
- **F-002 — major, fixed:** Product-written diagnostic metadata is bounded, and incomplete profiles reject Doctor and Initialize before state mutation, process spawn, or persistence.
- **F-003 — major, fixed:** New non-alphanumeric basenames receive a valid kanmer- prefix, with a register/restart regression.
- **F-004 — major, fixed:** A persisted legacy .kanmer profile is recognized only with the exact former deterministic defaults, then presented under the canonical valid name; the regression exercises persisted old state followed by restart.
- **F-005 — blocker, open:** Required hosted verify job 97716214057 timed out in the unrelated core test KanmerStore > validates area only when the board defines areas; empty area always legal. The test exceeded its 15-second timeout (reported 20.789s; 309/310 tests passed) at no GUI-139-touched path. The review rail is nevertheless red. Under the repository policy a failing test stops the merge and a prior passing run does not erase that failure. Do not broaden this GUI persistence PR to change core test timing or behavior; resolve the red required rail through the appropriate separately scoped decision before requesting fresh review.

The two prior GitHub review threads are resolved and correspond to F-002/F-003. No source change or merge is authorized while F-005 remains open. This record makes no merged-main, release, or proof claim.
