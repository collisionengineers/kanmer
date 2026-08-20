# Open questions — GUI-085

## Resolved decisions

- **Should the root/default Vitest timeout be raised?** No. Apply a named timeout only to tests that execute real Git.
- **Should real Git be mocked away?** No. Preserve real repository/worktree integration coverage; extract only genuinely pure logic into normal unit tests.
- **Initial timeout budget?** Use 30 seconds for scoped real-Git cases, then lower only if repeated Windows CI evidence supports it. Never make it unlimited.
- **May tests retry after timeout?** No. Retries and sleeps conceal nondeterminism.
- **May tests use global Git configuration?** No. Configure identity/default branch/line endings locally in each fixture or canonical fixture helper.
- **Can real-Git tests run concurrently?** Default to serial. Permit concurrency only where every case has an isolated repository and measured evidence shows no shared process/path contention.
- **Should production `kanmerGit.ts` change?** Only if instrumentation proves a real unawaited process, leaked handle, shell misuse, or race. A slow but correct child process is a test-budget issue.
- **Where should cleanup occur?** In guaranteed teardown/finally logic; cleanup must happen on both assertion success and failure.
- **What evidence closes the defect?** At least ten consecutive Windows runs of the target file, a green full GUI suite, and a green root verification run/PR job.

No unresolved implementation questions remain.
