# Plan — GUI-075: Configure background dispatch per provider

## Objective

Add a machine-local Settings surface that lets users choose a default model per dispatch provider, optionally override that model for individual Kanmer task types, and append provider-specific operator instructions, while preserving core prompts as the authority and keeping an unconfigured upgrade byte-identical to current behavior.

## Starting state

- Core owns whole-ticket/task prompts and feasibility.
- GUI dispatch computes the built-in prompt and passes only prompt/root to provider args.
- Provider model flags are not represented or evidenced.
- App settings have no dispatch section.
- The renderer lists dispatchable providers but has no configuration UI.
- MCP-020/MCP-015 may change shared provider ownership/Antigravity dispatch; implementation must rebase on their final shared registry rather than duplicate it.

## Approach

Extend the shared dispatch provider descriptor with optional exact model-argument support. Add sanitized machine-local settings with provider defaults, task-specific model overrides and provider append-only suffixes. Resolve effective settings once before spawn, preserve exact no-config prompt/argv, and surface safe metadata/failures. Add a dedicated global Dispatch settings tab generated from provider/task SSOT. No project policy, prompt replacement, arbitrary args or model catalogue.

## Governing docs

- **FRD-010 — Modifies with ticket authority.** Add configuration hierarchy, append-only prompt, provider capabilities, defaults and failure behavior.
- **FRD-012 — Meets/updates provider matrix only where measured model flags are durable provider facts.** Do not duplicate prompt policy.
- **ADR-0009 — Meets.** Built-in prompts/tasks/provider capability remain code-derived; settings append rather than restate.
- **CORE-009 — Preserve.** No second prompt SSOT.
- **MCP-020 — Reuse.** Shared provider/model arg builder and supervisor; Electron settings do not redefine remote authorization.

## Required changes

### 1. Measure and encode model-selection support

1. Enumerate every provider currently dispatchable in the shared provider registry on the implementation branch.
2. For each provider, record installed supported CLI version and run its help/model-selection command.
3. Run a positive control with a harmless prompt and a known valid model where credentials/environment permit; capture exact argv/output/exit.
4. Run a negative invalid-model control and capture how quickly/errorfully the CLI fails.
5. Do not claim support based solely on a remembered generic `--model` convention.
6. Add optional `modelOption` metadata/building behavior to the shared provider descriptor only for positively verified providers.
7. Represent model argument construction inside the provider’s typed `buildDispatchArgs({prompt, sourceRoot, model})`, including exact subcommand/ordering.
8. Preserve the exact current no-model args when `model` is undefined.
9. Add fixtures/tests for each measured provider and an explicit unsupported case.
10. If a provider cannot be safely verified, leave `modelOption` absent and document CLI-default behavior; do not block prompt suffix support.

### 2. Add pure prompt composition and configuration helpers

11. In core, define shared constants for model/suffix length and invalid controls only if both main/renderer need them; otherwise keep validation in a shared GUI module without duplicating values.
12. Add a pure `composeDispatchPrompt(base, suffix?)` helper adjacent to prompt SSOT.
13. Trim surrounding suffix whitespace; return `base` exactly when empty/undefined.
14. Append exactly one fixed delimiter/heading and normalized suffix when non-empty.
15. The delimiter states built-in ticket/task/safety/stop clauses remain authoritative.
16. Reject NUL and suffixes over 4,000 chars before composition.
17. Never mutate/export editable built-in prompt templates.
18. Add tests over whole-ticket and all `DISPATCH_TASKS`: byte identity empty, exact delimiter, internal newline retention, limits and immutable prefix.

### 3. Add settings schema, migration and atomic persistence

19. Define shared/main types:

    ```ts
    DispatchSettings { providers: Partial<Record<DispatchProviderId, DispatchProviderSettings>> }
    DispatchProviderSettings { defaultModel?, taskModels?, promptSuffix? }
    ```
20. Add `dispatch` to main/shared `AppSettings` and defaults as `{providers:{}}`.
21. Implement pure `normaliseDispatchSettings(input, providerRegistry, taskIds)`:
    - require plain objects;
    - retain known shared provider ids (including currently uninstalled but defined providers);
    - retain known task ids;
    - trim strings;
    - model 1–200, no newline/control/NUL;
    - suffix ≤4,000, no NUL;
    - omit empty records/maps.
