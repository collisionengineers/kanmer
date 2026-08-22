## GUI-112 implementation handoff

- Base: CORE-043 PR #168 head e78323d7fb8ce695e40db80380d189e236726b25.
- Dedicated lane: gui-112-branch-handoff-sync / .worktrees/gui-112.
- Commit: 182cea58c0e5bb9375498edb72fc48c39eca425f.
- PR: #207, targeting core-043-protection-retarget.
- Scope: custom-to-custom live-branch preflight, exact requested handoff recognition, failed closed-project board-root retry, Settings visibility, retained-ref/Actions-variable docs and workflow static assertion. MCP-044 owns local MCP/managed-AGENTS propagation.

Implementation evidence:

- focused GUI Git + production sync: exit 0, 30/30;
- full GUI: exit 0, 48 files / 412 tests;
- all-workspace typecheck: exit 0;
- core/server build: exit 0;
- GUI electron-vite build: exit 0;
- check:manual: exit 0, 22 chapters current;
- verify:docs: exit 0;
- test:scripts: exit 0, 89/89;
- git diff --check: exit 0.

The exact-handoff test initially exposed stale onBoardBranch metadata when inspection was read against the cached branch; the helper now normalizes that observation before the strict matcher, and the complete focused rail is green. Hosted protection/Actions-variable retarget and multi-machine proof remain INCONCLUSIVE by ADR-0016; no external state was mutated. Post-merge proof remains intentionally absent.
