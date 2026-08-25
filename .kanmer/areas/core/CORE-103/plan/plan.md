# Plan — CORE-103

## Governing document

FRD-021 requires a public release whose updater assets and installed update behavior are verified.

## Execution

1. Use a fresh clean clone of merged `main`.
2. Run `npm ci --ignore-scripts` and `npm run release -- 0.3.8 --ticket CORE-103 --dry-run`.
3. If the dry run passes, run `npm run release -- 0.3.8 --ticket CORE-103`. This preparation phase creates `release/v0.3.8`, commits and pushes only the release branch, opens a PR targeting `main`, and must not create a tag or release asset.
4. Independently review and merge the release PR through protected `main`.
5. From a fresh clean `main` at the PR's full GitHub merge SHA, provide the publisher credential only to that process and run `npm run release -- 0.3.8 --publish --release-commit <full-merge-sha>` exactly once.
6. Record the immutable tag target, GitHub Release, strict asset-verifier result, and terminal tag workflow.
7. Starting from the installed v0.3.7 app, complete the updater flow to v0.3.8 and confirm the restarted GUI and packaged MCP runtime identities plus preserved settings and remote-provider health.
8. Write proof. Any release failure remains on this ticket without retagging, manual asset upload, or creating an automatic successor.
