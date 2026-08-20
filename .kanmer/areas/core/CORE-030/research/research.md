# Research — CORE-030

## Question

Why does repository staleness report `.claude/skills` as behind when Kanmer cannot repair it, and what boundary should the detector use instead?

## Findings

- `apps/gui/src/main/providers.ts` registers Claude (and Codex) with the `marketplace` install kind. The actual copied-skill destinations are OpenCode `.opencode/skills`, Antigravity `.agents/skills`, and Grok `.grok/skills`.
- `apps/gui/src/main/connect.ts` exits the marketplace branch of `installSkills` after marketplace installation. It does not reconcile a skills directory or write a skills stamp for Claude.
- `packages/core/src/staleness.ts` nevertheless includes `.claude/skills` in `SKILL_DESTINATIONS`. `skillRows()` scans each listed destination for bundled Kanmer skill folders and reports `skills` and `skills-stamp` drift whenever it finds one.
- Therefore a user-maintained historical Claude mirror containing Kanmer-named folders can yield a stale row and a “setup or reconnect” repair instruction, although neither action writes that directory. The ticket’s reported `run-kanmer` folder must remain outside Kanmer ownership and never be policed.
- The detector’s bundled-tree-first walk is already the correct mechanism for avoiding reports on unrelated user skills within an owned destination. The defect is the destination roster: it wrongly declares all of `.claude/skills` owned.
- Existing `packages/core/src/staleness.test.ts` fixtures commonly install the simulated bundled skills under `.claude/skills`; those fixtures preserve the incorrect ownership assumption and should move to a real copy destination.
- [[GUI-090]] explicitly owns the follow-up that inverts the duplicated provider/detector destination lists so GUI provider registration consumes core-owned data. Core must not import Electron code, so this ticket should correct the false Claude entry without taking that GUI refactor.

## Scope

Change only the core detector’s owned copied-skill destinations and its tests. Do not change marketplace installation, GUI provider registration, user-created Claude directories, or the staleness response schema. This keeps every reported destination one Kanmer can actually reconcile while leaving the cross-package single-source-of-truth work to [[GUI-090]].

## Expected result

A repository containing any combination of user-made `.claude/skills` folders—including a stale-looking Kanmer-named folder and a foreign `run-kanmer` skill—produces no `skills` or `skills-stamp` stale rows for Claude. Real copied destinations retain existing missing-file, changed-file, missing-skill, retired-skill, and missing-stamp detection.

## Open questions

None.
