# Post-implementation report — GUI-075

## Outcome

Implemented the bounded dispatch-settings rail on branch `gui-075-dispatch-settings`. The shared MCP-020 provider registry now owns typed dispatch argv construction and measured model capability. GUI machine-local settings support provider defaults, provider×task model overrides, and append-only prompt suffixes. The Settings Dispatch tab derives dispatchable providers and task prompt text through IPC; it does not import Node-only core runtime into the renderer.

## Changed surface

- `packages/core/src/dispatch-providers.ts`: typed `buildDispatchArgs`, exact default argv compatibility, measured `--model` builders.
- `packages/core/src/prompts.ts`: `DispatchTaskId`, bounded append-only prompt composer.
- `packages/core/src/dispatch-supervisor.ts`: effective model and `promptCustomized` safe status metadata; model-aware shared builder.
- `apps/gui/src/main/settings.ts`: tolerant schema, atomic persistence, limits and precedence resolver.
- `apps/gui/src/main/dispatch.ts`: resolves machine settings once, composes suffix, passes model/metadata, no fallback retry.
- `apps/gui/src/shared/ipc.ts`, `main/index.ts`, `preload/index.ts`: settings/task IPC.
- `apps/gui/src/renderer/src/components/Settings.tsx`: generated Dispatch tab, model/task/suffix/reset/preview controls.
- `docs/functional/frd/FRD-010-task-scoped-dispatch.md`, `docs/manual/dispatch.md`, and `apps/gui/release-notes.md`: user-visible contract and release note.
- Tests cover provider argv/default identity, prompt identity/delimiter, settings normalization/rejection, and effective dispatch metadata/argv.

## Provider evidence

Controlled Windows help/version probes were run in the GUI-075 worktree:

- `codex --version` → `codex-cli 0.149.0`, exit 0; `codex exec --help` → `-m, --model <MODEL>`, exit 0.
- `claude --version` → `2.1.239 (Claude Code)`, exit 0; `claude --help` → `--model <model>`, exit 0.
- `opencode --version` → `1.18.18`, exit 0; `opencode run --help` → `-m, --model`, exit 0.
- `grok --version` → `grok 1.0.5 (5115b46bc9) [stable]`, exit 0; `grok --help` → `-m, --model <MODEL>`, exit 0.

No authenticated provider was started and no model-positive/negative live session was fabricated. Those external execution claims are INCONCLUSIVE; CLI help evidence is PASS.

## Verification commands

- `npm test -w @kanmer/core -- --run`: 266 tests / 13 files, exit 0.
- `npm test -w @kanmer/gui -- --run`: 355 tests / 38 files, exit 0 (includes 45.864s Kanmer Git suite).
- `npm test -w @kanmer/gui -- --run src/main/dispatch.test.ts src/main/settings.test.ts`: 5 tests, exit 0.
- `npm run typecheck -w @kanmer/gui`: exit 0.
- `npm run build -w @kanmer/core`: exit 0.
- `npm run build -w @kanmer/gui`: first attempt exit 1 because renderer imported Node-only core runtime; fixed by task/prompt IPC, rerun exit 0. The failure is preserved here.
- `git diff --check`: exit 0.
- `npm run check:manual`: exit 0 after `npm run build:manual` refreshed generated chapters in fcec021d.

## Deviations / review requests

No provider tunnel, GUI-017, or skills files were touched. Manual visual screenshot evidence is INCONCLUSIVE in this headless lane. Independent review should verify the exact model flag ordering against current provider releases and the product wording in the updated FRD/manual.

## Traceability

- Governing refs: `docs/functional/frd/FRD-010-task-scoped-dispatch.md`, `docs/functional/frd/FRD-012-connect.md`.
- SSOT context: [[CORE-009]], MCP-020 shared dispatch contract.
- Related provider boundary: [[GUI-073]].

## CI reconciliation — origin/main update and GUI-110 handoff (2026-08-22)

Origin/main was merged into this branch as `2c561e02` and pushed. The prior hosted Windows path-alias failure (run `32538700773`, RUNNER~1 versus runneradmin) is resolved by that main update. The next hosted run, `32545348530` / job `96962707596`, reached authoritative typecheck and exposed a separate `@kanmer/ui` demo fixture gap: five Settings bridge results lacked the newly required `AppSettings.dispatch` field.

That compatibility fixture belongs to GUI-110. Commit `566e90ee` is the attempted stacked compatibility fix and passes local `@kanmer/ui` and all-workspace typecheck; it was reverted from the effective GUI-075 diff by `cbb9de90` so this ticket stays bounded until GUI-110 provides its authoritative PR/commit. Hosted run `32545704625` for the reverted head is being preserved as the current check. Live provider execution and visual evidence remain INCONCLUSIVE.

The full local verify rail passed build, manual freshness, core 266/266, GUI 355/355, MCP HTTP 61/61, scripts 80/80, typecheck and smoke 224/224 before the environment-only `mcpb:check` failure: `@anthropic-ai/mcpb/dist/cli/cli.js` is absent in this worktree.

## Hosted verification result — GUI-110 stacked (2026-08-22)

GUI-110 commit `8ded235c` is stacked into this branch by merge `c13596fc`; PR #142 remains open. Hosted run `32545782848` / job `96963841700` completed in 2m17s. Core 266/266, GUI 355/355, MCP HTTP 61/61, scripts 80/80, all-workspace typecheck, build, manual freshness, stdio smoke 224/224, and headless smoke passed. The required rail fails only at `npm run mcpb:check`, exit 1: after successful .mcpb build/manifest validation, `scripts/check-mcpb-sync.mjs:44` reports `Error: MCPB server differs from distributed plugin copy`. This shared plugin-artifact mismatch is preserved as the current blocker and is outside GUI-075 scope. No merge performed; live provider and visual evidence remain INCONCLUSIVE.
