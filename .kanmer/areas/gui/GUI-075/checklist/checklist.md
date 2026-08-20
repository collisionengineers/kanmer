# Checklist — GUI-075

## Provider model capability evidence

- [ ] Enumerate current shared-registry dispatchable providers.
- [ ] Record supported CLI version/help/model-selection command for each.
- [ ] Run valid-model positive control where safe.
- [ ] Run invalid-model control and record failure behavior.
- [ ] Add optional model capability only for positively verified providers.
- [ ] Put exact model flag ordering in shared typed provider arg builder.
- [ ] Preserve exact current no-model args.
- [ ] Add supported/unsupported provider fixtures.

## Prompt composition

- [ ] Add shared model/suffix limits without duplicating constants.
- [ ] Add pure append-only prompt composer beside core prompt SSOT.
- [ ] Return built-in prompt byte-identically for empty suffix.
- [ ] Append one fixed authoritative delimiter for non-empty suffix.
- [ ] Preserve internal suffix newlines and trim edges.
- [ ] Reject NUL and overlength suffix before dispatch.
- [ ] Test whole-ticket and every task prompt.
- [ ] Confirm built-in templates/deliverables remain unchanged.

## Settings schema and persistence

- [ ] Add `DispatchSettings`/`DispatchProviderSettings` to main/shared app settings.
- [ ] Add empty dispatch defaults and old-file migration.
- [ ] Implement pure nested sanitizer over known provider/task ids.
- [ ] Validate model as trimmed single-line 1–200 non-control chars.
- [ ] Validate suffix as trimmed ≤4,000 chars with no NUL.
- [ ] Omit empty provider/task maps on canonical write.
- [ ] Ignore/drop malformed/stale nested values without startup failure.
- [ ] Add dedicated `setDispatchSettings` preserving unrelated settings.
- [ ] Make touched settings writes atomic/reuse existing atomic helper.
- [ ] Test every unrelated setter preserves dispatch settings.
- [ ] Test reset/minimal serialization/malformed JSON/unknown ids/limits.

## IPC and shared metadata

- [ ] Add one narrow set-dispatch-settings IPC channel/method.
- [ ] Register main handler through sanitizer/setter only.
- [ ] Expose method through context-isolated preload.
- [ ] Extend `ProviderInfo` with derived model capability.
- [ ] Extend local `DispatchStatus` with effective model and customized boolean only.
- [ ] Add/preseve IPC/preload contract tests.
- [ ] Confirm no generic settings-file/process field is exposed.

## Effective dispatch resolution

- [ ] Add pure task model → provider default → CLI default resolver.
- [ ] Load/snapshot current settings once before spawn.
- [ ] Revalidate effective model/suffix at use time.
- [ ] Refuse configured model for unsupported provider before log/spawn.
- [ ] Resolve built-in prompt exactly as before.
- [ ] Compose suffix only through shared helper.
- [ ] Call shared provider builder with prompt/root/model.
- [ ] Assert no-config prompt/argv deep-equal golden pre-feature values.
- [ ] Store effective model or `cli-default` at run creation.
- [ ] Store only `promptCustomized`, not suffix/full prompt, in status/report.
- [ ] On CLI failure retain selected model and safe error output.
- [ ] Never retry without the configured model.
- [ ] Preserve timeout/cancel/locking/feasibility behavior.

## Dispatch Settings UI

- [ ] Add top-level global Dispatch tab.
- [ ] Keep it independent from board draft/revision state.
- [ ] Load current app settings, provider info and task catalogue from SSOT.
- [ ] Render only `dispatch:true` providers.
- [ ] Show provider label/CLI/model capability.
- [ ] Render default model input only for verified providers.
- [ ] Generate optional task override inputs from core task ids/labels.
- [ ] Show read-only CLI-default/no-verified-flag state otherwise.
- [ ] Add provider suffix textarea, character count and plaintext/no-secrets warning.
- [ ] Add selected-task built-in/effective prompt preview.
- [ ] Show effective model resolution in preview.
- [ ] Add provider reset and reset-all with appropriate confirmation.
- [ ] Validate without silent truncation and show field errors.
- [ ] Save once through IPC and replace local state with canonical response.
- [ ] Add Reload/Discard behavior for external settings changes.
- [ ] Add accessible labels, keyboard behavior and responsive scoped styles.
- [ ] Ensure stale/non-dispatchable provider settings cannot render or affect dispatch.

## Drawer and integration tests

- [ ] Show effective model and custom-instructions indicator in dispatch drawer.
- [ ] Do not display full suffix/effective prompt in drawer/activity/scratch.
- [ ] Test provider default model actual spawned argv.
- [ ] Test task override precedence actual spawned argv.
- [ ] Test blank override fallback.
- [ ] Test exact appended suffix in child prompt.
- [ ] Test unsupported/invalid config refuses before spawn/log.
- [ ] Test non-zero invalid-model result is visible.
- [ ] Test exactly one child/no fallback.
- [ ] Test terminal summary contains safe metadata only.
- [ ] Test UI provider/task derivation, preview, save/reset/reload and limits.
- [ ] Test non-dispatchable provider absent.
- [ ] Add an IPC-to-spawn integration assertion.
- [ ] Confirm MCP-020 remote policy does not read Electron settings.
- [ ] If MCP-015 lands, add Antigravity row only with independent model evidence.

## Documentation and verification

- [ ] Amend FRD-010 configuration hierarchy/suffix/capability/default/error contract.
- [ ] Amend FRD-012 only for exact measured provider model facts.
- [ ] Update manual Settings/Dispatch, warnings, examples and remote-policy separation.
- [ ] Update release notes and state defaults are unchanged.
- [ ] Regenerate/check manual/docs.
- [ ] Run core and GUI tests.
- [ ] Run root tests, typecheck, skills/manual and diff/status checks.
- [ ] Record exact CLI/model evidence and end-to-end spawned argv.
- [ ] Confirm no project policy, prompt replacement, model catalogue, arbitrary args/env/cwd, secrets or fallback entered the diff.

## Stop condition

- [ ] Stop with the settings/configuration PR ready for independent review; do not merge or start GUI-092.

## Progress notes

Append CLI evidence and implementation notes here; never silently ignore a configured model.
