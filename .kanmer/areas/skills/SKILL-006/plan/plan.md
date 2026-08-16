# Plan

1. **Mine** every `### <n>.<m> <title>` in `docs/plans/**`. Match the item
   marker, not its container — the v2 plans group items under `## Items` and the
   updater plan under `## Phase N`, and only the marker is common to both.
2. **Preview** the counts: documents → items → tickets, broken down by area,
   and **name every source that yielded nothing, with the reason**. A source
   that silently produces zero reads as "covered" when it is not.
3. **Create** each item as a ticket in `done`, `profile: custom`,
   `requires: {}`, labelled `backfill`, `refs` at its source plan, with a
   `Source:` line in the body.
4. **Plan content** into the ticket's `plan/`.
5. **Verify** — spot-check ten spread across every source, asserting both that
   the title appears in the source *and* that a distinctive line of the mined
   plan appears there too. Title-only matching would pass on an empty document.
6. **Re-run** and require zero creations.

## Areas

Mapped from the source: phase-1 → core, phase-2 → mcp-server, phases 3–7 and 9
and the updater → gui, phase-8 → skills. Not proposed as new areas — the board
already has the five that mirror the packages, and the mining confirms the
split rather than changing it.

## GitHub issues

None open, so that branch does not run. Recorded as an untested path rather
than a completed one.
