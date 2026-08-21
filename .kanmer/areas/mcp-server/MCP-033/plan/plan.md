# Plan — MCP-033: canonical plugin-bundle refresh

## Governing docs

`docs/functional/frd/FRD-022-mcp-server-surface.md` requires the shipped plugin MCP artifact to match its source. This repair changes no functional contract; it restores the repository’s existing strict generated-artifact contract documented in [[MCP-030]].

## Approach

1. From the normal main checkout capture the failing byte comparison and regenerate the standalone plugin bundle with `npm run plugin:build`.
2. Inspect the generated diff: it must be limited to esbuild module-path comments/wrapper labels caused by linked-worktree versus normal-root relative resolution.
3. Create MCP-033’s own worktree/branch from current main and apply only that canonical generated artifact.
4. Verify the branch with normal-main source-equivalent build/check, focused plugin isolation and MCP smoke; open a PR.
5. Review the artifact-only diff, merge, then prove from merged normal main with `plugin:check` clean.

## Risks

- Copying a linked-worktree artifact would reproduce the failure. Mitigation: generate only from normal root and record checksums.
- A broader diff could conceal runtime/source changes. Mitigation: reject any non-generated-artifact path and inspect generated diff pattern.
- `plugin:check` has authoritative normal-root semantics. Mitigation: verification runs there, never in the linked ticket worktree.

## Verification

```bash
npm run build
npm run plugin:check
node packages/mcp-server/src/smoke.mjs
git diff --check
```
