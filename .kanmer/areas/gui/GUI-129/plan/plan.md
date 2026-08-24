# Plan — GUI-129: Harden Windows atomic settings writes against transient rename locks

## Objective

Make the production `settings.json` replacement tolerate a short-lived Windows rename lock while preserving atomic replacement and surfacing a persistent filesystem error. Make the settings test fixture isolated and prove both behaviors deterministically.

## Starting state

At `origin/main` `9a75bd690a80bf070bb8ddc372b3a95fa03ec789`, `writeSettings` writes a unique temporary sibling and calls `renameSync` once. The settings test routes all cases through one fixed `C:\\Windows\\Temp\\kanmer-gui075-settings` directory. `withSettingsFileLock` serializes only in-process mutations.

## Governing docs

- `docs/functional/frd/FRD-019-gui-shell.md` — **Meets** R7 by retaining reliable app-settings persistence. The diff will not modify the FRD, settings schema, or UI behavior.

## Required changes

1. Add a production helper used by `writeSettings` that retries only a Windows `EPERM` or `EBUSY` failure from the final rename on a fixed, short backoff schedule. It must rethrow the final/original non-retryable error and must not change the write-to-temporary-then-rename atomic sequence.
2. Give the settings test a unique temporary root for its mocked Electron `userData` directory so stale or overlapping test state cannot share the target.
3. Add deterministic unit coverage using injected rename/pause inputs to prove eventual Windows transient recovery, the exact bounded retry budget, no retry for a non-transient/non-Windows error, and a persistent transient error surfaces. Keep an integration assertion that a successful real settings write leaves no temporary sibling.
4. Do not change remote-access, OpenAI tunnel, MCP readiness, settings serialization, or dependencies.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `apps/gui/src/main/settings.ts` | Production retry helper and its sole caller, retaining synchronous atomic write semantics. |
| Modify | `apps/gui/src/main/settings.test.ts` | Unique fixture setup plus deterministic retry/error/cleanup evidence. |
| Inspect | `docs/functional/frd/FRD-019-gui-shell.md` | Governing R7 behavior; no edit. |

## Do not modify

- `apps/gui/src/main/remoteAccess/**`
- `apps/gui/src/main/openaiTunnel.ts`
- `packages/mcp-server/**` or any `MCP-048` source/test
- settings schema, committed artifacts, dependencies, or global test-runner configuration

## Constraints

- Retry only the final rename, only on Windows, and only for `EPERM`/`EBUSY`.
- Use a finite backoff budget; the final error is observable to the caller.
- Keep the original target unchanged until a successful rename; do not substitute direct writes.
- Tests must not weaken an existing assertion or depend on a real antivirus/file lock.
- Use repo-root-relative paths and add no package.

## Ordered steps

1. In the dedicated worktree, run the focused current settings test and inspect the production helper call chain; record its exit code.
2. Implement the bounded rename helper and wire `writeSettings` to it without altering serialization or the settings object.
3. Update the test fixture root and add deterministic recovery, retry-boundary, non-retry, persistent-error, and successful-cleanup assertions.
4. Run focused settings tests repeatedly, GUI typecheck, and the appropriate GUI/root verification rail; preserve any failure.
5. Tick the pre-review checklist, write the post-implementation report, commit/push, open a PR containing `Kanmer: GUI-129`, then move only to Review if live gates pass.

## Acceptance checks

- The production caller is `writeSettings`, reached by all existing settings mutators inside `withSettingsFileLock`.
- A mocked Windows `EPERM`/`EBUSY` eventually succeeds only within the fixed budget; a persistent or non-eligible error rejects.
- The real successful write path leaves `settings.json` and no temporary sibling in its unique fixture root.
- Focused GUI settings tests, GUI typecheck, and root `npm run verify` evidence are recorded with exit codes; no assertion is removed or weakened.
- No runtime dependency, package artifact, schema, or unrelated tunnel code changes.

## Commands

From the dedicated worktree:

- `npm test -w @kanmer/gui -- --run src/main/settings.test.ts`
- `npm test -w @kanmer/gui -- --run src/main/settings.test.ts --repeat 3` (if Vitest accepts the repeat option; otherwise run the focused command three separate times)
- `npm run typecheck -w @kanmer/gui`
- `npm run verify` from a normal checkout only, after the focused rails; record exact exit result.

## Failure and deviation rules

Stop and record any baseline or post-change command failure, a retry behavior that would require changing atomic semantics, an error code/platform assumption not covered by the plan, a needed dependency, or any unrelated failure. Do not absorb `MCP-048` or other settings stores. Re-read the execution packet after a document conflict.

## Stop condition

Stop after an open GUI-129 PR is in Review with the implementation report, live gates, exact command results, and an independent-review handoff. Do not review, merge, verify post-merge, clean up, or start another ticket.
