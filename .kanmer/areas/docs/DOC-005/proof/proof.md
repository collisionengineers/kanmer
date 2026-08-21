# Proof — DOC-005

## Merged-main verification

Verified on the repository main checkout after PR #138 merged at 2026-08-21T23:01:40Z. Main HEAD is af6edf7f782b12e2dac455276e6804ab491d0bd3, and the scoped fix commit 75dc1ad955369db2cd0e85bd486441db94913c5e is reachable. The original operating-rule implementation from PR #26 (1df633e7dd4b424ac0a7107ac08d2289c61260dd) remains reachable.

## Scope and behavior

The release-notes generator remains read-only, derives Done-since-tag entries from board data, groups by area, and now normalizes shorthand PR references such as 96 and #96 through the origin remote into canonical /pull/96 Markdown links while preserving existing absolute URLs and safe fallback behavior. The regression test asserts the canonical link and rejects a bare shorthand link.

## Verification

- node --test scripts/release-notes.test.mjs — PASS, 1/1.
- verify:agents-block — PASS, 31/31 in the ticket worktree and merged-main rail.
- npm run test:scripts — PASS, 80/80 in the ticket lane.
- npm run typecheck — PASS in the ticket lane.
- npm run build:core — PASS; required generated core output for the release-notes runner.
- git diff --check — PASS.
- PR #138 GitHub verify — FAIL only at the pre-existing Windows GUI path assertion (runneradmin versus RUNNER~1); no DOC-005 files were implicated and the failure is retained rather than relabelled.

## Review and limitations

Independent review found no blocking defect. The ticket is a documentation/rail fix; no interactive or provider-host proof is applicable.

## Result

PASS for the scoped release-notes normalization and merged-main traceability.
