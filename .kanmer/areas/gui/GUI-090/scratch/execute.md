Implemented GUI-090 on `gui-090-staleness-gui` in `.worktrees/gui-090`.

Commit: `1cdd778` — `feat(gui): surface repository staleness`
PR: https://github.com/collisionengineers/kanmer/pull/76

Verification:
- core: 250/250 tests
- GUI: 288/288 tests
- core and GUI typechecks, GUI build, and `git diff --check` passed
- cold GUI-path core read matched MCP's compensated-only board-config report
- root `npm run typecheck` remains blocked by unrelated `packages/ui/src/demo.tsx:622` missing `TicketDocsInfo.documentPaths`.

Moved to Review; do not merge before independent review.
