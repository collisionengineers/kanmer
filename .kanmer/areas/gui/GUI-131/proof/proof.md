# Proof — GUI-131: pre-tag GUI build on the publisher path

## Merged artifact

- Pull request: [#248](https://github.com/collisionengineers/kanmer/pull/248)
- Reviewed head: `64fe347143478f4612e18287f94a471f2f8e0d4a`
- Merged `main` commit: `3abef518bedbe79647070a84038779644fbc0fa2`
- GitHub reports both required PR checks successful: `verify` and `kanmer-gate`.
- Verification used a clean disposable detached clone at the merge commit; after fetch, `origin/main` resolved to the same SHA. The root checkout and board worktree were not used for build output.

## Exact shipped source change

The merge path census is exactly:

```text
AGENTS.md
scripts/release-flow.test.mjs
scripts/release.mjs
```

The source now invokes the existing `npm run build -w @kanmer/gui` synchronously in `publishMode`, after merged-manifest and release-commit reachability preconditions and before immutable tag creation and tag push. The focused regression statically enforces:

```text
GUI build < git tag < git push origin refs/tags/...
```

AGENTS.md documents the same protected-main/local-publisher boundary: a GUI-build failure occurs before any tag or GitHub Release exists. Its managed Kanmer block was separately verified unchanged.

## Merged-main evidence

| Command / check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Exit 0 |
| `npm run build:core` | Exit 0 |
| `node --test scripts/release-flow.test.mjs` | Exit 0: 7/7 passed |
| `npm run test:scripts` | Exit 0: 100/100 passed |
| `npm run verify:agents-block` | Exit 0: 31/31 passed |
| `npm run verify:docs` | Exit 0 |
| `git diff --check 3abef518bedbe79647070a84038779644fbc0fa2^ 3abef518bedbe79647070a84038779644fbc0fa2` | Exit 0 |
| Structural source-order/path-census/tracked-clean assertion | Exit 0 (`GUI131_SOURCE_CONTRACT_ASSERTION_EXIT_0`) |
| `npm run verify` from the normal detached clone | Exit 0: Core 310/310, GUI 468/468, MCP HTTP 102/102, scripts 100/100, typecheck, documentation, MCP/headless/protocol/discovery smoke, MCPB, skills, managed-block, and plugin synchronization all passed |
| Post-rail tracked-clean assertion | Exit 0 (`GUI131_POST_VERIFY_CLEAN_EXIT_0`) |

### Verification observation retained

One preliminary inline Node assertion ended with exit 1 because PowerShell corrupted its JavaScript string escaping before the assertion could inspect source. All repository commands preceding it in that sequence had already passed. No source or test was changed; the invariant was rerun as a native PowerShell structural assertion and passed as recorded above.

## Release boundary

This proves the **source fix only**: a publisher-path GUI build failure stops before a tag, GitHub Release, Electron Builder publish, or asset upload. No `release.mjs` invocation, Electron Builder installer package, tag operation, publication, GitHub Release, or asset upload was run during verification; existing v0.3.4 and v0.3.5 records were not changed.

**Actual successor release evidence remains separately required through [[CORE-098]].** This proof does not claim that any successor tag, release, installer, updater manifest, or asset has been published.

## Result

**PASS.** The merged source enforces the required pre-tag GUI-build ordering and regression protection without broadening release authority or changing existing release records.
