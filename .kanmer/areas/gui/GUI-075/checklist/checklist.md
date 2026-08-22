# GUI-075 implementation checklist

## Shared dispatch contract

- [x] Shared provider registry accepts a typed `{ prompt, sourceRoot, model? }` input.
- [x] Codex, Claude Code, opencode, and Grok retain byte-identical default argv.
- [x] Measured `--model` argv is emitted only when a configured model is present.
- [x] Installed CLI version/help evidence is recorded in the implementation report.

## Prompt and settings

- [x] Built-in prompts remain in `@kanmer/core` and empty suffix is byte-identical.
- [x] Non-empty provider suffix is normalized and appended with an explicit delimiter.
- [x] Machine-local `dispatch.providers` settings persist atomically with existing settings.
- [x] Provider default and provider-task model precedence is implemented.
- [x] Unknown providers/tasks are ignored on read; invalid model/suffix values reject before write.
- [x] Settings limits are enforced (model 200, suffix 4000, control characters rejected).

## GUI rail

- [x] Dispatch settings have a top-level Settings tab generated from live providers/tasks.
- [x] Antigravity and other non-dispatchable providers are omitted.
- [x] UI offers model, task override, append-only suffix, reset, and read-only preview.
- [x] IPC/preload surface returns core-owned task prompt text; renderer does not bundle Node-only core.
- [x] Dispatch status exposes effective model and prompt-customized metadata.

## Verification

- [x] Core tests: 266 passed, exit 0.
- [x] GUI tests: 355 passed across 38 files, exit 0.
- [x] Focused dispatch/settings tests: 5 passed, exit 0.
- [x] GUI typecheck and core build exit 0.
- [x] GUI build exit 0 after correcting the renderer IPC boundary.
- [x] `git diff --check` exit 0.

## Bounded deviations / follow-up

- [ ] Positive authenticated dispatch controls were not run: no credential-safe agent session was started. The installed CLI help/version probes are PASS; live provider execution remains INCONCLUSIVE.
- [x] FRD/manual/release-note prose updates are synchronized with the implemented contract.
- [ ] Independent visual screenshot/manual evidence remains INCONCLUSIVE in this headless lane.

## Stop condition

- [x] Post-implementation report and scratch evidence are written; ready for independent review at Review.

## CI reconciliation note — 2026-08-22

The origin/main merge `2c561e02` resolves the earlier hosted path-alias failure. Hosted typecheck then identified the GUI-110-owned demo fixture compatibility gap; attempted commit `566e90ee` was locally green but reverted as `cbb9de90` from the effective GUI-075 diff. The two external evidence boxes above remain intentionally unchecked: live provider execution and visual screenshot proof are INCONCLUSIVE.

## Hosted verification result — GUI-110 stacked (2026-08-22)

GUI-110 commit `8ded235c` is stacked into this branch by merge `c13596fc`; PR #142 remains open. Hosted run `32545782848` / job `96963841700` completed in 2m17s. Core 266/266, GUI 355/355, MCP HTTP 61/61, scripts 80/80, all-workspace typecheck, build, manual freshness, stdio smoke 224/224, and headless smoke passed. The required rail fails only at `npm run mcpb:check`, exit 1: after successful .mcpb build/manifest validation, `scripts/check-mcpb-sync.mjs:44` reports `Error: MCPB server differs from distributed plugin copy`. This shared plugin-artifact mismatch is preserved as the current blocker and is outside GUI-075 scope. No merge performed; live provider and visual evidence remain INCONCLUSIVE.
