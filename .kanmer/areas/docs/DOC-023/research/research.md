# Research — DOC-023: v0.3.6 successor release notes

## Question

What single, accurate v0.3.6 release-notes entry describes the merged pre-tag GUI-build protection and the non-publishing tag workflow without claiming the failed v0.3.4 or v0.3.5 attempts became public releases?

## Findings

- Live protected `main` is `3abef518bedbe79647070a84038779644fbc0fa2`, the verified GUI-131 merge. Its publisher source invokes `npm run build -w @kanmer/gui` after publish preconditions and before `git tag` / tag push, so a GUI-build failure cannot create the next immutable tag.
- GUI-131's merged outcome records that this source-order fix changes no existing tag, release, installer, updater manifest, or asset. It is the behavior this documentation must describe, not a claim that a release was published.
- The tag workflow's package check explicitly builds GUI and runs `npm run dist -w @kanmer/gui -- --publish never`. It is a non-publishing verification path; the local governed publisher remains the only publication path.
- `apps/gui/release-notes.md` currently starts with `## 0.3.5`, so v0.3.6 needs a new top section before governed release preparation can satisfy its release-notes version guard.
- [[DOC-022]] is the direct narrow-scope precedent: one release-notes file, the focused `node --test scripts/release-notes.test.mjs` check, and a protected-main PR with no workflow/publisher/tags/assets changes.

## Implication

Add a concise `## 0.3.6` section above v0.3.5. It must say that publication builds the Windows GUI before tag creation, preventing GUI-build failures from creating a tag or release, and that tag-triggered workflow verification remains explicitly non-publishing. It must not call v0.3.4 or v0.3.5 public releases or imply that the release note itself changes publishing behavior.

## Open questions

None. The ticket gives exact wording boundaries and GUI-131 provides merged implementation evidence.
