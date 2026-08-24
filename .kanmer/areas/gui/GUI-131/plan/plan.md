# Plan — GUI-131: build GUI before the immutable publish tag

## Objective

Repair the source-owned `--publish` control-flow gap: require the existing GUI build to succeed before `release.mjs` creates or pushes the immutable release tag. A packaging build failure must therefore stop publication before any tag or GitHub Release can be created.

## Governing docs

- **FRD-021 R3** requires `release.mjs` to enforce release discipline and the packaged app to be verifiable for self-update. A publish path that feeds Electron Builder no GUI bundle cannot satisfy that requirement.
- **HZN-007 context** requires a bounded, source-owned remediation with exact evidence, adjacent board stages, independent review, and no unapproved release action.
- **AGENTS.md rule 24** requires a PR that changes commands or conventions to update contributor instructions in the same PR. The human-owned contributor guidance will document the protected-main/local publisher sequence and the pre-tag GUI-build failure boundary, without changing the managed Kanmer block.
- This ticket has no frontmatter `refs`; this plan does not amend governance. It applies the existing FRD-021 release-owner contract only.

## Chosen approach

1. Keep the existing shared `VERIFY_STEPS`, merged-manifest check, and release-commit reachability check unchanged.
2. In the `publishMode` branch of `scripts/release.mjs`, invoke the existing `npm run build -w @kanmer/gui` command immediately after those publish preconditions and before the later `git tag` / `git push origin refs/tags/…` commands.
3. The existing `run()` helper is synchronous through `execSync`; consequently the build is awaited. A non-zero GUI-build exit prevents the tag creation, tag push, direct Electron Builder publisher, release creation, asset handling, and all following publication checks.
4. Retain the existing preparation-mode GUI build and the one-package publish behavior. The new publish-path build produces the untracked Electron Vite input before the single existing `npx electron-builder --win --publish always` invocation; it must not invoke Electron Builder twice.
5. Extend `scripts/release-flow.test.mjs` with a focused source-order regression: it must prove the publish precondition block calls the synchronous GUI build, that this call precedes both immutable tag creation and tag push, and that no release command is run by the test.

## Files and boundaries

- **Modify:** `scripts/release.mjs` — add only the publish-path GUI-build prerequisite.
- **Modify:** `scripts/release-flow.test.mjs` — assert the publish-path synchronous call and irreversible-action ordering.
- **Modify:** `AGENTS.md` outside its managed Kanmer block — document local publish mode's GUI build before immutable tag creation/push, and that build failure stops before a tag or release exists.
- **Do not modify:** the AGENTS.md managed Kanmer block, Electron Builder configuration, GUI package scripts, GitHub Actions workflows/permissions, credentials, release asset recovery semantics, tags, releases, or any release ticket state.
- **Do not run:** `release.mjs`, packaging, publication, tag mutation, manual uploads, or an actual publishing command.

## Verification

1. Run `node --test scripts/release-flow.test.mjs`; it must pass the new ordering assertion without creating any tag or release.
2. Run `npm run test:scripts` to cover the repository script-test suite containing the focused regression.
3. Run `npm run typecheck` if the isolated worktree dependencies permit it; record its exit.
4. Run `npm run verify:agents-block` after the AGENTS.md prose update to prove its managed block remains canonical.
5. Run the authoritative `npm run verify` from a fresh normal GitHub-origin clone of the exact branch head after the commit, because plugin synchronization refuses linked worktrees. Preserve every failure rather than retrying.
6. Record the exact diff, commit, PR, and check state in the implementation report; wait for independent review before any merge or later release lifecycle work.

## Risks and mitigations

- **Risk:** moving the GUI build after tag creation could strand another immutable tag on a failed package. **Mitigation:** the regression test requires build < tag < tag push.
- **Risk:** a second package would produce divergent NSIS assets. **Mitigation:** add only Electron Vite's existing build command; retain exactly one direct Builder publisher invocation.
- **Risk:** widening into workflows, credentials, or release repair semantics. **Mitigation:** those paths are explicitly out of scope and no test exercises them.

## Stop condition

Stop with GUI-131 in Review at an open PR that contains only the control-flow prerequisite, its regression test, and the required AGENTS.md contributor guidance. Do not self-review, merge, tag, publish, write proof, or close out.
