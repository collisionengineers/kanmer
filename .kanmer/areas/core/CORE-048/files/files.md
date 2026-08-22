# Files — CORE-048

| Area | Files | Change |
|---|---|---|
| GUI board sync | `apps/gui/src/main/` and shared Git/settings tests identified by CORE-043 | Invalidate/refresh cached branch state on handoff and no-board transitions using existing state paths. |
| Hosted gate | `.github/workflows/pr.yml` | Replace the literal board branch assumption with the configured/derived branch contract used by the project. |
| Tests/docs | Focused GUI Git tests and workflow/static checks | Add deterministic regressions for stale cache, no-board preference, and custom branch workflow behavior. |

Out of scope: GitHub API protection retargeting, unrelated provider dispatch, release/update work, and changes to `.kanmer/`.
