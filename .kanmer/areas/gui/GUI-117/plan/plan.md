# Plan

1. Inspect the shipped descriptor and the provider staging path for shell-style branch interpolation.
2. Make the shipped default literal while retaining custom branch injection only in the GUI-owned staged copy.
3. Add a regression that reads the shipped descriptor and rejects `${...}` or other non-literal defaults.
4. Run focused provider/connect tests, typecheck, and diff checks; prepare an independently reviewed PR against `core-043-protection-retarget`.

## Governing docs

- `docs/functional/frd/FRD-012-connect.md`
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`
