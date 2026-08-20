# Plan — GUI-100: Codex Connect registers through the shim

## Objective

Change only the Codex Connect path so every supported Windows project receives the same stable launcher registration, regardless of username, drive, Kanmer install directory, source checkout or board-worktree path. Reconnect replaces old machine-specific Kanmer entries, disconnect removes exactly the owned entry, eligible legacy global entries continue to drain, and all other providers remain byte-for-byte behaviorally unchanged.

## Starting state

- GUI-099 owns the fixed `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` and HKCU lifecycle and blocks this ticket.
- `connect.ts` creates one absolute Electron/root-pinned invocation for every provider.
- Codex and Grok share the pure TOML serializer; it always emits an `env` field.
- Codex project merge/unmerge, trust note and legacy global cleanup already exist and should be retained.
- Core staleness already regards rootless registration as discovery-based/current.
- `.codex/config.toml` is still ignored; real-host portability and making it shareable are later-ticket concerns.

## Approach

Define one pure canonical Codex launcher invocation and make invocation selection provider-aware. Keep the shared TOML serializer, but omit `env` when the chosen invocation has none. Before any Codex config mutation, execute the fixed launcher in `--probe` mode from the project root; failure refuses safely and never falls back to an absolute path. Existing merge/unmerge/trust/cleanup logic then operates on the new invocation. This is the smallest change that removes machine identity without creating a second serializer or changing another provider.

## Governing docs

- **EPIC-011 `context.md` — Meets.** Produces byte-identical registration bytes and depends on the installer-owned shim.
- **MASTERPLAN.md §6.3 S-24 — Meets.** Uses `cmd.exe /d /s /c` fixed-shim form, drains old registrations on reconnect and preserves symmetric disconnect.
- **`docs/functional/frd/FRD-012-connect.md` — Modifies with roadmap authorization.** Record exact TOML, probe/no-fallback, trust and migration behavior.
- **`docs/architecture/adr/ADR-0012-board-discovery-order.md` — Meets.** Root flags/cwd are omitted from config because the wrapper preserves the host workspace cwd and discovery remains authoritative.
- **GUI-099 launcher ADR (expected ADR-0018) — Meets once landed.** Link it and clear `docs_todo`; do not reopen the launcher architecture.

## Required changes

### 1. Confirm the prerequisite and durable docs

1. Read GUI-099's merged launcher contract and verify the fixed path, quoting and `--probe` interface match this plan.
2. Refuse to implement against an unmerged or materially different launcher; report the dependency rather than guessing.
3. Amend FRD-012 with the exact Codex project registration and migration/disconnect behavior.
4. Amend ADR-0012 only to name portable Codex as a discovery consumer and require inherited cwd.
5. Link GUI-099's new launcher ADR when present and set `docs_todo: false` before leaving Preparing/review.

### 2. Define one canonical Codex invocation

6. In `providers.ts`, generalize `Invocation` comments so command/args/env describe any supported server launcher rather than always Electron + root.
7. Add one exported pure function or readonly descriptor that returns a fresh canonical Codex invocation:

   ```ts
   {
     command: "cmd.exe",
     args: [
       "/d",
       "/s",
       "/c",
       '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"'
     ],
     env: {}
   }
   ```

8. Keep the final command string and fixed path in one source location; tests may import it but no second production literal is allowed.
9. Return fresh arrays/objects or freeze the descriptor so a caller cannot mutate the global contract.
10. Do not include `cwd`, username, drive, install path, `process.execPath`, bundle path, root flags or Electron environment.

### 3. Keep the shared TOML serializer correct

11. Retain `tomlMcpServersMerge` as the serializer for both Codex and Grok.
12. Build the Kanmer entry from `command` and `args` first.
13. Add `env` only when `Object.keys(inv.env).length > 0`; do not serialize an empty inline/table value for Codex.
14. Preserve parse/merge behavior for unrelated top-level values, trust tables and other MCP servers.
15. Preserve idempotence: merging canonical bytes again must produce identical bytes.
16. Preserve `tomlMcpServersUnmerge`: remove only `mcp_servers.kanmer`, remove the parent only when empty, and leave unparseable files untouched on disconnect.
17. Confirm a Grok invocation still serializes its existing command, args and Electron environment exactly as before.

### 4. Select invocation by provider

18. Rename the current absolute helper to make its scope explicit, for example `installedElectronInvocation(boardRoot, sourceRoot)`; its output must not change.
19. Add `serverInvocation(providerId, boardRoot, sourceRoot)` or equivalent:
    - `codex` → canonical portable invocation;
    - every other provider → existing installed Electron/root-pinned invocation.
20. Compute the provider before selecting the invocation in `connectAgent`.
21. Do not branch serializers, config paths, skill installers, dispatch settings or marketplace behavior.
22. Export only the minimal pure helper needed by tests; keep Electron path discovery in the main-process module.

### 5. Probe before any Codex config mutation

23. Add a small probe helper using `execFile`/spawn with explicit executable/argv, not a concatenated shell command.
24. Use the same `cmd.exe`, `/d`, `/s`, `/c` and fixed shim string, adding `--probe` only inside the final command-string argument.
25. Run the probe with `cwd: projectRoot`, hidden window, finite timeout and bounded output buffer.
26. Execute it before reading, creating or writing `.codex/config.toml` and before legacy cleanup.
27. Treat exit 0 as healthy; optional concise probe stdout may be retained for diagnostics but not written into config.
28. On non-zero exit/spawn/timeout:
    - return `ok:false`;
    - return the exact probe command a user/operator can reproduce;
    - include safe stderr/exit context and repair/reinstall guidance;
    - perform no config write, skill install or legacy removal;
    - never call the old absolute invocation as fallback.
