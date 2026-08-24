# Proof — DOC-021: v0.3.4 release notes

## Merged artifact

- Pull request: #242, merged by the normal protected-main squash path on 2026-08-24T18:11:55Z.
- Reviewed PR head: `0d68bc0d8a7afe9f16fdf8352bc284bee20b33e9`.
- Merged-main SHA verified locally and against `origin/main`: `be15545a90af27f08e2124e7aaf39c4bcc3b51dc`.
- Verification checkout: `.worktrees/doc-021`, detached at that exact merge SHA. The board worktree and dirty root checkout were not used.

## Merged-main checks

| Command / inspection | Result |
| --- | --- |
| `git diff-tree --no-commit-id --name-only -r be15545a90af27f08e2124e7aaf39c4bcc3b51dc` | PASS — only `apps/gui/release-notes.md` changed. |
| `git diff --check be15545a90af27f08e2124e7aaf39c4bcc3b51dc^ be15545a90af27f08e2124e7aaf39c4bcc3b51dc` | PASS — exit 0. |
| `npm run build:core` | PASS — exit 0; Core ESM and declaration build completed. |
| `node --test scripts/release-notes.test.mjs` | PASS — exit 0; 1 test passed, 0 failed. |
| Merged file inspection | PASS — top heading is `## 0.3.4`; source declarations remain preferences that do not install, authenticate, or grant access; remote-access text says the correct origin route and delayed-readiness polling were fixed, without promising a direct diagnostic. |
| `git status --short` after checks | PASS — clean verification worktree. |

## Result

The merged result satisfies DOC-021's scoped release-note requirement. No release tag, package publication, asset generation, provider configuration, branch deletion, worktree deletion, or closeout action was performed as part of this verification.
