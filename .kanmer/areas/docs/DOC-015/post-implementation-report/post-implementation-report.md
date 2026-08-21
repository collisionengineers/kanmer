# Post-implementation report — DOC-015

## Delivered

- Added `docs/manual/greenfield.md`, a focused operator playbook for starting a new Kanmer project at the right depth. It defines lean, standard, and high-assurance starting points; requires a one-page brief plus non-goals; prioritises a walking skeleton; limits detail to the first horizon; and requires evidence-based replanning after the first real release.
- Added an explicit anti-sprawl rule: no lifetime backlog before the walking skeleton has exposed the assumptions that deserve planning.
- Added an additive link from `kanmer-setup`’s greenfield interview to the manual page. The existing brief-first and explicit confirmation-before-creation conditions remain unchanged.
- Added a dependency-free test that asserts both the core playbook commitments and the setup reference, preventing the integration from silently disappearing.

## Governing-doc alignment

- FRD-013 remains satisfied: setup still starts with a brief, materialises governing documents, and asks for confirmation before creating the board/backlog.
- FRD-009 remains satisfied: the playbook asks the user to resolve an absent brief rather than inventing a product and treats later horizons as decisions informed by released evidence.

## Files changed

| Path | Rationale |
|---|---|
| `docs/manual/greenfield.md` | Durable, concise user guidance that keeps the first greenfield pass bounded. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Makes the playbook discoverable exactly where the greenfield interview begins, without duplicating it. |
| `scripts/verify-skill-prose.test.mjs` | Regression coverage for the page’s essential commitments and the setup link. |

## Verification run on branch

- `node --test scripts/verify-skill-prose.test.mjs` — 5/5 passing.
- `node scripts/verify-skill-prose.mjs` — all 13 verifier sections pass.
- `npm run verify:skills` — passes.
- `git diff --check` — clean.

## Risks and follow-ups

No implementation follow-up is required. The playbook deliberately does not create an onboarding algorithm, backlog template, or a new governing-document contract; those remain owned by setup and the existing FRDs.

## Verify after merge

On merged `main`, re-run the focused Node test, `npm run verify:skills`, and `git diff --check`; inspect that setup still links `docs/manual/greenfield.md` and the manual retains the bounded-planning rule.
