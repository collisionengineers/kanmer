# Plan — DOC-022: Document v0.3.5 release notes

## Approach

Add one concise v0.3.5 section at the top of `apps/gui/release-notes.md`. It will state the released user-facing boundary rather than implementation detail: tag-triggered verification packages and checks the updater with explicit non-publishing mode, and the governed local publisher remains responsible for publication. This is safer than duplicating workflow commands or describing the failed v0.3.4 attempt, neither of which belongs in the next release's user notes.

## Governing docs

- **Meets — `docs/functional/frd/FRD-021-auto-update.md`, R3:** The notes name the version to satisfy release discipline and accurately preserve its protected-main/local-publisher split. The change makes no modification to the FRD, workflow, publisher, or update mechanism.
- **Meets — [[CORE-097]] merged proof:** The wording reflects the verified read-only tag workflow and its explicit `--publish never` package invocation, without claiming a publication.
- **Meets — [[DOC-021]] precedent:** The work remains a one-file documentation PR and stops for independent review before any release action.

## Steps

1. Create `.worktrees/doc-022` on `doc-022-v035-release-notes` from current `origin/main`, then take DOC-022 through Kanmer.
2. Change only `apps/gui/release-notes.md`: insert the v0.3.5 heading and a concise non-publishing-verification/local-publisher entry above the existing 0.3.4 notes.
3. Inspect the Markdown and diff to confirm the new note is accurate, the 0.3.4 content remains intact, and no release/asset claim is introduced.
4. Run the focused release-notes test and `git diff --check`; confirm the path census contains only the release-notes file.
5. Commit the one-file change, push the ticket branch, open a PR with `Kanmer: DOC-022`, record traceability, write the post-implementation report, and move the ticket to Review.

## Verification

- `node --test scripts/release-notes.test.mjs` exits 0.
- `git diff --check` exits 0.
- `git diff --name-only origin/main...HEAD` returns only `apps/gui/release-notes.md`.
- Inspect the top section: it is `## 0.3.5`, says verification is non-publishing, names the separate governed local publisher, and does not assert a v0.3.4 publication.

## Risks / open questions

- Risk: wording could blur read-only verification and publication. Mitigation: compare against CORE-097 proof and FRD-021 before committing.
- No non-parked open questions remain. Publication and asset evidence are explicitly deferred to [[CORE-098]].
