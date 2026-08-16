# Checklist — MCP-012

Derived from plan.md, one box per step.

- [x] Falsify: re-measure both bundles (sha256/size/mtime/`grep -c questions-resolved`) and capture `get_status` from each over real stdio — record the identical output as the defect
- [x] Add `packages/mcp-server/src/identity.ts` — self path, cached lazy sha256, mtime, size, build-shape classification, injected version; every failure yields `null`
- [x] Inject `__KANMER_VERSION__` via `define` in both tsup configs from the root `package.json`; add `shims: true` to `tsup.config.ts` only
- [x] Add `repoRoot` + `repoRootSource` + the `server` block to the `get_status` handler; capture `repoRootSource` in `resolveRoot()`
- [x] Switch `new McpServer({ version: "0.1.0" })` to the injected version
- [x] Update the `get_status` tool description: what the block means, and that its **absence** means a pre-0.3.3 server
- [x] Add `smoke.mjs` assertions: `server.path` is the spawned file, `server.sha256` equals a hash computed in-test, `build` is a known value, `repoRoot` present, `rootSource === "flag"`
- [x] Edit `scripts/release.mjs`: rebuild step after the bump, comment at 151-152 rewritten (not deleted), rule at 115 widened in prose, `--dry-run` printout updated
- [x] Rebuild `plugins/kanmer/mcp/kanmer-mcp.cjs` with correct module resolution and commit it
- [x] Update `tool-reference.md` `get_status` row, `AGENTS.md` §7, FRD-022 R5/R6 (do NOT re-amend FRD-022:48-49)
- [x] Prove it survives packaging: `npm run dist`, drive `smoke.mjs` at the win-unpacked bundle via `KANMER_SERVER`/`KANMER_NODE`, expect `build: "packaged"`
- [x] Prove determinism: `plugin:check` green twice with a rebuild in between at an unchanged version
- [x] Rebase on `origin/main` (GUI-066 also edits release.mjs), re-run the rail, open the PR
- [x] Verification run: `npm test`, `npm run typecheck`, `npm run plugin:check`, `npm run smoke:protocol`, `smoke.mjs`, `smoke:discovery` + the after-half of the before/after pair (this box produces proof.md)

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

### 2026-08-17 — release rail, packaging proof, rebase

- **`release.mjs` step 5b** added after the bump; the two widened rules rewritten
  in prose, not deleted; `--dry-run` renumbered so the rehearsal matches.
- **The release-rail change is now demonstrated, not argued.** Bumped the root
  version 0.3.2→0.3.3 locally: the bundle's bytes changed (`142de977…`) and
  `plugin:check` **failed** exactly as predicted. Restored → `97f6ca41…`, green.
  That is the empirical case for step 5b.
- **Determinism**: three consecutive builds at an unchanged version produced
  identical bytes (`97f6ca41…`).
- **Real packaging proof**, not a simulation: `npm run dist` (exit 0), then
  `smoke.mjs` driven through the packaged `Kanmer.exe` as node at
  `win-unpacked/resources/mcp/kanmer-mcp.cjs` → `build: "packaged"`, same sha as
  the committed bundle, 133/133.
- **`origin/main` moved twice during the run** (→ `c81063e`: SKILL-018, GUI-070,
  MCP-009). Rebased cleanly — **no conflict, and `release.mjs` is untouched by
  main**, so GUI-066 has not landed. `check-plugin-sync.mjs` did change on main
  (skill-frontmatter check) but not its byte comparison. Full rail re-run after.
- **Pre-existing flake, not mine:** `kanmerGit.test.ts > ensureBoardWorktree
  reconciliation` times out at 5000ms with EPERM on Windows temp dirs under
  load. `git diff origin/main HEAD -- apps/gui packages/core` is **empty**, so
  that code is byte-identical to main. Passed 230/230 on one full run.

## Closeout — MCP-012

- [x] PR merge verified — #46 `MERGED` 2026-08-16T23:13:45Z, merge commit `efdc9f3`
- [x] proof.md finalised on merged main in a clean detached checkout with fresh `node_modules`
- [x] Moved to Done
- [x] Outcome recorded in ticket body
- [x] cd out of worktree; `git worktree remove .worktrees/mcp-012` (+ the temporary `.worktrees/verify-mcp012`)
- [x] `git branch -D mcp-012-server-identity` (squash-merged, so `-d` refuses by design)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
