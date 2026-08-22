# GUI-112 post-implementation report

## Scope and lineage

GUI-112 is the bounded remediation for current-head CORE-043 PR #168 findings covering custom-to-custom branch handoff, failed closed-project reconciliation, live-branch safety, Settings visibility, and retained-ref/Actions-variable wording. The implementation is based on CORE-043 PR #168 head e78323d7fb8ce695e40db80380d189e236726b25.

Dedicated lane:
- branch: gui-112-branch-handoff-sync
- worktree: .worktrees/gui-112
- implementation commit: 182cea58c0e5bb9375498edb72fc48c39eca425f
- PR: #207 targeting core-043-protection-retarget

MCP-044 owns the separate local MCP/provider registration and managed-AGENTS findings (3836189723 and 3836130705); GUI-112 links that ticket and does not duplicate its source scope. No CORE-043 merge/review, GitHub API/App, hosted protection mutation, new dependency, provider feature, or unrelated MCP behavior is included.

## Implementation by file

- apps/gui/src/main/kanmerGit.ts: added preference-aware live-branch refresh. It inspects the cached current branch for ordinary custom renames, accepts only the exact requested branch as a completed external handoff, normalizes the inspection metadata for that exact handoff, and preserves fail-closed mismatch state for every other branch.
- apps/gui/src/main/index.ts: uses the preference-aware refresh during settings application and retries retained board-root reconciliation before treating a failed state as non-Git or entering sync.
- apps/gui/src/main/kanmerGit.test.ts: added real-Git regressions for ordinary custom rename eligibility and exact requested handoff; inherited mismatch, protected refusal, no-mutation, retained-ref, and pause/error cases remain covered.
- apps/gui/src/main/index.sync.test.ts: added a production-caller regression proving a closed-project protected refusal retains boardRoot, then Retry reconciles the administrator-renamed worktree and invokes sync only after it is safe.
- apps/gui/src/renderer/src/components/Settings.tsx: shows retained board-root/error state and Retry for failed reconciliation; custom rename text keeps the old remote ref until KANMER_BOARD_BRANCH is updated.
- docs/functional/frd/FRD-020-board-git-worktree-sync.md: makes retained-ref behavior explicit for every custom-to-custom rename while preserving R5 protected-default refusal.
- docs/manual/board-sync.md, docs/manual/settings.md, docs/manual/troubleshooting.md: document retained-ref handoff and distinguish failed Git reconciliation from non-Git projects.
- apps/gui/src/renderer/src/manual/chapters.generated.ts: regenerated from the manual sources (22 chapters).
- .github/workflows/pr.yml and scripts/pr-workflow.test.mjs: preserve configured KANMER_BOARD_BRANCH fetch and add a static assertion for the GUI retained-ref handoff; no literal board fetch was introduced.

## Governing-doc alignment

FRD-020 R5 remains the source of truth: push-before-cleanup, retain old custom remote refs until the hosted variable is updated, and refuse automatic protected-default rename. ADR-0016 remains unchanged: GitHub protection, Actions-variable changes, and hosted retargeting are administrator-owned merge physics. No hosted or multi-machine proof is claimed.

## Evidence and exact outcomes

Final rails at commit 182cea58:
- focused GUI Git + production sync: exit 0, 30/30;
- full GUI: exit 0, 48 files / 412 tests;
- all-workspace typecheck: exit 0;
- core/server build: exit 0;
- GUI electron-vite build: exit 0;
- check:manual: exit 0, 22 chapters current;
- verify:docs: exit 0;
- test:scripts: exit 0, 89/89;
- git diff --check: exit 0;
- plugin:check: exit 1 in the linked worktree because the workspace dependency resolves @kanmer/core from the parent checkout; this is the repository's documented linked-worktree refusal and remains INCONCLUSIVE for this GUI-only change.

Preserved earlier attempts:
- the first combined focused run exited 1 because the new Retry fixture lacked an origin remote and ensureBoardWorktree correctly returned unavailable; the fixture was corrected with a local bare origin and the production test then passed;
- the first exact-handoff regression exited 1 because the preference helper passed stale onBoardBranch metadata after an administrator rename; the helper now normalizes the observation and the final 30/30 focused rail passes;
- the first GUI typecheck exited 1 on an unused refreshBoardBranch import; the stale import was removed and the final all-workspace typecheck passed.

## Handoff and boundaries

PR #207 is open for independent review. Post-merge proof is intentionally not written. Hosted protection/Actions-variable retargeting, old-ref deletion, and real multi-machine behavior remain INCONCLUSIVE; no external state was changed.
