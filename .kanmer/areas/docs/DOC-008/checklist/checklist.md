# Checklist — DOC-008

- [x] Re-read the scoped README sections and authoritative manual chapters; enumerate each remaining user-facing format-2 claim.
- [x] Rewrite the README storage tree and document-model explanation for format 3 and all seven folder-based document types.
- [x] Update the sample item, workflow stage order, Preparing explanation, and obsolete migration wording.
- [x] Correct the Editor, filter, and Settings bullets while preserving verified current behaviour.
- [x] Audit the changed user-facing README sections for legacy stage, Impact, priority, and format-2 wording; compare all claims with the manual and source.
- [x] Render-review the Markdown and run the planned documentation-relevant verification; record results for report and proof.

## Progress notes

- Updated README.md in `.worktrees/doc-008`: format-3 folder model, fixed stages, current editor/filter/Settings surface, and format-3 migration wording. The residual audit found only excluded contributor/MCP-reference priority and tool-count prose plus the intentional statement that Kanmer has no priority field.
- `npm test` passed: manual freshness check, 249 core tests, GUI Vitest suites, and script tests. `git diff --check` passed; a scoped residual audit found no obsolete format-2, Impact, priority-filter, or old-stage claims.

---

## Closeout — DOC-008

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] Proof finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/doc-008`
- [x] `git branch -d doc-008-readme-format3` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
