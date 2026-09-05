---
id: CORE-147
type: ticket
title: >-
  Make receipt validation configurable and complete: board-declared verify
  workflow/job names and a typed run_id
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - evidence
  - receipts
  - reliable-autonomy
groups:
  - HZN-010
links:
  - MCP-057
  - CORE-129
refs:
  - docs/functional/frd/FRD-006-typed-proof.md
archived: false
created: '2026-09-05T14:03:46.047Z'
updated: '2026-09-05T14:03:46.047Z'
---

## Problem

Two findings deferred from the MCP-057 review (F-002, F-010) that CORE-129 did not absorb:

- `assessReceipt` in `packages/core/src/proof-receipts.ts` validates `run_id` by presence only (`0`, `false` and arbitrary strings pass) and does not validate `attempt`, `provider` or `repo`.
- The accepted job and workflow names are literals inside `@kanmer/core` (`"verify"`, `"pr.yml"`). `@kanmer/core` ships to every consuming repository, and `kanmer-setup` does not install `pr.yml`, so a consumer whose CI uses different names would have every receipt rejected as soon as its verifier writes one.

## Outcome

Receipt validation reads the accepted workflow/job names from board configuration (with the current literals as the default so this repository's behaviour is unchanged), and validates `run_id` as a positive integer, `attempt` as a positive integer, `provider` and `repo` as non-empty strings matching the project's declared provider/remote when available.

## Acceptance

- Table cases for `run_id: 0`, `run_id: "abc"`, `attempt: 0`, empty `provider`/`repo`, and a board that declares `verification.workflow: ci.yml` / `verification.job: build` accepting a matching receipt and rejecting `pr.yml`/`verify`.
- Default configuration keeps every existing MCP-057 and CORE-129 test green.
- `get_status` exposes the effective receipt policy; `kanmer-setup` documents it for consuming repositories.

## Out of scope

Provider provenance verification (a `VerificationHost` adapter — R2-EVIDENCE); receipt storage or reuse keys.

## Technical seam

`packages/core/src/proof-receipts.ts` (`assessReceipt`), `packages/core/src/types.ts` (`BoardConfig`), `packages/core/src/board.ts` (resolver), `packages/mcp-server/src/index.ts` (`get_status`), `plugins/kanmer/skills/kanmer-setup/SKILL.md`, tests in `proof-receipts.test.ts` and `reconciliation.test.ts`.
