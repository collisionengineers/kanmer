# Checklist — SKILL-025

- [x] Add the optional fix overlay with reproduction, root-cause, regression-boundary, and negative-test prompts.
- [x] Add the optional UI/UX overlay with state, accessibility, responsive, visual-proof, and scope-boundary prompts.
- [x] Add the optional docs overlay with audience, source-of-truth, claims, executed-example, and version-sensitivity prompts.
- [x] Add the optional cloud/infra overlay with environment, identity, IaC, dry-run, cost, rollback, and no-secrets prompts.
- [x] Add the optional data/migration overlay with up/down, backfill, runtime-role, grants, rollback, and data-loss prompts.
- [x] Tell `kanmer-plan` to manually copy zero or more matching overlays after reading the ticket evidence.
- [x] Preserve the shared plan/checklist workflow and gates-first guidance; add no classifier, profile mapping, field, gate, or engine.
- [x] Add scoped skill-prose verification for the five assets and optional/manual selector wording.
- [x] Run `npm run verify:skills` and inspect its reported overlay check.
- [x] Run `git diff --check` and confirm no plugin bundle, workflow, MCP, core, or AGENTS.md change.
- [x] Record implementation and verification results in the post-implementation report.

## Progress notes

- Added the five planned `brief-*.md` assets and a manual-selection step in `kanmer-plan`; the shared plan/checklist and gates-first workflow are unchanged.
- Added verifier check 9 for the canonical assets and wording. The first verifier run failed because the cloud asset used retired document-type word `impact`; it was rephrased to “cost effect” and the rerun passed every check.
- `npm run verify:skills` passed after the correction; `git diff --check` is clean and scope is limited to the planned skill assets, plan skill, and verifier.
- Wrote the post-implementation report with the implementation scope, the corrected verifier result, and review hand-off checks.

## Closeout

- [x] Confirm PR #78 merged and proof passed on merged main.
- [x] Re-inventory and read every ticket document, including nested scratch files.
- [x] Confirm clean worktree, release the ticket, and remove its merged worktree and local branch.
