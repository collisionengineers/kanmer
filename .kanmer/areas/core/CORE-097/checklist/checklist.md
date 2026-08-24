# Checklist — CORE-097

- [x] Update only the tag workflow package-check step to pass `--publish never` to Electron Builder while retaining the existing build and package-check inputs.
- [x] Preserve read-only workflow permissions, the later asset-verifier token mapping, tag trigger, and retry behavior.
- [x] Add the static release-workflow regression coverage.
- [x] Update the affected `AGENTS.md` release-verification description.
- [x] Run the focused static test and the full script-test suite.
- [x] Run the exact non-publishing package/check sequence in the isolated ticket worktree (the default ignored output hit Windows `EBUSY`; the documented isolated-output retry passed 8/8).
- [x] Run `npm run verify` from a clean GitHub-origin normal clone at the committed head.
- [ ] Commit, push, open a PR with `Kanmer: CORE-097`, record CI/security evidence, and move the ticket to Review.
