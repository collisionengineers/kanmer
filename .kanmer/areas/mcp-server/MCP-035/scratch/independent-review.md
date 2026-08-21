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

## Post-merge integration note — 2026-08-21

PR #110 merged to main at `cb35e7f424a2c187e4b66be40160942375c0f7d7`. The pre-merge PR review remains PASS for its three-file scope and all author-listed rails. A merged-main artifact follow-up is now visible: rebuilding the standalone bundle from the MCP-035 tree yields SHA-256 `3a76dcd640ef49eefaffe3151e41453282d7fea15873bb4c870062f90bdaa82e`, while `origin/main`'s committed plugin bundle remains `3ac7e934d8dcbbc875117598a26b43e0b943d18866e0da5869d21d43caab0473`. Therefore a post-merge `plugin:check` would fail until the generated plugin artifact is refreshed to include this core change. This is outside PR #110's declared three-file scope and needs a separate artifact remediation/review; no source change was made here.
