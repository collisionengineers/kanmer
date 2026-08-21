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
- `npm test -w @kanmer/gui -- --run`: 354 tests / 38 files, exit 0 (includes 45.864s Kanmer Git suite).
- `npm test -w @kanmer/gui -- --run src/main/dispatch.test.ts src/main/settings.test.ts`: 5 tests, exit 0.
- `npm run typecheck -w @kanmer/gui`: exit 0.
- `npm run build -w @kanmer/core`: exit 0.
- `npm run build -w @kanmer/gui`: first attempt exit 1 because renderer imported Node-only core runtime; fixed by task/prompt IPC, rerun exit 0. The failure is preserved here.
- `git diff --check`: exit 0.

## Deviations / review requests

The full packet's FRD-010/FRD-012/manual/release-note prose updates were not silently claimed: they remain a documentation follow-up and are explicitly unchecked in the checklist. No provider tunnel, GUI-017, or skills files were touched. Manual visual screenshot evidence is INCONCLUSIVE in this headless lane. Independent review should verify the exact model flag ordering against current provider releases and decide whether prose updates belong in this ticket or a documentation follow-up.

## Traceability

- Governing refs: `docs/functional/frd/FRD-010-task-scoped-dispatch.md`, `docs/functional/frd/FRD-012-connect.md`.
- SSOT context: [[CORE-009]], MCP-020 shared dispatch contract.
- Related provider boundary: [[GUI-073]].
