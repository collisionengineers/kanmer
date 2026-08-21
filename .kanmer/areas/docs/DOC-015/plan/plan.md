# Plan — DOC-015: Lean greenfield playbook

## Approach

Create one focused end-user manual page and connect it directly to the setup skill’s greenfield interview. The page will make the existing brief-first/confirm-before-create workflow practical without turning it into a new setup algorithm. Its advice will be intentionally bounded: choose the minimum suitable depth, state the problem and non-goals, validate with a walking skeleton, plan only the first horizon, then revise from the first real release.

This is preferable to expanding the setup skill with all explanatory prose (which would blur executable instructions and guidance) or emitting a fixed backlog template (which would contradict the anti-sprawl purpose).

## Governing docs

- `docs/functional/frd/FRD-013-setup-as-reconciliation.md`: retain the greenfield brief interview, `/docs/` materialisation, and user-confirmed area/profile/backlog proposal; the playbook is guidance, not a behavioural replacement.
- `docs/functional/frd/FRD-009-interrogative-workflow.md`: retain brief-first, proportional questioning, and no silent forward guesses across unresolved product decisions.

No governing document is modified or newly created. DOC-015 has no `refs` and its `chore` profile does not require one for this bounded documentation change.

## Steps

1. Add `docs/manual/greenfield.md` with a purpose statement and a depth-selection table for lean, standard, and high-assurance work; make clear that depth is selected from risk and consequence rather than process theatre.
2. Document the five bounded phases: one-page brief plus explicit non-goals, walking skeleton, only the first horizon in detail, a release learning review, and subsequent horizon replanning. Include an explicit anti-sprawl rule against lifetime backlogs before evidence exists.
3. Add an additive reference in `plugins/kanmer/skills/kanmer-setup/SKILL.md` section 6 before the brief is collected, directing operators to the manual page while preserving every existing setup step and its stop/confirmation conditions.
4. Add focused dependency-free static coverage in `scripts/verify-skill-prose.test.mjs` that checks the greenfield page’s core commitments and that the setup skill links to it, so the integration cannot silently disappear.
5. Run the focused Node test, the skill-prose verifier, `npm run verify:skills`, and `git diff --check`; inspect the changed docs and confirm that no managed-block writer or setup workflow logic changed.

## Verification

- The manual page is present, concise, and contains all three depth choices, brief/non-goals, walking skeleton, first-horizon planning, first-release replanning, and the anti-sprawl constraint.
- The setup skill references the page from its greenfield interview without weakening the brief-first or user-confirmation rules.
- `node --test scripts/verify-skill-prose.test.mjs`, `node scripts/verify-skill-prose.mjs`, `npm run verify:skills`, and `git diff --check` succeed.

## Risks and mitigations

- **Guidance becomes a second setup contract:** keep the page descriptive and link it to—not inside—the skill’s existing workflow.
- **Overly prescriptive depth tiers:** phrase them as proportional decision aids, with bounded artefacts rather than mandatory architecture.
- **Skill-bundle drift:** validate the explicit source reference with the existing skill-prose test and run the repository verifier.
