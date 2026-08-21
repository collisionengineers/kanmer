# Independent review — MCP-035 / PR #110 — 2026-08-21

## Changes

The three-file diff is within the packet and FRD-022 scope:
- `packages/core/src/store.ts` validates every requested `getDocsWithVersions` path with the existing `docPathIn` resolver before the format-1 early return, and reuses the computed v2 paths.
- `packages/core/src/store.test.ts` covers safe legacy missing responses and atomic rejection of traversal, absolute, and backslash-escape IDs.
- `packages/core/src/docs.test.ts` extends current-layout validation for the same unsafe forms.

No MCP handler/schema, migration, write API, plugin, dependency, or unrelated ticket changes are present. The change directly closes MCP-019's independently reproduced P2 while preserving FRD-022 R1/R3/R6 read semantics and the legacy all-missing response.

## Checks

- Focused core docs/store suites: PASS 132/132.
- Core typecheck: PASS (exit 0).
- MCP-server typecheck: PASS (exit 0).
- `npm run build`: PASS (core + ESM/standalone MCP).
- Stdio smoke: PASS 184/184.
- Protocol smoke: PASS 42/42.
- Discovery smoke: PASS 13/13.
- `git diff --check`: PASS; branch worktree clean.
- Diff against `origin/main`: exactly the three packet-listed files, 30 additions / 5 deletions.
- Normal main artifact rail independently passes `npm run build; npm run plugin:check`; linked-worktree plugin check is intentionally not run.

## Findings and dispositions

No blocking or non-blocking findings. The implementation uses the canonical validator once before format branching, so malformed later batch entries reject before any legacy result is returned; safe absent legacy docs remain `exists:false, content:null, version:null`. Existing MCP single/batch delegation therefore inherits the fix without a second validation API.

## Verdict

PASS — PR #110 is ready to merge. No ticket move or proof write performed.
