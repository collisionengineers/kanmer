# Post-implementation report — DOC-022

## Summary

PR [#246](https://github.com/collisionengineers/kanmer/pull/246) adds the v0.3.5 release-notes entry only. It accurately states that tag-triggered verification builds and checks the Windows updater package in explicit non-publishing mode, while the governed local publisher alone creates and publishes releases after its protected-main preparation and merge boundary.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/release-notes.md` | Added the top `0.3.5` section and one user-facing entry. | The next governed release preparation requires version-specific notes, and the entry communicates the CORE-097 release-boundary repair without confusing verification with publication. |

## Governing docs

- **FRD-021 R3:** The release-note version guard remains satisfied and the wording preserves release discipline: protected-main preparation and the governed local publisher remain the sole path to publication.
- **CORE-097:** The note reflects its merged proof that tag verification packages with explicit `--publish never` and has no publication authority.
- No governing document was modified and no new design decision was introduced.

## Risks / follow-ups

- The first focused test run exited 1 before assertions because the new clean worktree lacked `packages/core/dist/index.js`. After `npm run build:core` exited 0, the unchanged test passed. This is recorded as an environment prerequisite, not hidden or weakened.
- Actual v0.3.5 publication and asset evidence remain with [[CORE-098]]. This PR makes no tag, release, asset, workflow, manifest, script, or publisher change and does not claim v0.3.4 was published.

## Verification hand-off

On merged main, verify:
- `node --test scripts/release-notes.test.mjs` exits 0 after the usual Core build prerequisite;
- `git diff --check <merge>^ <merge>` exits 0;
- the merge changes only `apps/gui/release-notes.md`;
- the top section is `## 0.3.5`, accurately distinguishes explicit non-publishing tag verification from the governed local publisher, and does not assert a v0.3.4 publication.
