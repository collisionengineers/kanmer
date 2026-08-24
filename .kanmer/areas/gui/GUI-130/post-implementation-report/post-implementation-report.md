# GUI-130 post-implementation report

## Delivered

Commit `8c7ae11128936c62f9996db5342933a6e6008706` changes only two files:

- `apps/gui/package.json` changes the existing GUI test command to `vitest run --no-file-parallelism`.
- `AGENTS.md` retains CORE-095's filesystem/lock rationale and adds the GUI real-Git Windows-contention rationale. It explicitly states that both package commands retain their existing finite test and hook bounds.

No production GUI code, test assertions, fixture behavior, retries, timeout values, root runner configuration, or CORE-095/GUI-129 source was changed.

## Verification

All isolated-worktree commands used the resolved GUI-130 worktree as an explicit npm prefix.

| Check | Result |
| --- | --- |
| `npm --prefix <worktree> ci --ignore-scripts` | PASS (exit 0) |
| `npm --prefix <worktree> run build -w @kanmer/core` | PASS (exit 0) |
| `npm --prefix <worktree> test -w @kanmer/gui -- --run src/main/index.sync.test.ts` | PASS — 11/11, exit 0; 76.43s tests / 89.48s total |
| First full GUI workspace run | PASS — 49 files / 462 tests, exit 0; 349.62s. This run overlapped a separate MCP-048 GUI rail that shared the fixed Electron user-data directory, so it is recorded as concurrency-contaminated and not used as decisive evidence. |
| Isolated rerun of `npm --prefix <worktree> test -w @kanmer/gui` | PASS — 49 files / 462 tests, exit 0; 216.21s. `kanmerGit` 48/48 in 144.99s; `index.sync` 11/11 in 28.30s. |
| `npm --prefix <worktree> run typecheck -w @kanmer/gui` | PASS (exit 0) |
| `npm --prefix <worktree> run build -w @kanmer/gui` | PASS (exit 0) |

### Normal-clone attempts

1. A first clean clone made directly from the ticket worktree failed `npm run verify` with exit 1 after its GUI suite passed 49 files / 462 tests. The clone's `origin` was a local filesystem path, so `scripts/release-notes.test.mjs` generated a Windows-path PR link rather than the required GitHub URL. This is preserved as an invalid local-origin verification setup; it is not relabelled as a pass.
2. The decisive rerun used a fresh normal clone with canonical GitHub `origin`, fetched the already-committed ticket SHA through a separate local remote, then checked out that exact SHA. `npm --prefix <normal-clone> ci --ignore-scripts` and `npm --prefix <normal-clone> run verify` both exited 0.

The decisive full verify passed:

- Core: 310/310
- GUI: 49 files / 462 tests (249.69s); `kanmerGit` 48/48 in 157.60s and `index.sync` 11/11 in 31.62s
- MCP HTTP: 101/101
- Script tests: 98/98
- All-workspace typecheck, documentation verification, MCP smoke (224/224), headless smoke, MCPB check, protocol smoke (46/46), discovery smoke (13/13), skills verification, managed-AGENTS verification (31/31), and plugin sync

## Pull request

[PR #240](https://github.com/collisionengineers/kanmer/pull/240) targets `main`, carries the `Kanmer: GUI-130` footer, and is based on commit `8c7ae11128936c62f9996db5342933a6e6008706`.

## Handoff

The ticket is ready for independent review. The author must not review, merge, write proof, or advance it beyond Review.