29. Do not probe other providers.
30. Keep the probe helper injectable or executable through a controlled seam so unit tests do not require an installed Kanmer.

### 6. Preserve Connect and disconnect semantics

31. After a successful Codex probe, resolve the existing project config path and atomically merge the canonical invocation.
32. Reconnecting over an existing absolute `mcp_servers.kanmer` entry must replace only that owned entry and preserve unrelated TOML.
33. Preserve the current `codexTrustFromConfig`/`codexTrustNote` behavior and wording unless exact launcher-specific repair text is required.
34. Preserve best-effort legacy `removeCommands`; failure after successful registration remains visible only through existing output/diagnostic policy and must not roll back the valid project entry.
35. Confirm the broader legacy sweep classifies a trusted project with the rootless canonical entry as a valid replacement.
36. Keep disconnect on the pure `unmerge` path and run the same existing best-effort legacy removal; no launcher deletion belongs here.
37. Run Connect twice and disconnect twice to prove idempotence/no collateral deletion.

### 7. Add exact regression tests

38. In `providers.test.ts`, assert the parsed canonical Codex entry has exactly command + four args and no env/cwd/root fields.
39. Generate Codex registration bytes using at least two different simulated board/source/install/user roots and assert byte equality.
40. Assert no forbidden machine/path tokens appear in the bytes.
41. Assert merge over an old absolute project entry produces canonical output while preserving unrelated tables/servers.
42. Assert canonical re-merge is byte-stable.
43. Assert unmerge removes only Kanmer and handles empty/non-empty parent tables correctly.
44. Assert the shared serializer still emits non-empty env for Grok and all other provider fixtures remain exact.
45. In `connect.test.ts`, prove probe runs before any config mutation.
46. Prove failed/missing/timeout probe leaves a nonexistent config nonexistent and an existing config byte-identical.
47. Prove successful probe writes canonical output and retains trust guidance.
48. Prove no absolute fallback command or root flags are produced on probe failure.
49. Prove reconnect replaces an old project entry and invokes eligible legacy cleanup after the write.
50. Prove disconnect after canonical registration preserves unrelated TOML.
51. Add/retain a table-driven provider matrix for Claude, OpenCode, Grok and Antigravity so command/config/install/dispatch behavior does not drift.
52. In core staleness tests, feed the exact portable TOML and assert no `mcp-registration` `behind` row; retain explicit wrong-root tests.

### 8. Update examples and governing text

53. Replace `examples/codex-config.toml` with the exact installed portable project block.
54. State prerequisites: supported Windows install, healthy fixed launcher, trusted project, normal reconnect; manual source checkout/Node paths are no longer the recommended Connect output.
55. Keep the warning not to combine plugin and manual registration.
56. Do not remove `.codex/config.toml` from `.gitignore` in this ticket.
57. Do not claim update/machine-move proof until GUI-101/102.
58. Run docs/manual checks if FRD/ADR references affect generated structures; never hand-edit generated `doc-structure.md`.

## Expected files

Modify:
- `apps/gui/src/main/providers.ts`
- `apps/gui/src/main/connect.ts`
- `apps/gui/src/main/providers.test.ts`
- `apps/gui/src/main/connect.test.ts`
- `packages/core/src/staleness.test.ts`
- `examples/codex-config.toml`
- `docs/functional/frd/FRD-012-connect.md`
- `docs/architecture/adr/ADR-0012-board-discovery-order.md`

Expected no production change:
- `packages/core/src/staleness.ts`
- `apps/gui/src/main/mcp-sessions.ts`

## Do not modify

- GUI-099 launcher/NSIS ownership files.
- `.gitignore`, installer packaging assertions or real-host update/uninstall proof (GUI-101/102).
- Other provider definitions/serialization semantics beyond tests proving non-change.
- Plugin installation, dispatch, MCP tools/transport, board discovery order or global Codex config by direct parse/write.
- Consumer repositories or Git history.

## Acceptance checks

- Two simulated machines/roots produce byte-identical Codex Kanmer TOML.
- Canonical entry contains only the approved command/args; no machine/project/root/server/env/cwd data.
- Launcher probe occurs before any Codex write and failure changes zero bytes.
- No absolute fallback exists.
- Reconnect replaces the owned old project entry, preserves unrelated TOML and keeps trust guidance.
- Eligible legacy global entries continue to drain through the existing surgical route.
- Disconnect removes exactly the owned project entry and preserves the stable launcher installation.
- All non-Codex provider registration/install/dispatch fixtures remain unchanged.
- Exact rootless canonical config is not reported stale by core.
- FRD/ADR/example match the implementation; `.gitignore` remains unchanged.

## Verification commands

```bash
npm run test -w @kanmer/gui
npm run test -w @kanmer/core
npm run typecheck
npm test
npm run check:manual
node scripts/check-doc-numbering.mjs
git diff --check
git status --short
```

## Failure and deviation rules

- If GUI-099's launcher/probe contract is absent or differs, stop and reconcile the dependency; do not infer another command.
- If empty-env omission changes Grok bytes/behavior, fix the conditional serialization or separate entry construction minimally; do not fork all TOML handling.
- If the probe cannot be performed without config side effects, refactor the execution seam; never write first and validate later.
- If legacy cleanup would require rewriting global TOML, retain the existing CLI/surgical behavior and report the gap.
- If a change touches provider packaging, `.gitignore` or real-host update proof, move it to GUI-101/102.
- Do not merge or begin GUI-101.

## Stop condition

Stop when the canonical descriptor, provider-aware selection, preflight refusal, merge/unmerge/migration behavior, exact examples/docs and full provider/core regression suite are complete; all commands pass; the diff contains no installer or later-ticket scope; and the PR is ready for independent review. Do not merge or start GUI-101.
