---
id: CORE-137
type: ticket
title: Publish and validate v0.4.1 and promote it as the live control plane
status: preparing
area: core
assignee: ''
profile: chore
stageEntered:
  preparing: '2026-09-04T00:44:04.889Z'
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
archived: false
created: '2026-09-02T00:47:51.076Z'
updated: '2026-09-04T00:44:04.889Z'
---

## Why
v0.4.1 closes [[HZN-008]]: it ships [[MCP-055]] (structuredContent carries the whole result — the 0.4.0 regression that blinds Claude Code), [[SKILL-039]] (anti-churn amendment in skills and core), [[CORE-133]] (reconciliation classifier recovers missing/unrecorded workspaces) and [[CORE-119]] (golden boards and promotion/rollback proof), plus [[GUI-147]] if it is merged before the cut. Release and remediation work ship no new features.

## Outcome
Same shape as [[CORE-136]] (its `plan/plan.md` is the template, copied with these deltas): version 0.4.1; base = `origin/main` after CORE-119 merges; `## 0.4.1` section in `apps/gui/release-notes.md` grouped by outcome (Fixed / Skills and policy / Proof); rollback installer `KanmerBackups\installers\0.4.0`; acquire the live `release_channel` for `main` before prepare and `complete` it after publish (0.4.0 only rehearsed the channel on a copied board; the horizon's Definition of done needs the lease clear on the live board); promotion acceptance adds (a) a Claude Code session shows the full `get_status` payload, (b) `claude plugin list` reports kanmer 0.4.1 after Connect (or after the manual marketplace repair recorded in GUI-147), (c) `kanmer-setup` + `npm run verify:agents-block` green.

## Cut point (all must be true)
MCP-055, SKILL-039, CORE-133, CORE-119 Done with exact-SHA proofs; GUI-147 Done or explicitly deferred to 0.4.2; nothing in Implementing/Review; `counts.taken` 0; only `.worktrees/kanmer` exists; board pushed (`boardSync.ahead` 0); hosted `verify` green at the `origin/main` tip; fresh clone `npm run verify` green; GUI-141 and MCP-052 decisions recorded (done 2026-09-02).

## Verification
Proof at the release merge SHA: `gh release view v0.4.1` public with four assets, `verify-release-assets --remote-coherent` PASS, tag `release-verify` run success, installed `get_status.server.version == 0.4.1` on the live board, copied-board smoke, rollback rehearsal to 0.4.0 and back, Claude Code full-payload observation, `claude plugin list` 0.4.1.
