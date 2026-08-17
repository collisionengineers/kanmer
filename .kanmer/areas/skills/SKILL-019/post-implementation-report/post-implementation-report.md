# Post-implementation report — SKILL-019

*The report. Not the proof — this is the author's **claim**, written before merge; proof is **evidence**, gathered after.*

## Summary

OpenCode's Kanmer Connect provider now installs its stamped project skill roster into the native `.opencode/skills/` directory. Antigravity remains unchanged on `.agents/skills/`, and disconnect removes only the selected provider's owned copy. The staleness detector, ignore rules, tests, FRD, and ADR now describe and enforce that isolation.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/providers.ts` | Changed OpenCode's `copySkills` destination and corrected provider comments | Make OpenCode use its native directory while preserving Antigravity's current design |
| `apps/gui/src/main/providers.test.ts` | Asserted distinct OpenCode and Antigravity destinations | Pin provider ownership and prevent convergence regression |
| `apps/gui/src/main/connect.ts` | Generalized shared-directory comments without changing the data-driven cleanup logic | The equality-based cleanup already handles distinct paths correctly |
| `apps/gui/src/main/connect.test.ts` | Added bidirectional disconnect isolation coverage | Prove removing either provider's roster does not touch the other |
| `packages/core/src/staleness.ts` | Added `.opencode/skills` to the recognized destinations | Report drift for OpenCode's new install location |
| `packages/core/src/staleness.test.ts` | Exercised independent drift detection for `.opencode/skills` | Prevent the new destination from becoming invisible to orientation |
| `.gitignore` | Ignored `.opencode/skills/` | Keep generated provider copies out of source control |
| `docs/functional/frd/FRD-012-connect.md` | Corrected R2, R4, and AC2 | Make the governing Connect contract match provider-specific ownership |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | Replaced the obsolete shared-write convergence note | Record why OpenCode isolation is deliberate |

## Governing docs

- `docs/functional/frd/FRD-012-connect.md` was modified with the user's explicit full-workflow authorization. The implementation meets its corrected R2 install matrix, R4 exact-cleanup rule, and acceptance criterion 2.
- `docs/functional/frd/FRD-023-agent-skills-system.md` remains applicable and unchanged: the complete stamped roster and existing reconciliation mechanism are preserved; only OpenCode's destination changes.
- `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` was modified with explicit authorization to record the provider-isolation design decision.

## Risks / follow-ups

- Antigravity deliberately remains on `.agents/skills/`. Codex can still discover that directory, so the remaining Codex/Antigravity duplicate is explicitly deferred by the user and is not claimed fixed here.
- Existing OpenCode copies under `.agents/skills/` are not deleted or migrated because the same tree may belong to Antigravity. Reconnecting OpenCode writes the new native copy safely.
- Historical working plans under `docs/plans/kanmer-v3/` describe the earlier implementation and were not rewritten; FRD-012 and ADR-0009 are the governing current-state sources.

## Verification hand-off

On merged `main`, run:

1. `npm run typecheck` — expect all four workspaces to pass.
2. `npm test` — expect core, GUI, manual, and script suites to pass.
3. `npm run build` — expect core and both MCP server bundles to build.
4. `npm run verify:skills` — expect all skill-prose checks to pass.
5. `npm run verify:agents-block` — expect 28/28 checks to pass.
6. Inspect `providerById("opencode").install.skillsDir` as `.opencode/skills` and `providerById("antigravity").install.skillsDir` as `.agents/skills`.
7. Confirm the disconnect isolation tests remove only the selected provider's stamped roster.
