## Self-review — 2026-08-21

I am both author and reviewer; this is not an independent review.

### Changes checked

- `scripts/release.mjs` now catches the sole Electron Builder publisher error and still reaches local/remote release proof.
- `scripts/release-publish.mjs` is the only bounded-recovery component. It accepts no package operation, uploads only caller-supplied exact local files, and has one repair/recheck maximum.
- `scripts/release-publish.test.mjs` covers complete-after-422 acceptance, partial-release repair, repair/check failure, explicit GitHub names, and bounded attempts.
- `FRD-021`'s GUI-066 as-built note was corrected from the stale second Electron Builder re-publish description to the GUI-092/GUI-093 exact-file one-package recovery. R3 itself and updater runtime code are unchanged.

### Comments and disposition

- Blocking: none.
- The apparent GUI-092 recovery conflict was resolved by exact `gh release upload --clobber` of the single package's existing files, never a second Electron Builder run. Fixed in PR.
- External installed-client acceptance remains correctly deferred to [[GUI-068]]; it is parked, not an untracked requirement.

### Evidence

- PASS: `npm run test:scripts` — 66 tests.
- PASS: `npm run typecheck`.
- PASS: `npm run build -w @kanmer/gui`.
- PASS: `npm run check:manual` and `git diff --check origin/main...HEAD`.
- Safe dry run with release credentials removed refused before mutation as expected.

### Verdict

PASS. PR #103 matches the plan, report, and FRD-021. It preserves the one-package invariant and makes publisher-error verification/recovery reachable.