22. Decide invalid persisted values safely: drop invalid entries and expose a settings validation/status warning if practical; never crash startup or pass them to a child.
23. Update `readSettings()` to migrate old files with no dispatch field and sanitize nested input.
24. Add `setDispatchSettings(settings)` that reads current settings, replaces only normalized dispatch section and writes/returns full settings.
25. Upgrade `writeSettings` to same-directory temp file + fsync/rename or reuse an existing atomic helper if touching it; preserve Windows retry semantics where already established.
26. Ensure theme/tabs/preferences/git setters preserve the dispatch section through read/modify/write.
27. Add settings tests for old schema, malformed JSON/nested values, unknown ids, limits, reset/minimal serialization and preservation by every unrelated setter.

### 4. Expose the narrow IPC contract

28. Add one channel such as `kanmer:setDispatchSettings` and matching `KanmerApi` method.
29. Use shared typed `DispatchSettings` input/`AppSettings` output.
30. In main IPC handler, call only the dedicated sanitizer/setter; renderer input never reaches files/spawn directly.
31. Expose through preload with no generic settings-file access.
32. Extend `ProviderInfo` with safe model capability metadata, for example `modelOverride: boolean` and optional evidence/version label if useful; derive from shared registry.
33. Extend local `DispatchStatus` with `model: string | "cli-default"` and `promptCustomized: boolean`; do not add prompt text.
34. Add/preseve IPC/preload contract tests.

### 5. Resolve effective configuration before spawn

35. Add pure `resolveDispatchConfig(settings, providerId, taskId?)`:
    - task model when non-empty;
    - provider default otherwise;
    - undefined/CLI default otherwise;
    - provider suffix or empty.
36. At dispatch start, load current settings once after provider/task/ticket validation and before log/spawn.
37. Reject a configured model when provider has no `modelOption` with visible actionable error; do not silently ignore it.
38. Revalidate model/suffix at use time even though storage is sanitized.
39. Resolve base prompt from core exactly as today.
40. Compose effective prompt through the pure append helper.
41. Call shared provider `buildDispatchArgs` with effective prompt/root/model.
42. With no config, assert generated prompt and argv deep-equal pre-ticket golden fixtures.
43. Store safe status metadata (`model` or `cli-default`, `promptCustomized`) at run creation so later settings edits do not rewrite history.
44. Include the safe metadata in terminal ticket summary/report, not the full suffix/prompt.
45. If child exits non-zero/early, retain selected model and safe stderr/tail in failed status.
46. Never retry without model or suffix; one requested dispatch produces one child.
47. Preserve timeout/cancel/project+ticket locking and task feasibility through the MCP-020 supervisor.

### 6. Build the Dispatch Settings UI

48. Add `dispatch` to `SettingsTab` and `SETTINGS_TABS` with label “Dispatch”.
49. Keep this tab independent from board config draft/revision/reload logic; it edits global app settings.
50. On open/tab selection, load current app settings and provider info; use core task data already exposed via dispatch options or add a read-only task catalogue IPC derived from `DISPATCH_TASKS` (do not hardcode labels).
51. Render one provider section only for `dispatch:true` providers.
52. Show provider label, CLI/default behavior and whether model override is verified.
53. For verified providers:
    - editable default-model single-line input;
    - “CLI default” placeholder/help;
    - task override rows generated from task catalogue, each blank meaning provider default/CLI default.
54. For unverified providers:
    - no editable model fields;
    - clear “Uses CLI default; Kanmer has no verified model flag for this host” text.
55. Add prompt suffix textarea for every dispatchable provider, character count and plaintext/no-secrets warning.
56. Add selected-task preview control:
    - read-only built-in prompt;
    - read-only effective prompt or highlighted appended section;
    - effective model resolution label.
57. Add per-provider reset that clears default/task/suffix and global reset; confirm only when data is non-empty.
58. Validate on input/save using the same constants and show per-field errors; do not truncate silently.
59. Save with one IPC call, replace local app settings state from returned canonical value and show success/failure.
60. Provide Reload/Discard for concurrent/external settings changes; at minimum re-read before save or use a settings revision if another ticket introduces one. Do not conflate with board reload-required bug.
61. Add accessible labels/descriptions, keyboard navigation and responsive layout using existing styles/tokens.
62. Ensure providers that become non-dispatchable disappear but stale settings are harmless/cleaned on next save.

