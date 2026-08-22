# GUI-114 plan

## Governing documents

- `docs/functional/frd/FRD-012-connect.md`
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`
- GUI-113 merged cumulative parent: PR #208, merge `69e2cc58`

## Implementation

1. Base the dedicated worktree on `origin/core-043-protection-retarget` at the
   GUI-113 merge, not on main, and preserve all parent cumulative source.
2. Extend the CLI registration contract with an optional argv descriptor and
   implement Claude’s `claude mcp add` as discrete argv values. Keep the
   display/copy command but quote shell metacharacters.
3. Add a production `execFile` path in `connectAgent`, with an injected argv
   runner for deterministic tests. Keep static cleanup commands unchanged.
4. Add exact provider and Connect regressions for `team&whoami`, preserving
   existing registration/merge/idempotence tests and GUI-113 native behavior.
5. Run focused provider/connect tests, GUI Git/registration tests as relevant,
   workspace typecheck/build, docs/manual/skills/agents/scripts/diff rails, and
   preserve every failed or unavailable check.

## Stop condition

Write the report/checklist, commit and push the dedicated branch, open a PR
targeting `core-043-protection-retarget`, update traceability and HZN-007,
move Implementing→Review after a fresh gate read, and stop. Do not merge,
verify, close, clean up, or self-review.
