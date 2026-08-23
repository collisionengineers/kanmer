# Post-implementation report — SKILL-032

*The report. Not the proof — this is the author's claim, written before merge; proof is gathered after merge.*

## Summary

Removed the stale `pr-*` review-asset ownership statement from the review skill and added deterministic skill-prose coverage that rejects its return. The review skill now points agents at the current whole-file `scratch/review.md` attestation and makes clear that deleted legacy assets are outside the workflow.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Replaced the obsolete `SKILL-015` deletion hand-off with current `scratch/review.md` and deleted-asset guidance | Prevents agents from following a historical workflow that no longer exists |
| `scripts/verify-skill-prose.mjs` | Added checks for the stale legacy review-asset claim and the current whole-file review record | Makes the documented correction fail loudly if stale prose returns |
| `scripts/verify-skill-prose.test.mjs` | Added a fixture regression test that injects the stale claim and expects validator failure | Proves the new guard is deterministic rather than only passing on the current tree |

## Governing docs

- `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md`: the change keeps skills as workflow choreography and removes prose that contradicts the server-owned/current review record. No enforceable gate is moved into skill prose.
- `docs/functional/frd/FRD-014-doc-type-guidance.md`: the change preserves the documented review skill guidance and extends its existing prose verification surface; it does not alter board doc types or gate configuration.

## Risks / follow-ups

This is a documentation and verification-only remediation. It does not add, restore, or delete review assets, change review stages, or change MCP tools. [[SKILL-009]] is the historical finding being resolved. Proof and final ticket closeout belong to `kanmer-verify` after an independent review and merge.

## Verification hand-off

On merged `main`, run:

- `node --test scripts/verify-skill-prose.test.mjs` — all skill-prose regression tests pass, including rejection of the stale claim.
- `node scripts/verify-skill-prose.mjs` — all validator sections pass and the stale review-asset claim is absent.
- `npm run build` — core and MCP server builds complete.
- `npm run plugin:check` from a normal checkout after the build — tool names, committed bundle parity, skill frontmatter, manifests, and isolated MCP handshake pass.

Observed on this branch: focused test 8/8 passed; prose validator passed all 15 sections; `npm run build` passed; `npm run plugin:check` passed with 37 tools, bundle parity, 12 frontmatters, and isolated handshake.
