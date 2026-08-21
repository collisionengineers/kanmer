# Checklist — GUI-093

- [ ] Rebase GUI-093 on merged main containing GUI-092's one-package release workflow.
- [ ] Preserve the sole post-tag Electron Builder package and its local packaged-app/coherence rails.
- [ ] Add a dependency-injected publication/recovery decision helper.
- [ ] Retain a publisher error rather than terminating before remote verification.
- [ ] Accept a publisher error only after remote asset verification proves the release complete.
- [ ] Build exact clobber upload arguments from the expected local paths and GitHub-safe asset names.
- [ ] Repair an incomplete release once from those exact files, without any Electron Builder run.
- [ ] Re-verify remote assets after the bounded repair and refuse with actionable diagnostics when still incomplete.
- [ ] Add deterministic tests for success, 422-with-complete-assets, partial repair, failed repair, bounded attempts, and no second package.
- [ ] Update release diagnostics/dry-run prose and only any genuinely stale FRD wording.
- [ ] Run script tests, typecheck, safe release diagnostics, relevant package/build rails, and diff check.
- [ ] Write the implementation report, PR traceability, merged-main proof, and closeout.

## Progress notes

- Prepared against GUI-092's explicit one-package constraint. Implementation starts only after that ticket's merged main is available, because both tickets modify the same release control flow.
