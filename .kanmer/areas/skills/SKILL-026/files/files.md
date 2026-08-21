# Files — SKILL-026

## Change surface

| Path | Role and risk |
|---|---|
| `apps/gui/src/main/providers.test.ts` or a focused sibling GUI test | Best home for the real `removeManagedBlock()` inverse-operation assertion. Risk: tests run under Vitest and must remain deterministic/disposable. |
| `packages/core/src/staleness.test.ts` or a dedicated cross-surface test harness | Real `detectStaleness()` must observe a tampered managed body as `agents-block: behind`. Risk: avoid duplicating the detector's fixture-only test rather than exercising the shipped discovery convention. |
| `scripts/agents-block.mjs` | Reuse only; `writeManagedBlock()` is the actual setup writer and owns marker safety. No behavior change expected. |
| `scripts/agents-block-body.mjs` | Reuse only; canonical conduct body. Must not gain a test-specific copy. |
| `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md` | Reuse only; canonical user-owned skeleton whose bytes must survive removal. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Context only; documents the sequence agents apply. No prose change is needed if the integrated test proves the existing contract. |

## Context files

| Path | What it establishes |
|---|---|
| `apps/gui/src/main/agentsBlock.ts` | The exact removal function and its no-human-prose-deletion contract. |
| `apps/gui/src/main/connect.ts` | `dropAgentsBlock()` is the production caller used when the last copy-skills host disconnects. |
| `scripts/verify-agents-block.mjs` | Existing writer lifecycle and canonical parity expectations to retain. |
| `packages/core/src/staleness.ts` | Reference discovery and `behind` semantics; do not replace it with a string-only assertion. |
| `packages/core/src/staleness.test.ts` | Temporary-directory fixture conventions and the previous conduct-less regression. |
| `apps/gui/src/main/providers.test.ts` | Existing GUI managed-block test conventions and canonical-body import checks. |
| `docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md` | Governing reason the test must observe discovered content-hash staleness rather than versions. |

## Ripple effects

- Test-only change: no MCP tool, skill prose, governing-doc, server source, or plugin artifact should change.
- The relevant rail spans the core and GUI packages: a unit-only assertion in one layer is insufficient for the stated cross-surface ownership contract.
- The disposable directory must be removed in a `finally` path and never use the board worktree.

## Out of scope

- Altering setup skill behavior, the canonical block or template, staleness classification, Connect registration/peer handling, or any user-owned AGENTS.md prose.
- Adding a new setup command or an automatic staleness repair path.

## Execution correction

| Path | Required repair | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md` | Reword its ownership comment so neither exact Kanmer marker sentinel appears. | The missing-file template is fed directly to the writer; the present closing sentinel is interpreted as malformed state and prevents setup. |

The integration test remains the regression path and must prove this canonical template is now writer-safe.
