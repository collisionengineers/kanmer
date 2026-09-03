# Files — GUI-150

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/providers.ts` | `MarketplaceVersionCheck.parse` returns only a version string (`:177-183`); Claude's check (`:1013-1019`) runs `claude plugin list` and `parseMarketplacePluginVersion` (`:205-235`) reads `Version:`/`Scope:` lines only. Becomes `claude plugin list --json` with a JSON parser returning `{ version, scope, enabled, errors }` for the user-scope `kanmer@kanmer` entry, falling back to the text parser (extended with `Status:`/`Error:` lines). |
| `apps/gui/src/main/connect.ts` | `verifyInstalledMarketplaceVersion` (`:693-728`) passes on version equality alone; it must fail with the pasteable repair, quoting the host error, when `errors` is non-empty or `enabled` is false. `readMarketplaceInstalledVersion` (`:743-753`) and `skillsStatus` (`:828-876`) carry the parsed state; `SkillsStatus` (`:812-821`) gains `hostError: string \| null`. |
| `apps/gui/src/shared/ipc.ts` | `SkillsStatus` mirror (`:388-393`) gains `hostError`. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | The skills hint (`:553-559`) and the "Update skills" button (`:564-580`) render only on `updateAvailable`; a host error must show "plugin failed to load: …" beside the version and offer the same repair. |
| `apps/gui/src/main/connect.test.ts` | `pluginList()` transcript helper (`:1151-1165`), the parse test (`:1376-1396`), the four Connect verification tests (`:1398-1470`) and the skills-status test (`:1472+`) key on the text transcript; they keep passing through the text fallback, and new cases use JSON fixtures from the real `--json` output (healthy, `errors: ["Marketplace kanmer failed to load: cache-miss"]`, `enabled: false`, absent) plus a text `Status: ✘ disabled` sample. |
| `apps/gui/src/main/providers.test.ts` | pins the `--json` command string and the parser's JSON-first/text-fallback contract. |
| `docs/functional/frd/FRD-012-connect.md` | R1 GUI-147 amendment (`:24`) says Connect "requires `claude plugin list` to report the bundled version"; amend: a reported load error or disabled plugin fails Connect even at the right version, and `skillsStatus("claude")` carries `hostError`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| Real `claude plugin list --json` on this machine (claude 2.1.259) | an array of `{ id, version, scope, enabled, installPath, installedAt, lastUpdated, projectPath?, mcpServers?, errors? }`; the same plugin appears once per scope; `errors` is present only when the host failed to load it. Kanmer installs at `scope: "user"`. |
| `apps/gui/src/main/connect.ts:686-692` | the exit code of `claude plugin install` is not evidence; the host's own report is — GUI-150 extends "report" from version to health. |
| `AGENTS.md` §8 gotcha 24 | Connect must never run a mutating `claude plugin …` command in tests; stub `hostVersionRunner` and point `LOCALAPPDATA` at a temp directory. |
| `apps/gui/src/main/connect.test.ts:1200-1215` (`useSyntheticClaude`) | how the tests register a synthetic `claude` provider with the real `installedVersion` spec so no real CLI runs. |

## Ripple effects

- `SkillsStatus` is an IPC contract (`shared/ipc.ts` ↔ `main/connect.ts`); both copies change together.
- Any consumer that stubs `hostVersionRunner` for `claude plugin list` must also answer `claude plugin list --json`; the text fallback keeps old stubs valid.
- No skill, core or server change; no bundle rebuild.

## Out of scope

- Disconnect confirmation (GUI-148); Codex's version check (its `plugin add` verb is trusted); the installed 0.4.0 app's behaviour (this ships in 0.4.1).
