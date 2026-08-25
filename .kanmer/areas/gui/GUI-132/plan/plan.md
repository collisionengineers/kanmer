# Plan — GUI-132

## Objective

Make the installed Windows Codex Connect preflight execute the installer-owned portable launcher successfully, while retaining the exact portable registration contract and refusing before config mutation on a real launcher failure.

## Starting state

The installed launcher exists and returns `Kanmer MCP launcher: healthy` when Windows receives a correctly quoted command. The packaged GUI instead reports a command ending in a doubled quote. Production uses Node `execFile` with `cmd.exe /d /s /c`; the current test injects a fake runner and therefore never exercises Node's Windows serialization.

## Governing docs

FRD-012 R1e/R1d requires the rootless `%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd` launcher, a pre-mutation `--probe`, actionable failure, and no absolute-path fallback. The implementation will preserve that registration shape and validate the actual Windows process boundary.

## Required changes

1. Add a Windows-only real-process regression that invokes the production probe against a controlled launcher path/environment and asserts its exit/output. Prove the unmodified implementation fails for the same quoting reason as v0.3.7.
2. Correct the probe-only Windows invocation using the smallest supported Node/cmd quoting contract. Prefer explicit `windowsVerbatimArguments` plus a fully quoted `/c` command when proven by the real test; do not change the serialized Codex registration unless required by FRD-012.
3. Keep the injected runner test for deterministic option/ordering coverage and extend its option type/assertions to pin the chosen Windows behavior.
4. Prove a non-zero launcher still stops Connect before creating `.codex/config.toml` and that the displayed fallback command itself executes successfully.
5. Run focused GUI tests, GUI typecheck, full GUI tests, and repository diff checks.

## Expected files

Only the paths listed in the files document. No dependency or package changes.

## Do not modify

The launcher batch implementation, updater/installer, remote-access adapters, provider registration ownership, other provider Connect paths, release scripts, or board files.

## Constraints

Preserve first failing evidence. Do not weaken assertions, introduce an absolute install path, use a shell-wide fallback, or hide errors. Windows-only execution coverage may skip explicitly on non-Windows hosts but must run on this Windows workstation and hosted Windows verification where available.

## Ordered steps

1. Create a clean GUI-132 worktree from current `origin/main` and reproduce the failure with a focused real-process test.
2. Implement the probe-only invocation correction.
3. Update deterministic tests and fallback-command coverage.
4. Run acceptance commands and inspect the scoped diff.
5. Commit, push, open the PR with `Kanmer: GUI-132`, write the post-implementation report, and stop in Review.

## Acceptance checks

- Real Windows process regression exits 0 and reports the health marker.
- The regression demonstrably fails on the previous implementation.
- Failed probe creates or changes no project config.
- Canonical project registration remains rootless and byte-shape compatible with FRD-012.
- Focused/full GUI tests and typecheck pass.

## Commands

`npm run test -w @kanmer/gui -- --run apps/gui/src/main/connect.test.ts apps/gui/src/main/providers.test.ts`

`npm run typecheck -w @kanmer/gui`

`npm run test -w @kanmer/gui -- --run`

`git diff --check`

## Failure and deviation rules

Any inability to make a real Windows subprocess test fail before and pass after is a stop: do not accept a mocked proxy. Any required change to registration serialization, launcher lifecycle, installer behavior, or dependencies is out of scope and must be replanned or separately ticketed.

## Stop condition

Stop with the bounded implementation committed and pushed, an open PR carrying `Kanmer: GUI-132`, the post-implementation report written, and GUI-132 moved only to Review for an independent reviewer. Do not review or merge the author's PR.
