# Research — GUI-127

## Question

Why does the authoritative Windows verification rail leave real-Git fixtures behind and fail in GUI `kanmerGit.test.ts`, despite GUI-085 having raised the test timeout?

## Findings

1. On 2026-08-24, local `npm run verify` built core and MCP successfully, then passed all 266 core tests. The GUI suite failed only in `src/main/kanmerGit.test.ts`: the two `renameBoardBranch` tests exceeded the default 10-second hook timeout and `afterEach` reported `EPERM` while deleting their OS-temp fixture roots.
2. The test body already uses a named `REAL_GIT_TEST_TIMEOUT_MS = 30_000` through `realGitTest`, but its cleanup is `afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 3 }))`. That hook retains Vitest's default 10-second bound and performs synchronous removal with a short retry budget.
3. The test fixture creates a local bare remote plus a source repository and board worktree. It is deliberately an integration test: `ensureBoardWorktree` and `renameBoardBranch` run real Git commands against only temporary local paths. The production helper awaits `execFile`; there is no current evidence of a production subprocess leak.
4. After the failed root run, no live `git` process was present, yet the operating-system temporary directory contained many `kanmer-git-*` roots, including the two failure roots. This proves the test harness cleanup is not reliably completing on this Windows host.
5. GUI-085 correctly scoped a 30-second budget to real-Git test bodies, but its proof only recorded two focused passes and did not validate the cleanup hook under the current authoritative root rail. Its explicit design rule was to avoid global timeouts, sleeps, retries, skips, or production changes.

## Implication

The narrow fix should make teardown asynchronous and bounded, with a hook timeout that covers the bounded deletion period. It must preserve real Git assertions and make leftover fixture roots a failure, not silently ignore them. Production `kanmerGit.ts` should remain unchanged unless a focused test proves it leaves a live child or worktree behind.

## Evidence sources

- `apps/gui/src/main/kanmerGit.test.ts` — fixture, test timeout wrapper, and synchronous cleanup hook.
- `apps/gui/src/main/kanmerGit.ts` — Git subprocess helper and board-worktree operations.
- GUI-085 plan/proof — prior scoped-timeout decision and evidence boundary.
- Local command: `npm run verify` (exit 1 on GUI cleanup); `Get-Process git` (none) and inspected OS-temp `kanmer-git-*` roots.
