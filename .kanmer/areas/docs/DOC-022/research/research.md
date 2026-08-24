# Research — DOC-022: v0.3.5 release notes

## Question

What single, accurate release-notes change describes the merged release-verification repair for the next successor release without claiming that v0.3.4 was published or changing release behavior?

## Findings

- Live GitHub `main` is `0c957cfea1cd53a30d4ca13d5d6b7e6fdc7421a0`, the CORE-097 merge. Its tag workflow's package-check step explicitly runs `npm run dist -w @kanmer/gui -- --publish never`.
- CORE-097 proof records that the tag workflow remains `contents: read` and has no publisher token mapping for that package step. It verifies package output only; it does not create or repair a release.
- `apps/gui/release-notes.md` still begins with `## 0.3.4`. The release process refuses a requested version whose release notes are absent, so v0.3.5 needs the new top section before governed release preparation.
- `scripts/release.mjs` remains the governed local publisher: its post-merge publish phase uses the separate explicit publication path. This release note must distinguish verification packaging from actual publication.
- DOC-021 is the precedent for a release-notes-only protected-main PR: scope one Markdown file, run `node --test scripts/release-notes.test.mjs` and `git diff --check`, then stop for independent review.

## Implications

Insert a concise `## 0.3.5` section above 0.3.4. It should say tag-triggered verification packages and checks the updater in explicit non-publishing mode, and that governed local publishing remains responsible for release publication. It must not describe a v0.3.4 release, asset upload, or a workflow/configuration change beyond its user-visible outcome.

## Open questions

- None. The ticket specifies the required wording boundary and CORE-097 supplies the merged implementation evidence.
