# GUI-130 impact and file inventory

## Production impact

None. This ticket changes test execution scheduling only; it must not change GUI runtime behavior, IPC behavior, settings persistence, Git worktree behavior, or MCP registration logic.

## Files to change

| Path | Role | Planned change |
| --- | --- | --- |
| `apps/gui/package.json` | Defines the GUI workspace test command consumed by workspace and root verification. | Add Vitest's supported `--no-file-parallelism` option to the existing `test` script so GUI test files execute serially while retaining existing test and hook timeouts. |
| `AGENTS.md` | Repository contributor command reference and required convention documentation. | Document that the GUI test command intentionally serializes files because the real-Git sync fixtures are Windows-sensitive under full-rail load; retain the existing command form and make the package-local scope clear. |

## Files inspected but intentionally unchanged

| Path | Reason |
| --- | --- |
| `apps/gui/src/main/index.sync.test.ts` | It provides the real-Git fixture and assertions that expose the defect. Its 30-second test/cleanup bounds, cleanup assertion, and fixture logic stay intact. |
| `packages/core/package.json` and core test configuration | [[CORE-095]] owns core isolation. GUI-130 must not make a global or cross-package runner change. |
| Root `package.json` | Root verification continues to call the workspace command; no new root command or duplicated scheduling list is needed. |
| `apps/gui/src/main/settings.ts` and `settings.test.ts` | [[GUI-129]] owns the Windows atomic settings rename retry. No changes from GUI-130. |

## No dependencies, migrations, or deployment changes

No dependency, schema, board format, artifact, release, or production deployment change is planned. The only runtime invoked is the existing Vitest binary through the existing GUI workspace script.
