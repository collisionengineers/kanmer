# Files — GUI-075

## Core/shared prompt and provider contracts

| Path | Required change |
|---|---|
| `packages/core/src/prompts.ts` | Keep built-in whole-ticket/task prompts authoritative. Add pure helpers/types only as needed to list tasks and compose an append-only operator suffix with a fixed delimiter/length contract. Do not store settings or replace prompt text. |
| `packages/core/src/prompts.test.ts` | Test empty-suffix byte identity, normalized append format, immutable built-in prefix, length/control validation and every task preview. |
| `packages/core/src/dispatch-providers.ts` (from MCP-020, or equivalent approved SSOT) | Extend provider dispatch metadata with optional measured `modelOption`/typed `buildDispatchArgs({prompt, sourceRoot, model?})`. Exact per-CLI ordering belongs here. Do not create a renderer/settings flag table. |
| `packages/core/src/dispatch-providers.test.ts` | Pin exact no-model and model argv for every supported provider/version fixture; unsupported providers reject/omit model capability; source-root binding remains exact (especially Antigravity after MCP-015). |

## Settings persistence and IPC

| Path | Required change |
|---|---|
| `apps/gui/src/main/settings.ts` | Add sanitized `DispatchSettings` to `AppSettings`, defaults/read migration, dedicated setter, normalization/limits and minimal serialization. Preserve machine-local storage and unrelated preferences. Use atomic write if current settings write is being touched. |
| `apps/gui/src/main/settings.test.ts` | Add old-file migration, defaults, provider/task filtering, precedence data, invalid/control/overlength values, minimal reset and unrelated-settings preservation. |
| `apps/gui/src/shared/ipc.ts` | Mirror dispatch setting/provider capability/effective metadata types; add one settings update channel/method; extend `ProviderInfo` and `DispatchStatus` safely. |
| `apps/gui/src/main/index.ts` | Register IPC setter and pass current sanitized settings/effective configuration into GUI dispatch. Keep board/project settings separate. |
| `apps/gui/src/preload/index.ts` | Expose the narrow dispatch-settings setter through context isolation. |
| `apps/gui/src/preload/index.test.ts` / IPC contract tests | Assert only the intended channel/schema is exposed and current settings methods remain unchanged. |

## Dispatch execution

| Path | Required change |
|---|---|
| `apps/gui/src/main/dispatch.ts` | Resolve provider/task configuration once per start; compose built-in prompt + suffix; resolve task model > provider default > CLI default; validate before log/spawn; call typed provider arg builder; record safe effective metadata; surface CLI errors without retry/fallback. Rebase onto MCP-020 shared supervisor. |
| `apps/gui/src/main/dispatch.test.ts` | Assert default argv/prompt byte identity, model precedence/exact args, suffix content/delimiter, unsupported/invalid refusal before spawn, visible model failure, no fallback second spawn, safe status/audit metadata and project/provider/task isolation. |
| `apps/gui/src/shared/ipc.ts` / shared supervisor status | Add `model` (`configured value` or `cli-default`) and `promptCustomized` boolean only; never full prompt suffix in status/scratch/remote MCP. |

## Renderer/settings UI

| Path | Required change |
|---|---|
| `apps/gui/src/renderer/src/components/Settings.tsx` | Add top-level Dispatch tab independent of board draft. Fetch providers/core tasks/current app settings; render only dispatchable providers; model controls only when verified; provider default, per-task overrides, suffix textarea, preview, reset/save/reload/validation. |
| `apps/gui/src/renderer/src/components/Settings.test.tsx` | Test provider derivation, unsupported-model UI, precedence edits, preview immutability, validation, reset, save/reload and no non-dispatchable provider rows. |
| `apps/gui/src/renderer/src/App.tsx` | Wire updated settings setter/state and show effective model/customization metadata in the existing dispatch drawer without exposing prompt content. Keep dispatch action menu unchanged. |
| `apps/gui/src/renderer/src/styles.css` | Minimal scoped Dispatch settings grid/textarea/preview/status styling; use existing form/panel tokens and responsive behavior. |

## Provider evidence and fixtures

| Path | Required change |
|---|---|
| `apps/gui/src/main/providers.test.ts` | Retain full provider matrix and verify `ProviderInfo` reports dispatch/model capability from shared SSOT, not hardcoded UI assumptions. |
| `scripts/probe-provider-dispatch-models.mjs` or ticket evidence only | Optional read-only probe script if repeatable CLI-help/positive-control evidence needs a durable rail. Add only if it can run safely and produce fixtures; otherwise record exact commands/output in research/report and pin tests. |

## Documentation

| Path | Required change |
|---|---|
| `docs/functional/frd/FRD-010-task-scoped-dispatch.md` | Add configuration resolution, machine scope, append-only suffix, provider capability, defaults, observability and no-fallback/error behavior. |
| `docs/functional/frd/FRD-012-connect.md` | Update provider capability matrix only where exact model-selection support is a provider fact; do not duplicate dispatch prompt policy. |
| Relevant `docs/manual/` Settings/dispatch source + generated manual | Explain provider default/task override/suffix, CLI-default behavior, plaintext/no-secrets warning, exact failure behavior and reset. Regenerate through the manual script. |
| `apps/gui/release-notes.md` | User-facing model/prompt settings, unchanged defaults and unsupported-provider behavior. |

## Settings schema

```ts
interface DispatchProviderSettings {
  defaultModel?: string;
  taskModels?: Partial<Record<DispatchTaskId, string>>;
  promptSuffix?: string;
}
interface DispatchSettings {
  providers: Partial<Record<DispatchProviderId, DispatchProviderSettings>>;
}
```

Recommended limits:

- model id: trimmed, 1–200 chars, no control/NUL/newline;
- suffix: trimmed, max 4,000 chars, no NUL; internal newlines allowed;
- unknown task/provider keys ignored on effective read and omitted on write.

## Context files

| Path | Why |
|---|---|
| `packages/core/src/prompts.ts` | Existing prompt/deliverable SSOT and feasibility contract. |
| `apps/gui/src/main/providers.ts` | Current CLI invocations/provider registry; likely adapter to shared MCP-020 metadata. |
| `apps/gui/src/main/dispatch.ts` | Current prompt resolution, spawn/log/status and ticket scratch behavior. |
| `apps/gui/src/main/settings.ts` | Machine-local persistence/default migration. |
| `apps/gui/src/shared/ipc.ts`, `main/index.ts`, `preload/index.ts` | End-to-end type/channel boundary. |
| `Settings.tsx`, `App.tsx` | Existing tabs/global settings state and dispatch drawer. |
| MCP-020 plan | Shared provider/supervisor/security boundary; GUI-075 configures GUI dispatch, not remote MCP policy. |
| MCP-015/GUI-073 | Antigravity only appears after bound dispatch and its model option must be independently verified. |

## Ripple effects

- Provider CLI capability becomes explicit and version-evidenced.
- App settings gain a tolerant nested section but board files remain unchanged.
- Dispatch status/report gains safe model/customization metadata.
- MCP-020’s remote policy does not automatically inherit Electron app settings; document separate ownership.
- Empty settings must preserve current outputs exactly.

## Do not modify

- Built-in task wording/deliverables except the pure suffix composer.
- Allow prompt replacement, arbitrary CLI args, environment/cwd/root overrides, secrets, project/board settings, model discovery API or automatic fallback.
- Expose model controls for unverified capabilities or non-dispatchable providers.
- Change remote MCP dispatch policy, provider authentication/login or model billing.
