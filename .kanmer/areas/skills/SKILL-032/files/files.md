# Files

## In scope

- `plugins/kanmer/skills/kanmer-review/SKILL.md` stale statement about deleted `pr-*` review assets.
- Any exact duplicate of that stale statement in the bundled skill tree, if found by search.
- The existing skill-prose verification coverage needed to prevent the deleted-asset claim returning.

## Out of scope

- Reintroducing or deleting assets; SKILL-015 already owns the deletion.
- Changes to review stages, MCP tools, board gates, or unrelated skill prose.

## Evidence map

- [[SKILL-009]] historical audit identifies the contradiction.
- `plugins/kanmer/skills/kanmer-review/SKILL.md` is the observed stale source.
- `scripts/verify-skill-prose.mjs` and its tests are the verification surface.

## Acceptance evidence

- No current skill says the deleted `pr-*` assets remain untouched or assigns their deletion to a future ticket.
- The review skill describes the current whole-file `scratch/review.md` flow.
- Skill-prose checks pass and include a deterministic guard for the stale claim.
