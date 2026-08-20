# Research — GUI-075: per-provider dispatch model and prompt configuration

## Question

What configuration axis, storage scope and provider contract let a user select cost/quality and append house rules to background dispatch without forking Kanmer’s task prompts, silently changing defaults, or passing unsupported CLI flags?

## Current implementation

- `packages/core/src/prompts.ts` is the deliberate source of truth for whole-ticket and six named task prompts. Each task has one deterministic deliverable and shared safety clauses.
- `apps/gui/src/main/dispatch.ts` resolves exactly one built-in prompt, then calls `provider.dispatchArgs(prompt, root)`. It has no configuration input and the terminal status does not expose an effective model/config summary.
- `apps/gui/src/main/providers.ts` owns each CLI’s invocation shape. The current signature can only receive prompt and source root.
- `apps/gui/src/main/settings.ts` stores machine-local app preferences in Electron `userData/settings.json`. It already performs tolerant defaults/migration, but has no dispatch section.
- The Settings renderer has no dispatch tab; provider capability is already available through `listProviders()`, so the UI should derive rows from actual dispatchable providers rather than hardcode ids.
- MCP-020 moves dispatch-only provider metadata/supervision into a shared core contract. GUI-075 should land on/rebase to that provider SSOT and must not recreate a GUI-only model flag table.
- MCP-015 may make Antigravity dispatchable. The settings UI must react to the live shared registry: before that ticket it is absent; after it lands it appears only if its model flag is independently measured.

## Configuration axis decision

Use a two-level machine-local hierarchy:

```text
dispatch.providers[providerId]
  defaultModel?: string
  taskModels?: { [dispatchTaskId]: string }
  promptSuffix?: string
```

Effective model resolution:

1. task-specific model for provider + task;
2. provider default model;
3. unset → CLI default, with **no model flag at all**.

This supplies the ticket’s requested provider control while supporting the explicitly identified cost/quality distinction between tasks. It avoids a full provider × project × task matrix:

- no per-project model/prompt state in v1;
- no board file or source-controlled policy;
- no global cross-provider default;
- no per-ticket override;
- no model catalogue/network lookup.

The settings are machine-local because model availability, CLI login and cost account are host-specific. A project/team house-style policy may eventually deserve a governed project document, but putting arbitrary prompt text into the board now would create synchronization/security/governance scope and another prompt authority.

## Prompt decision

The user text is an **append-only provider suffix**, never a replacement template.

Effective prompt:

```text
<built-in task prompt>

Additional operator instructions for this provider:
<suffix>
```

- The built-in task/whole-ticket contract stays byte-identical when suffix is empty.
- The delimiter states that additional instructions cannot change ticket identity, task deliverable, project root, safety rules, stop condition or permission boundaries.
- Maximum normalized length is fixed (recommended 4,000 UTF-16 code units/characters); trim surrounding whitespace; preserve internal newlines.
- Settings UI previews built-in prompt and effective appended prompt for a selected task, but the built-in text is read-only and derived from core.
- Warn: settings are plaintext in Electron user data; never put secrets, credentials or personal data in the suffix.
- Do not offer replacement/system-prompt modes, interpolation variables, shell syntax or arbitrary CLI args.

## Provider model capability decision

Model support is a provider capability, not a guessed generic `--model` option.

Extend each shared dispatch provider with optional:

```text
modelOption?: {
  buildArgs(model: string): string[]
  evidence: { cliVersion, command }
  placement: beforePrompt | afterSubcommand | ... represented by the builder
}
```

Implementation must run the installed supported CLI’s help/positive control and pin exact argv in fixtures. A provider without measured model selection:

- still dispatches using its CLI default;
- shows “CLI default — this provider’s model override is not verified”;
- has no editable model fields.

A configured model is an opaque non-empty identifier, not validated against a hardcoded model list that will go stale. Up-front validation covers syntax/length/control characters and capability. The real CLI remains authoritative; a non-zero spawn/early exit must show the selected model and safe stderr in terminal dispatch status.

No fallback is allowed: if a configured model causes the CLI to fail, Kanmer does not retry without the model, because that would silently run a potentially more expensive/different model.

## Argument construction decision

Replace the loose `(prompt, root) => args` signature with one typed input owned by the shared provider SSOT:

```text
buildDispatchArgs({ prompt, sourceRoot, model? })
```

Each provider controls exact ordering and quoting. The dispatcher computes effective prompt/model once, passes them to the provider builder and records the effective non-secret configuration metadata.

This integrates naturally with MCP-020 and MCP-015. MCP-020 remote dispatch should use the server’s own explicit policy/model configuration—not automatically read Electron user settings—unless a later shared configuration ticket defines that boundary. GUI-075 is GUI/machine settings only.

## Settings persistence and validation

- Add version-tolerant `dispatch` defaults to `AppSettings`.
- On read:
  - accept only plain objects;
  - retain only known current provider/task ids;
  - trim model/suffix;
  - reject control/NUL characters and over-limit values;
  - do not throw on stale providers/tasks; omit them.
- On write, replace only the dispatch section through a dedicated setter and atomic file write (the current direct write should be upgraded to temp+rename if not already owned by another ticket).
- Unknown provider settings can be preserved in raw storage only if this is needed for temporarily unavailable CLIs; recommended v1 behavior is retain known registry ids whether currently installed, but never render non-dispatchable ids.
- Defaults serialize minimally: omit empty provider records rather than fill every model/task/suffix.

## UI decision

Add a top-level **Dispatch** Settings tab, machine-global rather than board draft state.

For each dispatchable provider:

- provider label and CLI;
- capability/status: model override supported or CLI default only;
- default model text input;
- collapsible per-task overrides generated from `DISPATCH_TASKS`;
- provider instruction suffix textarea with length/secrets warning;
- task selector + read-only built-in/effective prompt preview;
- “Reset provider” and “Reset all” actions with confirmation only when non-empty;
- save/reload feedback and validation errors.

Do not render providers that cannot dispatch. If a provider dispatches but lacks a verified model option, render prompt suffix and read-only CLI-default model status, not a misleading model field.

## Observability and testing

Dispatch status/report should expose safe effective metadata:

```text
provider, task, model: configured value | "cli-default",
promptCustomized: boolean
```

Do not return/store the full custom prompt in ticket scratch or remote MCP status. The local settings file is the source; terminal logs contain the actual child output only.

Tests must establish:

- empty settings produce exactly current built-in prompt/argv;
- provider default and task override precedence;
- exact model args for every measured provider;
- prompt suffix delimiter/normalization and immutable built-in prefix;
- unsupported provider cannot accept model;
- invalid model/suffix refuses before spawn;
- CLI failure is visible and no fallback spawn occurs;
- Settings migration/unknown ids/provider capability/UI/reset;
- task/provider list derives from shared SSOT.

## Open questions

None. Exact model flags are implementation-time measured evidence for each provider; unsupported providers remain explicitly CLI-default rather than blocking the feature.
