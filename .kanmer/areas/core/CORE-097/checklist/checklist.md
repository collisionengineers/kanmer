# Checklist — CORE-097

- [ ] Update only the tag workflow package-check step to pass `--publish never` to Electron Builder while retaining the existing build and package-check inputs.
- [ ] Preserve read-only workflow permissions, the later asset-verifier token mapping, tag trigger, and retry behavior.
- [ ] Add the static release-workflow regression coverage.
- [ ] Update the affected `AGENTS.md` release-verification description.
- [ ] Run the focused static test and the full script-test suite.
- [ ] Run the exact non-publishing package/check sequence in the isolated ticket worktree.
- [ ] Run `npm run verify` from a clean GitHub-origin normal clone at the committed head.
- [ ] Commit, push, open a PR with `Kanmer: CORE-097`, record CI/security evidence, and move the ticket to Review.
