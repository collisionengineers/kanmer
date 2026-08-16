# Checklist — MCP-012

Derived from plan.md, one box per step.

- [ ] Falsify: re-measure both bundles (sha256/size/mtime/`grep -c questions-resolved`) and capture `get_status` from each over real stdio — record the identical output as the defect
- [ ] Add `packages/mcp-server/src/identity.ts` — self path, cached lazy sha256, mtime, size, build-shape classification, injected version; every failure yields `null`
- [ ] Inject `__KANMER_VERSION__` via `define` in both tsup configs from the root `package.json`; add `shims: true` to `tsup.config.ts` only
- [ ] Add `repoRoot` + `repoRootSource` + the `server` block to the `get_status` handler; capture `repoRootSource` in `resolveRoot()`
- [ ] Switch `new McpServer({ version: "0.1.0" })` to the injected version
- [ ] Update the `get_status` tool description: what the block means, and that its **absence** means a pre-0.3.3 server
- [ ] Add `smoke.mjs` assertions: `server.path` is the spawned file, `server.sha256` equals a hash computed in-test, `build` is a known value, `repoRoot` present, `rootSource === "flag"`
- [ ] Edit `scripts/release.mjs`: rebuild step after the bump, comment at 151-152 rewritten (not deleted), rule at 115 widened in prose, `--dry-run` printout updated
- [ ] Rebuild `plugins/kanmer/mcp/kanmer-mcp.cjs` with correct module resolution and commit it
- [ ] Update `tool-reference.md` `get_status` row, `AGENTS.md` §7, FRD-022 R5/R6 (do NOT re-amend FRD-022:48-49)
- [ ] Prove it survives packaging: `npm run dist`, drive `smoke.mjs` at the win-unpacked bundle via `KANMER_SERVER`/`KANMER_NODE`, expect `build: "packaged"`
- [ ] Prove determinism: `plugin:check` green twice with a rebuild in between at an unchanged version
- [ ] Rebase on `origin/main` (GUI-066 also edits release.mjs), re-run the rail, open the PR
- [ ] Verification run: `npm test`, `npm run typecheck`, `npm run plugin:check`, `npm run smoke:protocol`, `smoke.mjs`, `smoke:discovery` + the after-half of the before/after pair (this box produces proof.md)

## Progress notes

### 2026-08-16 — identity module + build wiring landed

Worktree `.worktrees/mcp-012` off `origin/main` @ `9ac20af` (contains MCP-010
`741ef81`). Ran `npm install` **inside the worktree** per MCP-010's workaround;
verified `realpathSync("node_modules/@kanmer/core")` →
`…\.worktrees\mcp-012\packages\core`, so the branch builds against its own core.

- Falsification captured first — see `scratch/falsification.md`. **Two provably
  different binaries returned byte-identical `get_status`.**
- `identity.ts` added; `define`d version via a shared `version-define.mjs`
  (plain `.mjs`, not `.ts`: `tsconfig.json` only includes `src/**/*`, and `.mjs`
  removes any esbuild extension-mapping ambiguity for a config-time import).
- `shims: true` on `tsup.config.ts` only. Verified in the built output:
  ESM `dist/index.js` has `getFilename = () => fileURLToPath(import.meta.url)`;
  CJS bundle contains **zero** `import.meta` occurrences and uses native
  `__filename`. Both carry `"0.3.2"`.
- Both shapes run and self-identify:
  `dev-esm` sha `b2558312`, `dev-standalone` sha `97f6ca41`.
- `repoRootSource` already earns its place: same board, two invocations,
  `derived` vs `flag` — the second silent divergence, now visible.
