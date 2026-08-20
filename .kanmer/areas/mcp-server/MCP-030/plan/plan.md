# Plan — MCP-030: canonical plugin-bundle regeneration

## Governing docs

No governing document is changed or required: this repairs the tracked output of an existing build contract. The ticket retains `docs_todo: true`; no behavioral design decision is introduced.

## Steps

1. From the main checkout, rerun `npm run build` and capture the current bundle mismatch against the committed plugin artifact.
2. Run `npm run plugin:build` only from the main checkout to copy the canonical standalone output into `plugins/kanmer/mcp/kanmer-mcp.cjs`.
3. Inspect the diff to confirm it is restricted to generated dependency-resolution path comments/wrapper labels; make no source, lockfile, or checker changes.
4. Run `npm run plugin:check` from the same main checkout and run a focused MCP smoke check. Record the exact outcome.
5. Commit the regenerated artifact on the ticket branch, open a PR, and retain the explanation that linked-worktree artifact generation is invalid.

## Verification

- `npm run plugin:check` passes from main after rebuilding.
- `node packages/mcp-server/src/smoke.mjs` passes.
- `git diff --check` passes.
- The PR diff is solely the compiled plugin bundle and has the expected generated-path-only change.
