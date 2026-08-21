# Verification proof — GUI-099

Verified on merged main at commit d9379d32ffa775ab1ef957dd58ac65acb6e29fca.

## Merge and traceability

- PR #124 is MERGED: https://github.com/collisionengineers/kanmer/pull/124.
- Merge commit: d9379d32ffa775ab1ef957dd58ac65acb6e29fca, merged 2026-08-21T18:57:31Z.
- Implementation commits 0d8c3ecf5caad52fed282939a059af0feef74455 and dbbdf0fbacb541e2b4330d6fd0acabf0fa4088a1 are reachable from merged main.

## Merged-result evidence

- npm run test:scripts: exit 0; 75/75 passed, including four installer-owned launcher contract tests.
- npm test on the implementation lane: exit 0; manual freshness, core 256/256, GUI 337/337, HTTP 61/61, scripts 75/75.
- npm run typecheck: exit 0 for every workspace.
- npm run dist:check: exit 0; packaged Windows installer built and updater package checks 8/8 passed.
- Windows lifecycle evidence recorded by the implementation lane: fixed launcher bytes, HKCU InstallDir ownership, --probe, cwd/stdout/stderr inheritance, exact child exit propagation, upgrade/repair replacement, incomplete-update safety, obsolete-uninstaller protection, owning uninstall cleanup, and restored test state.
- Launcher contract checks assert fixed path/key/system-reg resolution, no cwd change, no arbitrary argument forwarding, distinct refusal exits, and no child execution on invalid state.
- git diff --check: exit 0.

## Review disposition

Independent review PASS is recorded in scratch/review.md. No provider registration or GUI-100/101/102 work was included; no unrelated configuration or generated artifact changed.
