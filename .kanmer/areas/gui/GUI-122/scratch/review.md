# Independent review — NEEDS-CHANGES

- PR: #222
- Exact head: `94d9fca2a9aa6e9158f7b230cea4617accb771dd`
- Exact GUI-118 base: `37740379552e241f200bb181a2ca0e9d3be32ece`
- Current CORE-043 propagation source integrated in the head: `7654a28104fbc67c58cad61241188d0f3d898c17`
- Reviewer: independent `core041_executor`; no merge performed.

## Changes checked

Relative to GUI-118, the PR adds the five GUI-119 provider-propagation files/changes: branch-aware Claude marketplace staging and updateSkills, OpenAI invocation branch binding, RemoteAccessManager `KANMER_BOARD_BRANCH` propagation for runtime/doctor children, and their regressions. These changes are present and match the current CORE-043 provider contract.

## Blocking finding — GUI-123

GUI-122 was created from pre-GUI-120 head `e09009b2`, not the current GUI-118 head `37740379`. Its PR diff against the stated GUI-118 base deletes the GUI-120 multi-project native Connect broadcast regression and its test seams:

- removes the `index.sync.test.ts` test asserting broadcasts use both open project ids;
- removes `connectAgentOverride`, `setMainWindowForTest`, and `setConnectAgentForTest`;
- drops the GUI-120 change from the cumulative source packet, so the `projectId: id` behavior is no longer independently proven in this PR.

GUI-123 was created, linked to GUI-122, and blocks GUI-122. Required disposition: integrate GUI-120/`37740379` into GUI-122, retain the `projectId: id` production behavior and regression, rerun the focused suite including it, and refresh the report/traceability.

## Evidence

- `gh pr view 222`: OPEN, MERGEABLE, exact head/base above; no hosted checks reported.
- Independent focused rail in `.worktrees/gui-122`: 4 files, 120 tests passed, exit 0. This count is itself evidence of the omission: `index.sync.test.ts` runs 10 tests, while the GUI-120 base contains the additional broadcast test.
- `git diff --check 37740379..94d9fca2`: PASS, exit 0.
- GUI-122 report's GUI typecheck/build, scripts 89/89, docs and diff evidence is consistent; full workspace typecheck remains the reported inherited mismatch and live/hosted/merged-main evidence remains INCONCLUSIVE.
- Verdict: NEEDS-CHANGES. Do not merge PR #222 until GUI-123 is resolved and a fresh exact-head review confirms both GUI-119 propagation and GUI-120/F-001 preservation.
