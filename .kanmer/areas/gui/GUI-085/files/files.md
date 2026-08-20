# Files — GUI-085

## Modify

| Path | Exact change |
|---|---|
| `apps/gui/src/main/kanmerGit.test.ts` | Identify every test that spawns real Git; introduce one named scoped timeout; split pure and real-Git cases where useful; make fixture configuration explicit; prevent unsafe concurrency; improve child-process failure diagnostics; retain genuine worktree/repository coverage. |
| `apps/gui/src/main/kanmerGit.ts` | Inspect only first. Modify only if the test demonstrates a real unawaited process, leaked handle, shell invocation, or nondeterministic production race. Do not change production behavior merely to shorten a valid integration test. |
| `apps/gui/package.json` | Ensure the existing GUI test command includes the file and exits cleanly. Change only if a dedicated existing integration-test script must be wired into the root rail; do not create an uncalled script. |
| `package.json` | Inspect root `test`/`verify` routing. Modify only if the GUI workspace is currently omitted; otherwise no change. |
| `scripts/verify.mjs` | Inspect CORE-031's shared steps to confirm the GUI tests are reached. Do not add a second invocation. |

## Add only if the suite has no reusable fixture

| Path | Purpose |
|---|---|
| `apps/gui/src/main/test/realGitFixture.ts` | Small test-only helper to create/configure/dispose local repositories, spawn Git with argument arrays, set deterministic environment, and report durations. Add only if keeping the helper in the test file would duplicate existing test infrastructure or obscure cases. |

## Inspect / consider

| Path | Reason |
|---|---|
| `apps/gui/vitest.config.ts` or `apps/gui/vitest.config.*` | Confirm current timeout/environment/project configuration. Keep the default five-second budget for pure tests unless a dedicated integration project already exists. |
| `vitest.config.ts` / workspace config at repository root | Confirm whether workspace-level settings override the GUI config. |
| `apps/gui/src/main/kanmerGit*.test.ts` | Reuse any existing Git fixture/timeout convention and avoid parallel competing helpers. |
| `apps/gui/src/main/ipc.test.ts` and other main-process tests | Check teardown/spawn conventions and whether open handles are already handled centrally. |
| `.github/workflows/pr.yml` | Confirm Windows runner and that `npm run verify` reaches the suite. Do not add a GUI-specific duplicate job. |
| `.gitignore` | Ensure fixture paths live under OS temp directories rather than adding repository-local ignored debris. |
| `AGENTS.md` verification sections | Preserve the repository's Windows-test requirement and shared verification rail. |
| `GUI-085` scratch notes | Preserve any captured failing command/duration and incorporate it into regression assertions. |

## Required test scenarios

- clean temporary repository initialization;
- local user identity independent of global config;
- initial commit and branch/status operation used by production helper;
- worktree creation/listing/removal cases already covered by the suite;
- paths containing spaces and Windows separators where existing behavior requires them;
- subprocess non-zero exit with stderr surfaced;
- fixture cleanup after passing and failing assertion;
- repeated serial execution without timeout.

## Do not modify

- Global Vitest timeout for all unit tests unless measurement and an existing integration project make it unavoidable.
- Tests to use `retry`, `sleep`, network remotes, credentials, or developer global Git config.
- Production Git semantics without a separately demonstrated defect.
- The Windows runner choice.
- The root verification rail to exclude this test.
- Board-worktree or real repository state while testing.
