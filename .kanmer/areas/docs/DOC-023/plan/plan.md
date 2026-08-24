# Plan — DOC-023: Document v0.3.6 successor release notes

## Approach

Add one concise v0.3.6 section at the top of `apps/gui/release-notes.md`. It will state only the externally relevant merged behavior: publisher mode builds the Windows GUI before tag creation, so a GUI-build failure prevents tag/release publication; tag-triggered workflow packaging stays explicitly non-publishing. This is chosen over describing implementation internals or historical failure records because the notes must accurately guide the governed successor release without asserting that v0.3.4 or v0.3.5 became public releases.

## Governing docs

- **Meets `docs/functional/frd/FRD-021-auto-update.md`** — records a version-specific, accurate release note before the governed v0.3.6 preparation; preserves the distinction between protected/tag verification and the local publisher responsible for a public updater release. No governing document is modified.

## Steps

1. Insert a `## 0.3.6` entry immediately above `## 0.3.5` in `apps/gui/release-notes.md`, accurately stating pre-tag Windows GUI build protection and non-publishing tag verification.
2. Inspect the one-file diff to ensure it does not alter older release records or introduce claims about v0.3.4/v0.3.5 releases, tags, assets, credentials, workflows, or publisher implementation.
3. Run the focused release-notes test and whitespace/diff validation; record real exit codes.
4. Commit only the release-notes file, open a DOC-023-footer PR, record the author report and traceability, then enter Review for independent review.

## Verification

Run `node --test scripts/release-notes.test.mjs` and `git diff --check` in the dedicated worktree. Inspect `git diff -- apps/gui/release-notes.md` and `git diff --name-only origin/main...HEAD` to prove the PR changes only the intended file. The post-implementation report will hand those commands to the merged-main verifier; no proof is written before merge.

## Risks / open questions

- Risk: wording could overstate a source-order fix as publication. Mitigation: retain the explicit non-publishing workflow sentence and state that a GUI build failure stops before tag/release publication.
- No unresolved questions; any later v0.3.6 preparation, publishing, or public asset verification remains with [[CORE-099]].
