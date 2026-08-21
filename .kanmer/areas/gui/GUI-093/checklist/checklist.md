# Checklist — GUI-093

- [x] Rebase GUI-093 on merged main containing GUI-092's one-package release workflow.
- [x] Preserve the sole post-tag Electron Builder package and its local packaged-app/coherence rails.
- [x] Add a dependency-injected publication/recovery decision helper.
- [x] Retain a publisher error rather than terminating before remote verification.
- [x] Accept a publisher error only after remote asset verification proves the release complete.
- [x] Build exact clobber upload arguments from the expected local paths and GitHub-safe asset names.
- [x] Repair an incomplete release once from those exact files, without any Electron Builder run.
- [x] Re-verify remote assets after the bounded repair and refuse with actionable diagnostics when still incomplete.
- [x] Add deterministic tests for success, 422-with-complete-assets, partial repair, failed repair, bounded attempts, and no second package.
- [x] Update release diagnostics/dry-run prose and only any genuinely stale FRD wording.
- [x] Run script tests, typecheck, safe release diagnostics, relevant package/build rails, and diff check.
- [ ] Write the implementation report, PR traceability, merged-main proof, and closeout.

## Progress notes

- Rebased on e5070de, the GUI-092 merge commit.
- Added exact-file recovery from the single local package; the helper cannot run Electron Builder.
- PASS: npm run test:scripts (66 tests), npm run typecheck, npm run build -w @kanmer/gui, node --check, and git diff --check.
- Safe dry-run was intentionally run with release credentials removed; it refused before mutation with the expected missing-token guidance.
