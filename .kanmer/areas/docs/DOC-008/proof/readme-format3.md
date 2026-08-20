# Proof — DOC-008: README format-3 correction

## Merged change

- PR: https://github.com/collisionengineers/kanmer/pull/66
- Merge commit on `main`: `a24c480280c36e8d248065c97e3e5f836914e3d8`
- Verified checkout: `main` after the merge.

## Acceptance evidence

- Read the merged README and compared the changed user-facing sections with `docs/manual/stages.md`, `docs/manual/documents.md`, and `docs/manual/settings.md`.
- The README now describes the fixed sequence **Backlog → Preparing → Implementing → Review → Verifying → Done**; it explains Preparing, names all seven folder-based document types, omits a priority field from the sample, and describes the current Editor, filter, and Settings surfaces.
- A scoped residual search for `format: 2`, `Migrate to v2`, `impact.md`, and `Todo → Planning` in `README.md` returned no matches. The command's exit code was 1 solely because ripgrep found zero matches.

## Automated verification on merged main

| Command | Result |
|---|---|
| `npm run check:manual` | Passed — manual up to date (19 chapters). |
| `npm test -w @kanmer/core` | Passed — 249 tests. |
| `npm test -w @kanmer/gui` | Passed — 277 tests. |
| `npm run test:scripts` | Passed — 46 tests. |
| `git diff --check` | Passed — no whitespace errors. |

The GUI suite was rerun independently after a concurrent test run caused a transient Windows temporary-directory lock; the isolated merged-main run passed all 277 tests, including `kanmerGit.test.ts`.

## Closeout metadata

PR #66 merged at `2026-08-20T20:48:35Z`: https://github.com/collisionengineers/kanmer/pull/66.