### 7. Surface effective configuration without leaking prompt text

63. In the dispatch drawer, show provider, task, effective model (`CLI default` or configured id) and a small “custom instructions” indicator.
64. Keep existing local tail/cancel behavior.
65. Do not render full custom suffix or effective prompt in the drawer/activity/ticket scratch.
66. Ensure notification wording does not expose prompt/model secrets; model id is permitted as user-selected non-secret metadata.

### 8. Update provider and end-to-end tests

67. Add table-driven provider tests for exact no-model/model argv and capability metadata.
68. Add dispatch tests for:
    - empty settings golden identity;
    - provider default;
    - task override precedence;
    - blank task fallback;
    - suffix exact composition;
    - unsupported configured model refusal before spawn/log;
    - invalid persisted/runtime value refusal;
    - one spawn only/no fallback;
    - visible model/error metadata;
    - terminal summary omits suffix/full prompt.
69. Add settings/UI tests for migration, provider-derived rows, unsupported state, task generation, preview, limits, save/reset/reload and unrelated app settings preservation.
70. Add an integration test through IPC/preload/main dispatch seam asserting the saved setting changes actual child argv, not only state.
71. Assert a provider without dispatch never appears.
72. If MCP-015 lands, add Antigravity row/args and only a model field when model support has separate evidence.
73. Assert MCP-020 remote policy/config is unaffected by Electron settings.

### 9. Documentation and release guidance

74. Amend FRD-010 with:
    - machine-local scope;
    - provider default/task override precedence;
    - append-only suffix and immutable prompt authority;
    - capability-based model args;
    - no-config compatibility;
    - failure/no-fallback/metadata/secrets behavior.
75. Amend FRD-012 provider facts only for exact measured model flags and tested versions; do not promise universal support.
76. Add/update manual Settings/Dispatch chapter with examples, limits, preview, CLI-default behavior, plaintext warning, invalid-model failure and reset.
77. State that remote MCP dispatch has separate operator policy/configuration.
78. Update release notes emphasizing defaults remain unchanged.
79. Regenerate/check manual and docs; do not hand-edit generated structure.

## Expected files

Modify/add the exact files in `files.md`, rebased on MCP-020’s shared provider/supervisor contracts.

## Do not modify

- Replace/fork built-in prompts or change task deliverables.
- Add project/board/per-ticket settings, model catalog/network lookup, arbitrary args/env/cwd, secret storage or fallback retry.
- Automatically configure provider credentials/models or remote MCP dispatch policy.
- Begin GUI-092.

## Acceptance checks

- Empty settings produce exact pre-feature prompt/argv and CLI default.
- Provider default and task override precedence are deterministic and visible.
- Suffix is append-only, bounded and cannot erase built-in contract.
- Exact model flags are measured/provider-owned; unsupported hosts show no model input.
- Saved settings change the actual spawned argv/prompt through an end-to-end test.
- Invalid model/CLI failure is visible and never silently retried.
- UI derives providers/tasks from SSOT and hides non-dispatchable hosts.
- Settings are tolerant/atomic/machine-local and full prompt text is not leaked.
- FRD/manual/release notes match behavior and all existing dispatch/provider tests remain green.

## Verification commands

```bash
npm run test -w @kanmer/core
npm run test -w @kanmer/gui
npm test
npm run typecheck
npm run check:manual
npm run verify:skills
git diff --check
git status --short
```

Provider evidence:

```text
<provider> --version/help/model positive control/invalid-model control
saved GUI setting → captured spawned argv/effective metadata
```

## Failure and deviation rules

- If MCP-020 shared registry is not landed, implement/rebase on its approved SSOT rather than add a parallel GUI table.
- If a CLI model flag cannot be positively verified, omit the model field for that provider and document CLI default.
- If settings persistence cannot be made safe in the same diff, retain current writer but add regression tests and file a narrow follow-up; do not broaden into a settings database.
- If a custom suffix changes built-in bytes when empty, stop and fix composition.
- If a provider rejects a configured model, surface failure; never retry default.
- Do not merge or start GUI-092.

## Stop condition

Stop when per-provider/default and per-task model resolution, append-only instructions, settings/IPC/UI, actual argv integration, observability, exact provider evidence and docs are complete; unconfigured behavior is byte-identical; all tests pass; and the PR is ready for independent review. Do not merge or begin another ticket.
