# Proof — CORE-097: non-publishing tag release verification

## Merged artifact

- Pull request: [#245](https://github.com/collisionengineers/kanmer/pull/245)
- Reviewed PR head: `a029e5aba3b012403616d234b09c4a3c0fc9b614`
- Squash merge on `main`: `0c957cfea1cd53a30d4ca13d5d6b7e6fdc7421a0`
- Verification used a clean, disposable detached clone at that merge commit. The repository root and Kanmer board worktree were not used for build output.

## Scope and read-only contract

`git diff-tree` for the merge reports exactly these files:

- `.github/workflows/release.yml`
- `AGENTS.md`
- `scripts/release-flow.test.mjs`

The workflow's top-level permission remains `contents: read`. Its updater-package step contains exactly:

```sh
npm run build
npm run build -w @kanmer/gui
npm run dist -w @kanmer/gui -- --publish never
node scripts/check-updater-package.mjs
```

A focused assertion confirmed the package step has no `env:` mapping and no `GH_TOKEN`. `git diff --check` and the clean-worktree assertion both exited 0.

## Merged-main evidence

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Exit 0 |
| `npm run verify` | Exit 0 (`VERIFY_EXIT_0`): core 310/310, GUI 468/468, MCP HTTP 102/102, script tests 99/99, typecheck, build, smoke, documentation, managed-block, skill, and plugin-sync checks all passed |
| Build plus local updater package sequence | Exit 0 (`NON_PUBLISHING_PACKAGE_EXIT_0`) |
| `npm run dist -w @kanmer/gui -- --publish never` | Electron Builder completed the Windows package locally with the explicit non-publishing flag |
| `node scripts/check-updater-package.mjs` | Passed all 8 package checks |
| Focused workflow/commit assertions | Exit 0: merge is current `main`, read-only permission and non-publishing package invocation confirmed |

No tag, GitHub release, asset upload, or package publication was triggered during verification. `git tag --points-at 0c957cfea1cd53a30d4ca13d5d6b7e6fdc7421a0` produced no tag.

## Result

**PASS.** The merged workflow can perform the updater-package verification locally without acquiring publishing authority, credentials, broader workflow permissions, or publishing a release.
