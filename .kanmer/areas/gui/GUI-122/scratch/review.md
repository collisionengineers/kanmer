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

# Fresh cumulative independent review — PASS

- PR: #222
- Exact cumulative head: `1ef324c06d76af63cae220fe3a0e1dd84160dfd4`
- GUI-118 base: `37740379552e241f200bb181a2ca0e9d3be32ece`
- Current CORE-043 integration base: `7654a28104fbc67c58cad61241188d0f3d898c17`
- Reviewer: independent `core041_executor`; no self-review.

## Canonical finding dispositions

- GUI-121: fixed by GUI-122 merge `94d9fca2a9aa6e9158f7b230cea4617accb771dd`, which integrates current CORE-043/GUI-119 provider propagation. The final head retains Claude marketplace branch binding, OpenAI branch-aware invocation, and RemoteAccessManager `KANMER_BOARD_BRANCH` propagation for runtime/doctor children.
- GUI-123: fixed by child merge `1ef324c06d76af63cae220fe3a0e1dd84160dfd4`, which restores GUI-120's `projectId: id` multi-project Connect broadcast and its production-caller regression. The exact final tree matches the independently tested GUI-123 tree.

## Evidence

- Both GUI-118 and current CORE-043 heads are ancestors of the exact cumulative head.
- Final diff against current CORE-043 is the expected 11 GUI-118 lifecycle/provider files; no remote-access propagation regression remains.
- Focused providers/connect/index.sync/remote-manager rail: 121/121 passed, exit 0, including the GUI-120 broadcast regression, on the exact final source tree (tree `c58434556512262b972385b32bbf7d2ad88442f0`).
- `git diff --check 7654a281..1ef324c0`: PASS, exit 0.
- GUI-122 packet's GUI typecheck/build, scripts 89/89, verify:docs and prior deterministic evidence are consistent. Full workspace typecheck remains the documented inherited mcp-server/core mismatch; hosted, live native, packaged, protected mutation, and merged-main proof remain INCONCLUSIVE.
- PR #222 is OPEN/MERGEABLE; no hosted checks are reported.

## Verdict

PASS. Approve non-squash merge of PR #222 into current CORE-043 branch.
