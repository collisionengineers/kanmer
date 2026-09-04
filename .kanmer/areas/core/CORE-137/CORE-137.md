---
id: CORE-137
type: ticket
title: Publish and validate v0.4.1 and promote it as the live control plane
status: done
area: core
assignee: kt
profile: chore
stageEntered:
  preparing: '2026-09-04T00:44:04.889Z'
  review: '2026-09-04T07:42:45.128Z'
  implementing: '2026-09-04T07:54:51.870Z'
  verifying: '2026-09-04T09:58:39.193Z'
  done: '2026-09-04T11:42:51.567Z'
review_round: 1
labels:
  - release
  - v0.4.1
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
commits:
  - 4e94ad806d5f74dbfdc9b0789190624addf4cbdd
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/319'
delivery_state: production-verified
delivery_branch: main
delivery_sha: 4e94ad806d5f74dbfdc9b0789190624addf4cbdd
delivery_release_branch: main
delivery_release_tag: v0.4.1
delivery_recorded_at: '2026-09-04T11:42:27.338Z'
archived: false
created: '2026-09-02T00:47:51.076Z'
updated: '2026-09-04T11:49:44.025Z'
---

## Why
v0.4.1 closes [[HZN-008]]: it ships [[MCP-055]] (structuredContent carries the whole result — the 0.4.0 regression that blinds Claude Code), [[SKILL-039]] (anti-churn amendment in skills and core), [[CORE-133]] (reconciliation classifier recovers missing/unrecorded workspaces) and [[CORE-119]] (golden boards and promotion/rollback proof), plus [[GUI-147]]. Release and remediation work shipped no new features.

## Outcome
v0.4.1 is published as the public latest release and installed as the live control plane. PR https://github.com/collisionengineers/kanmer/pull/319 merged at 2026-09-04T09:58:23Z as `4e94ad806d5f74dbfdc9b0789190624addf4cbdd`; the ticket records production-verified delivery on `main` at tag `v0.4.1`.

The exact-merge rail, public asset coherence, tag workflow, packaged and copied-board acceptance, fresh Claude full-payload check, portable Connect matrix, setup reconciliation, rollback to 0.4.0 and final 0.4.1 cut-over all passed. Live release attempt `main@1` is terminal released with verification passed and four asset digests; its channel lease is clear. HZN-008 records this ticket as its closer.

Residual observation, not a release blocker: Claude Code 2.1.260 removes the installed plugin while removing a marketplace, so the first deliberately induced cache-miss repair pass stopped at a redundant uninstall. It remained visibly failed and the next Connect restored enabled 0.4.1 with no host error. The failed and successful attempts remain in proof; no new release feature or compatibility path was added.

## Cut point
MCP-055, GUI-147, SKILL-039, GUI-149, CORE-139, MCP-056, CORE-133, GUI-150 and CORE-119 were Done with exact-SHA proof; the board was pushed and quiescent; hosted and fresh-clone verification were green at cut-point `04a977516fcb29500b5df2fd6aacea24e2e3d54e`.

## Verification
See `proof/proof.md` for the chronological proof bound to merge SHA `4e94ad806d5f74dbfdc9b0789190624addf4cbdd` and `scratch/promotion.md` for the full operator transcript.
