# Research — GUI-129: Windows settings-file rename locks

## Question

Why can the real GUI settings persistence test fail while atomically replacing `settings.json` on Windows, and what smallest change keeps replacement atomic while still surfacing an unrecoverable write error?

## Findings

- `apps/gui/src/main/settings.ts` at `origin/main` `9a75bd690a80bf070bb8ddc372b3a95fa03ec789` writes a unique temporary sibling and immediately calls synchronous `renameSync(temporary, target)`. It creates the target directory first, so a missing directory is not the observed condition; a transient Windows handle/AV lock on either sibling is not retried.
- Every public settings mutator reaches `writeSettings` while inside `withSettingsFileLock`. The queue serializes in-process read-modify-write operations, but it cannot prevent an external process from briefly holding a file handle.
- `apps/gui/src/main/settings.test.ts` uses one fixed global `C:\\Windows\\Temp\\kanmer-gui075-settings` root for the Electron mock and removes it after each test. Reusing a globally named Windows fixture makes an interrupted/overlapping worker or delayed external handle share the same target directory.
- The ticket records the observed intermittent `EPERM` at the production `renameSync` path. This investigation did not manufacture a Windows file-lock failure; the repeatable regression test must simulate only the rename error and assert that retry is bounded and a persistent error is still thrown.
- FRD-019 R7 requires settings persistence as part of the desktop shell. It does not authorize changing the settings format, suppressing persistence errors, or widening this ticket to remote-access, tunnel, or MCP readiness behavior.

## Implications

Use a narrowly scoped helper around the final rename: retry only Windows transient `EPERM`/`EBUSY` failures for a fixed small attempt budget, leave the temporary file in place on a final failure so the original error surfaces, and preserve the existing write-then-rename atomicity. Make the test root unique per test-process/run and add deterministic mocked tests for both eventual success and final error propagation. No new dependency or schema change is needed.

## Open questions

None. The retry budget and error codes are implementation constants constrained by the deterministic tests and reviewer inspection; they do not require product or operator input.
