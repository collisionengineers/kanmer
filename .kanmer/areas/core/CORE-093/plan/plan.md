# Plan — PR body edit merge-gate rerun

1. Base the ticket branch on [[CORE-092]] so the new PR’s gate uses its verified board-ref fetch correction without duplicating it.
2. Add `edited` to the existing `pull_request` activity types.
3. Extend the workflow contract test to require the `edited` trigger and the intended contributor guidance.
4. Add an `AGENTS.md` merge-gate convention section: ticket footer/body relationship, read-only board worktree, source CLI, and required test commands.
5. Run focused workflow/CLI tests, the script rail, and the actual PR check.

## Governing docs

- [FRD-009](../../docs/functional/frd/FRD-009-interrogative-workflow.md): keeps the merge gate enforceable whenever its body-derived ticket mapping changes.
- [ADR-0011](../../docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md): retains the gate’s read-only board authority; only rerun timing and documentation change.
