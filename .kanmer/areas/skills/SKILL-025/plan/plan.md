# Plan — SKILL-025: optional work-type brief overlays

## Approach

Add five small, static Markdown overlays to the existing `kanmer-plan/assets/` directory and explicitly position them as optional planning supplements. The base plan and checklist templates remain the universal brief; planners manually copy zero or more matching overlays only when the ticket needs their domain evidence. This meets MASTERPLAN S-30 without creating classification logic, fields, profiles, gates, or an execution engine.

## Governing docs

- No PRD, FRD, or ADR is linked because this ticket implements the adopted MASTERPLAN S-30 work order rather than altering a durable product/architecture contract.
- **MASTERPLAN S-30:** met by exactly five optional overlays carrying the named coverage prompts and by preserving “templates, never engines.”
- **EPIC-012 context:** met by adding scoped, reconcilable planner guidance; this ticket does not claim the disposable-repo integration proof reserved for SKILL-026.

## Steps

1. Add `brief-fix.md` with prompts for reproduction, root cause, regression boundary, and a negative test.
2. Add `brief-ui-ux.md` with loading/empty/error/disabled/success states, keyboard and accessibility, responsive constraints, visual proof, and an explicit no-unrelated-redesign boundary.
3. Add `brief-docs.md` with audience, source of truth, changed claims, executed examples, and version sensitivity.
4. Add `brief-cloud-infra.md` with tenant/subscription/environment, least-privilege identity, IaC diff, plan/dry-run output, cost impact, rollback, and a no-secrets reminder.
5. Add `brief-data-migration.md` with up/down, backfill, runtime-role permission test, grants in the same diff, and rollback/data-loss analysis.
6. Amend `kanmer-plan/SKILL.md` at the planning-input point to name the five assets and say planners choose zero or more manually after reading ticket evidence. Preserve gates-first behaviour and the shared plan/checklist workflow.
7. Extend `scripts/verify-skill-prose.mjs` with an auditable check that each canonical overlay exists and the planner instruction describes optional manual copying rather than automatic classification.
8. Run the skill-prose verifier and inspect the diff for exactly the five assets, one skill instruction, and the scoped verifier check. Do not rebuild the plugin bundle or change any workflow/gate machinery.

## Verification

- `npm run verify:skills` passes and prints the overlay existence/selection result.
- Confirm all five asset paths exist and contain the S-30 prompts.
- Confirm `kanmer-plan` says overlays are optional, manually selected, and may be combined.
- `git diff --check` is clean; only the planned skill assets, skill prose, and verifier change.

## Risks / open questions

- A long overlay could become a mandatory parallel workflow. Mitigation: keep each concise and begin with its optional/manual selection rule.
- A static check could police content semantics. Mitigation: verify canonical paths and the selector wording only; reviewers assess whether prompts cover S-30.
- No open questions remain.
