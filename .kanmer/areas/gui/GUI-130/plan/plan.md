# GUI-130 implementation plan — package-local GUI test file isolation

## Objective

Make the existing GUI workspace test command execute test files serially so the real-Git sync integration suite has deterministic finite scheduling under Windows full-rail load, without changing production code, fixture behavior, assertions, retry semantics, or timeouts.

## Governing documents

- `docs/functional/frd/FRD-019-gui-shell.md` — reliable GUI project-shell behavior is protected by the real-Git sync integration coverage.
- `AGENTS.md` — a PR that changes commands or conventions updates this contributor guide in the same diff; finite failures must surface and tests must not be weakened.

## Implementation steps

1. In `apps/gui/package.json`, extend the existing `test` script from `vitest run` to `vitest run --no-file-parallelism`. This is Vitest's supported package-local scheduling flag. Do not add a root-level setting, a new dependency, a retry flag, or any timeout override.
2. In `AGENTS.md`, document the GUI test-command convention: GUI test files run serially because the real-Git sync fixtures are sensitive to Windows full-rail contention. State that this does not relax individual test or hook bounds and is intentionally confined to the GUI workspace.
3. Do not edit `apps/gui/src/main/index.sync.test.ts`. Its real-Git setup/cleanup, 30-second test and cleanup bounds, and cleanup assertion remain the regression signal.
4. Record the source diff, exact commit SHA, and verification outcomes in the checklist and post-implementation report. Preserve the earlier normal-clone failure as a distinct failure; a later pass is additional evidence rather than a replacement.

## Verification commands

Use an isolated ticket worktree for the fast checks, always with an absolute prefix:

```powershell
$wt = (Resolve-Path .).Path
npm --prefix $wt ci --ignore-scripts
npm --prefix $wt run build -w @kanmer/core
npm --prefix $wt test -w @kanmer/gui -- --run src/main/index.sync.test.ts
npm --prefix $wt test -w @kanmer/gui
npm --prefix $wt run typecheck -w @kanmer/gui
npm --prefix $wt run build -w @kanmer/gui
```

Then use a clean, normal (non-worktree) clone for the authoritative rail, again with its own resolved absolute prefix:

```powershell
$normal = (Resolve-Path .).Path
npm --prefix $normal ci --ignore-scripts
npm --prefix $normal run verify
```

The report must identify the actual resolved path in each output. Any non-zero exit, timeout, or hang is recorded as failure or inconclusive and stops promotion; it is not addressed by changing assertions, timeout values, or retry limits.

## Scope boundaries

- No source changes on [[GUI-129]] or to its atomic settings write handling.
- No changes to [[CORE-095]], core scripts, root runner configuration, or other workspace scheduling.
- No functional or release change; no dependency change.
- No self-review, merge, verification-stage move, or proof creation by the implementation author.

## Stop condition

After the implementation diff and the stated verification are recorded, open a ticket-linked PR and move the ticket one stage to Review only when the authoritative normal-clone rail exits 0. The author stops there for independent review and merge.
