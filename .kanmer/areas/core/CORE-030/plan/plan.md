# Plan — CORE-030

## Governing docs

- [FRD-013: Setup as reconciliation](docs/functional/frd/FRD-013-setup-as-reconciliation.md) — Meets: repository staleness remains detection-only, but only reports copied-skill destinations Kanmer itself can reconcile; every displayed repair stays actionable.
- No governing-document change is needed. The ticket already links FRD-013 and the implementation narrows an incorrect ownership classification rather than changing the product contract.

## Approach

1. In `packages/core/src/staleness.ts`, make `SKILL_DESTINATIONS` contain only the copied-skill locations used by current copy-skills providers: `.opencode/skills`, `.agents/skills`, and `.grok/skills`. Remove `.claude/skills` and revise the nearby comment so it describes the ownership boundary rather than historical mirrors.
2. Preserve `skillRows()`’s existing bundled-tree-first comparison and stamp logic. It should still detect changed, missing, retired, and unstamped Kanmer skills at an owned destination; it must simply never inspect a Claude mirror.
3. In `packages/core/src/staleness.test.ts`, move positive fixture installations that model Kanmer-managed copied skills from `.claude/skills` to an owned destination such as `.opencode/skills`. Keep their assertions for clean, changed, missing, retired, and unstamped states.
4. Add a focused regression test creating a user-maintained `.claude/skills` tree with a Kanmer-named folder and a foreign `run-kanmer` skill. Assert `getRepoStaleness()` has no `skills` or `skills-stamp` rows for that tree.
5. Do not alter GUI installation/reconnection behavior or invert the provider/detector roster here. [[GUI-090]] owns that cross-package source-of-truth refactor.

## Verification

- Run the focused core staleness test and then `npm test -w @kanmer/core`.
- Run `npm run typecheck -w @kanmer/core`.
- Inspect the resulting staleness assertions to confirm owned destinations still report drift while the handmade Claude mirror is absent.
- Run `git diff --check`.

## Acceptance criteria

- Marketplace-only Claude paths are not scanned or stamped by staleness detection.
- Any reported copied-skill path is one Kanmer’s copy-skills reconciliation can actually update.
- User-made `.claude/skills`, including `run-kanmer`, never produces Kanmer skills/stamp drift.
- Existing owned-destination drift coverage remains intact.
- No GUI/provider refactor or user-directory mutation is included.
