---
kind: proof-record
merged_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
prs:
  - "164"
  - "162"
result: PASS
verified_at: "2026-08-22T11:18:00Z"
---

## Merged-main verification

Verified the GUI-111 wheel-remediation changes on detached `origin/main` at `34245be039e8fd8395b5e31835602c54e62e98a4`, where PR #164 was stacked into PR #162 before the final merge.

- GUI-111 focused rails: 8/8 PASS.
- Full GUI suite: 45 files / 390 tests PASS.
- `npm run typecheck`: PASS.
- `npm run build -w @kanmer/gui`: PASS.
- `npm run check:manual`: PASS; 22 chapters current.
- `git diff --check`: PASS.
- Full repository suite: after the required `npm run build:core` precondition, `npm test` PASS — core 14 files / 283 tests, GUI 45 files / 390 tests, MCP HTTP 68 tests, scripts 88 tests.

## Review and lineage

- The wheel fix is exact commit `51c4a3460f6bb3dfb866c541e1a7d9920394bb34`; PR #164 merged it into the parent branch as `72e80fc8c45672fd13907d9741900848ce06b109`.
- Independent GUI-111 review attestation `cb05644fc52e8186` is PASS; all wheel review findings are resolved.
- The parent PR #162 then merged the stacked result to `main` as the exact SHA above.

## External boundary

Packaged Electron visual/live pointer interaction evidence remains INCONCLUSIVE in this environment; no interactive packaged-host success is claimed. Deterministic merged-main behavior and all available hosted rails pass.
