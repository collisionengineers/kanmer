---
kind: proof-record
merged_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
prs:
  - "162"
  - "164"
result: PASS
verified_at: "2026-08-22T11:18:00Z"
---

## Merged-main verification

Verified the exact PR #162 squash merge on detached `origin/main` at `34245be039e8fd8395b5e31835602c54e62e98a4`.

- Focused Add-to-group rails (`groupMenu.test.ts`, `ContextMenu.test.tsx`): 8/8 PASS.
- `npm run typecheck`: PASS.
- `npm run build -w @kanmer/gui`: PASS.
- `npm run check:manual`: PASS; 22 chapters current.
- `git diff --check`: PASS.
- Full GUI suite: 45 files / 390 tests PASS.
- Full repository suite: after the required `npm run build:core` precondition, `npm test` PASS — core 14 files / 283 tests, GUI 45 files / 390 tests, MCP HTTP 68 tests, scripts 88 tests.
- The initial root-suite attempt failed only because the detached verification worktree had no generated `packages/core/dist/index.js`; the explicit core build succeeded and the complete rerun passed. No source assertion was weakened.

## Review and lineage

- PR #164 (GUI-111 remediation) independently reviewed PASS at `51c4a3460f6bb3dfb866c541e1a7d9920394bb34`, then merged into the GUI-109 branch as `72e80fc8c45672fd13907d9741900848ce06b109`.
- PR #162 independently reviewed PASS at the resulting head; attestation version `946ee04b23057a28`, all six review threads resolved, hosted `kanmer-gate` and `verify` checks PASS.
- PR #162 then merged to `main` as the exact SHA above.

## External boundary

Packaged Electron visual/live pointer interaction evidence remains INCONCLUSIVE in this environment; no interactive packaged-host success is claimed. Deterministic merged-main behavior and all available hosted rails pass.
