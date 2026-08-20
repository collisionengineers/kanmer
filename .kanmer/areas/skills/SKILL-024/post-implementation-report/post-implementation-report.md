# Post-implementation report — SKILL-024

## Summary

`kanmer-setup` now reconciles the user-owned AGENTS.md guide structure without taking ownership of human prose. It directs a missing-file setup to consume DOC-014’s canonical skeleton before using the unchanged managed-block writer; an existing guide is assessed outside markers and only its absent required headings are reported. A missing guide creates one source-marked documentation debt ticket after the board exists, and repeat runs find that marker instead of duplicating it.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Added the user-owned guide-skeleton reconciliation subsection: missing, partial, complete, malformed-marker, and source-marker follow-up-ticket behavior. | Makes the EPIC-012 required-section contract actionable while preserving the marker writer as the only managed-block owner. |
| `scripts/verify-skill-prose.test.mjs` | Added a focused contract test for canonical asset use, all three guide cases, heading detection, stop behavior, and idempotent marker search. | Prevents a future skill edit from silently losing the human-owned boundary or re-entrant ticket rule. |

## Governing docs

This feature intentionally retains `docs_todo: true`: no dedicated PRD/FRD/ADR is linked or modified. It aligns with FRD-013 by keeping setup repeatable and preserving the existing managed-block verification rail; with FRD-023 by protecting the shipped instruction surface; and with ADR-0015 by adding neither a second managed body nor automatic repair/state. The EPIC-012 approval contract is met by separating the required-section skeleton from the managed conduct block.

## Risks / follow-ups

- Heading detection is deliberately advisory: it recognizes case-insensitive Markdown heading labels outside markers but never assesses or rewrites content. This avoids false authority over a repository’s prose.
- The docs follow-up is created only on the no-file path and is guarded by the exact source marker; existing partial files only receive a report.
- [[SKILL-026]] remains the owner of broad disposable-repository integration verification; this ticket does not absorb that scope.

## Verification hand-off

On merged `main`, run:

- `node --test scripts/verify-skill-prose.test.mjs` — expect 3/3, including the setup skeleton contract.
- `npm run verify:agents-block` — expect 31/31 managed-block lifecycle checks.
- `npm run verify:skills` — expect the complete skill prose rail to pass.
- `git diff --check` — expect no whitespace errors.

No plugin MCP bundle refresh is required: the changes are skill prose/test-only and do not alter server source or the bundled runtime.
