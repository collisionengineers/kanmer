---
kind: proof-record
merged_sha: "241ff13e048e4535a69d7375b9f734d9a4606cf8"
environment: "detached .worktrees/verify-gui-107-241ff13e048e4535a69d7375b9f734d9a4606cf8 at merged SHA on Windows; Node 10.0.11"
verified_at: "2026-08-22T03:46:36.4166679Z"
result: PASS
attempts:
  - "PR #151 head b260b7336ead37a6d552572dafe35a8c8a0005e5: hosted verify run 32549079283/job 96972713314 SUCCESS."
  - "Detached npm run test -w @kanmer/gui: PASS, 39 files / 360 tests."
  - "Detached npm run typecheck: PASS for all workspaces."
  - "Detached npm run build -w @kanmer/gui: PASS."
  - "Detached first npm test: exit 1 only after core 266/266, GUI 360/360, HTTP 61/61; scripts were 80/82 because the clean detached worktree had no packages/core/dist."
  - "Detached npm run build:core: PASS; rerun npm run test:scripts: PASS, 82/82."
  - "Detached final npm test after core build: PASS, including core 266/266, GUI 360/360, HTTP 61/61, scripts 82/82."
  - "Detached git diff --check: PASS."
---

## Verification scope

GUI-107 was verified on the exact GitHub merge commit 241ff13e048e4535a69d7375b9f734d9a4606cf8 in a clean, detached verification worktree. The implementation remains bounded to the TicketCreate/Editor custom-profile requirements editor and its focused tests/styles; no core profile semantics, IPC contract, Settings profile editor, provider integration, or unrelated ticket scope changed.

## Acceptance evidence

- Focused custom-profile TicketCreate/Editor coverage and the full GUI suite pass at 360/360 tests.
- All-workspace typecheck and GUI production build pass.
- The final aggregate npm test passes: manual freshness, core 266/266, GUI 360/360, HTTP 61/61, and scripts 82/82.
- The initial detached aggregate attempt's 80/82 scripts result is retained as setup-state evidence, then cleared by the explicit core build and 82/82 rerun; no assertion was weakened.
- PR #151's required hosted verification is green, and the reviewed implementation commit is an ancestor of the recorded merge commit.

## External and visual boundaries

Manual Electron visual/screenshot interaction was unavailable in this environment and remains explicitly INCONCLUSIVE; no visual or provider-host acceptance is claimed. The implementation report and checklist park that boundary with its reason. This does not prevent a PASS for the deterministic GUI behavior and testable acceptance surface defined by the ticket.

## Result

PASS. The exact merged implementation is present, deterministic local and hosted rails are green after setup prerequisites, and all residual unavailable evidence is recorded without promotion.


PR: https://github.com/collisionengineers/kanmer/pull/151
Merged: 2026-08-22T03:35:03Z
