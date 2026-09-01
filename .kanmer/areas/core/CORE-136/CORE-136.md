---
id: CORE-136
type: ticket
title: Publish and validate v0.4.0 and promote it as the live control plane
status: done
area: core
assignee: ''
profile: chore
stageEntered:
  preparing: '2026-09-01T18:47:56.897Z'
  implementing: '2026-09-01T19:44:34.466Z'
  review: '2026-09-01T21:40:12.279Z'
  verifying: '2026-09-01T22:32:32.128Z'
  done: '2026-09-01T23:02:08.327Z'
labels:
  - release
  - v0.4.0
  - reliable-autonomy
groups:
  - HZN-008
links:
  - CORE-036
  - CORE-042
  - GUI-141
refs:
  - docs/functional/frd/FRD-021-auto-update.md
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
  - docs/architecture/adr/ADR-0021-stable-control-plane-for-candidate-work.md
archived: false
created: '2026-09-01T18:47:23.256Z'
updated: '2026-09-01T23:02:08.327Z'
review_round: 1
remediation_budget: 1
---

## Why

The live control plane is v0.3.12 while `origin/main` carries the whole HZN-008 candidate (project identity, renewable leases and batches, delivery policy and release channels, capture, step packets and constrained reconciliation, durable `/goal` with bounded review, reconciliation tools, multi-project registry). None of those controls govern the live board until the candidate is released and promoted. CORE-127's nine-round review loop happened because the stable server enforced no remediation budget.

## Outcome

**Released and promoted on 2026-09-01.** v0.4.0 is the public latest release (tag `v0.4.0` = `7e114cd117ef720c20797e2bf9f5cf58643a94e6`, containing CORE-127 `a744fd76` and GUI-146 `3a98bf7c`), published through the real release path (`scripts/release.mjs` prepare PR #309 → independent review → squash-merge → `--publish`), with four assets verified byte-identical and `--remote-coherent`, `check-updater-package` and the tag `release-verify` workflow all green. The packaged 0.4.0 runtime is installed and pinned as the live control plane (`%LOCALAPPDATA%\Kanmer\mcp\current -> 0.4.0-28216`; live `get_status` reports 0.4.0 with the unchanged project fingerprint). Promotion acceptance steps 1–6 passed, including a copied-board workflow smoke that proved the new controls (unattested Review→Implementing refused, stale lease renewal refused, release-channel lease cleared with immutable attempt retained) and a two-way rollback rehearsal with the retained 0.3.12 installer. The release took one budgeted remediation round (release-notes prose) and surfaced one release blocker (GUI-146: the GUI had not bundled since CORE-117 because the PR verify rail never built it; fixed and the rail now builds the GUI). See `proof/proof.md`.

## Promotion acceptance (FRD-035 minimal, operator-approved 2026-09-01)

1. Live board backed up (zip + SHA-256 + board commit recorded here) before any install.
2. `npm run dist:check` and packaged `KANMER_SMOKE` boot pass.
3. Installer applied over 0.3.12 (real two-version updater path); installed launcher probe and `get_status` report `server.version 0.4.0`, same project fingerprint `kanmer-proj-v1:5dbaab31…`, format 3.
4. Copied-board workflow smoke through the installed launcher: `create_item`, `take_ticket` acquire/renew/release, backward `move_item` with reason increments `review_round`, `reconcile_ticket` dry-run, `release_channel` acquire/complete, `list_projects`. Every command and exit code recorded.
5. Rollback rehearsal: reinstall 0.3.12 from the retained installer, `get_status` shows 0.3.12 serving the untouched live board, reinstall 0.4.0.
6. Live cut-over: stop the 0.3.12 runtime cleanly, install/pin 0.4.0, restart the MCP session, `kanmer-setup` refresh of AGENTS.md managed block and installed skills.

## Also closes

The tag-push `release-verify` run and the two-version updater cycle are the evidence [[CORE-036]] and [[CORE-042]] have been parked for; their proofs cite this ticket. [[GUI-141]]'s packaged runtime-alias check is attempted during step 3; its live ChatGPT half is out of scope.

## Verification

- [x] `gh release view v0.4.0` public with installer, blockmap, MCPB and `latest.yml`; `verify-release-assets.mjs 0.4.0 --remote-coherent` exit 0; `release.yml` green.
- [x] Promotion acceptance steps 1–6 recorded with exit codes in `proof/proof.md`.
- [x] `get_status.server.version` on the live board is `0.4.0`.
