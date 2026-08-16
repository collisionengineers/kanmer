# Research — MCP-012: Make server identity visible in get_status

## Question

What must `get_status` report for an agent to tell, from inside a session,
*which server build is answering* — and where can that identity come from,
given that the same source is shipped three ways (packaged app resource,
committed plugin bundle, dev build) and the repo's release rail asserts the
bundle is **byte-reproducible**?

## Findings

### The drift is real and re-measured

- Re-measured on this machine today, read-only (scratch/research.md has the raw
  output):
  - installed `…\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs` — sha256
    `e92a2679…`, `grep -c questions-resolved` = **0**, mtime 16:14:14, 1 465 172 B
  - repo `plugins/kanmer/mcp/kanmer-mcp.cjs` — sha256 `96fe9f8a…`,
    count = **1**, mtime 18:35:59, 1 467 810 B
- The two registrations that cause it are both in this repo:
  `.codex/config.toml` points at the installed resource; the untracked
  `.mcp.json` points at the repo's committed plugin bundle. Both pass the same
  `--root …\.worktrees\kanmer`.
- **A second invisible divergence sits alongside it:** `.codex/config.toml`
  passes `--repo-root <repo>`, `.mcp.json` does not. `repoRoot` is what
  governing-doc `refs` resolve against (`packages/core/src/paths.ts:43-54`), and
  `get_status` does not report it at all today. Same board, two hosts, two
  different `refs` resolution bases, also silent.

### What `get_status` returns today

- `packages/mcp-server/src/index.ts:216-257`. It returns `projectRoot`,
  `kanmerDir`, `exists`, `format`, `boardSource`, `deploymentTracking`, counts
  and `warningsCount`. **Nothing about the server itself** — no version, no
  script path, no build identity.
- `format` is the *store* format (`CURRENT_FORMAT = 3`,
  `packages/core/src/version.ts:14`), not a server version. It is a board
  property and moves with the board, so it cannot distinguish two servers.
- The MCP `initialize` handshake does carry a server version —
  `new McpServer({ name: "kanmer", version: "0.1.0" })`
  (`packages/mcp-server/src/index.ts:210`) — but it is (a) hardcoded and stale
  (root package is `0.3.2`) and (b) not readable by the agent from inside a
  session on any host we use. So the identity has to come back through a tool
  result.
- Nothing in `packages/core/src/board.ts` or `store.ts` knows about the server
  binary; this is entirely an mcp-server-layer concern. Core needs no change.

### There is no reliable *version* to read at runtime

- `packages/mcp-server/package.json` is `0.1.0` and **is never bumped**:
  `scripts/release.mjs:184-192` bumps only `apps/gui/package.json` and the root
  `package.json` (both `0.3.2`). `plugins/kanmer/.claude-plugin/plugin.json` is
  also stuck at `0.1.0`.
- The standalone bundle is a single self-contained `.cjs` file with **no
  `package.json` beside it** (`apps/gui/electron-builder.yml:17-19` copies just
  that one file to `resources/mcp/kanmer-mcp.cjs`). So a runtime
  `require("../package.json")` is not available in the shipped shape.
- Therefore the version must be **injected at build time** (esbuild `define`
  in the tsup configs, reading the root `package.json`), or not reported at all.

### The release rail is the hard constraint

- `scripts/check-plugin-sync.mjs:57-76` hashes the committed
  `plugins/kanmer/mcp/kanmer-mcp.cjs` and compares it byte-for-byte with a fresh
  `dist/standalone` build. Its own comment says it "assumes tsup output is
  reproducible, which it is at this commit".
- **A build timestamp or git sha in the stamp would break this permanently.**
  Timestamps differ every build. A git sha is worse: the bundle is committed, so
  the sha embedded at build time is the *parent* commit, and any rebuild at the
  new HEAD produces different bytes — `plugin:check` would fail after every
  single commit. Whatever the stamp is, it must be a pure function of the source
  tree.
- A version-only `define` is safe: bytes change only when the version changes,
  i.e. once per release.
- **But `scripts/release.mjs` has the wrong order for that.** Its gate runs
  `npm run build` and `npm run plugin:check` at lines 149-163, *then* bumps the
  version at 184-192, then packs the GUI at 200-201 — and never rebuilds the MCP
  standalone bundle. So with a build-time version define, `v0.3.3` would ship a
  `resources/mcp/kanmer-mcp.cjs` reporting `0.3.2`, and the very next
  `plugin:check` would fail against the now-stale committed plugin bundle. The
  script's comment at 151-152 ("NOT plugin:build — that rewrites the committed
  bundle, which would dirty the tree mid-release") is exactly the assumption
  this ticket invalidates.

### A build-independent identity is available and cheap

- The running script's own path and bytes need no build cooperation at all:
  `__filename` in the CJS standalone, `import.meta.url` in the ESM dev build.
  Hashing the 1.4 MB file with `node:crypto` is a few milliseconds; cached for
  the process lifetime it costs nothing on the "runs every session" path.
  **This alone reproduces the falsifying evidence exactly** — `e92a2679` vs
  `96fe9f8a` are what the two hosts would print.
- Gotcha: neither tsup config sets `shims`. `import.meta.url` in source would
  need `shims: true` on `tsup.standalone.config.ts` for the CJS output; the
  safer route is `__filename` with the ESM build shimmed, or a tiny per-format
  helper. Confirm whichever is chosen against both outputs — `dist/index.js`
  (ESM, deps external) and `dist/standalone/kanmer-mcp.cjs` (CJS, everything
  inlined).
- File `mtime` survives NSIS installation intact (the installed bundle still
  reads 16:14:14, its build time), so it is a usable non-deterministic-but-
  runtime-observed build stamp that costs nothing in the bundle bytes.

### The three shapes the server ships in are distinguishable by path

- `apps/gui/src/main/connect.ts:36-52` picks one of three: packaged →
  `<resourcesPath>/mcp/kanmer-mcp.cjs`; dev → `packages/mcp-server/dist/standalone/kanmer-mcp.cjs`
  if present, else `packages/mcp-server/dist/index.js`. The plugin manifest adds
  a fourth: `${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs`
  (`plugins/kanmer/mcp/claude.mcp.json`).
- So "packaged bundle vs checkout build" is derivable from the resolved path
  plus the module format, without any build-time flag.

### Where the contract is written down

- `docs/functional/frd/FRD-022-mcp-server-surface.md` R5 is the requirement this
  extends ("`list_board`/`get_status` surface … everything a skill needs
  without bespoke calls"); R6 is the release rail that constrains it.
- The tool surface is doubly documented and mechanically checked:
  `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:10` (the
  `get_status` row) and `AGENTS.md` §7. `plugin:check` only compares tool
  *names*, so the prose has to be corrected by hand.
- `packages/mcp-server/src/smoke.mjs:103-200` is the only executable test of
  `get_status` — mcp-server has no vitest suite. It already accepts
  `KANMER_SERVER`/`KANMER_NODE` env overrides (AGENTS.md §6), which means the
  smoke test can be pointed at the packaged bundle to prove the stamp survives
  packaging without a published release.

## Implications

1. **Two independent signals, and both should ship.** A build-time `version`
   define answers "which release", and a runtime self-`sha256` + resolved path +
   mtime answers "which file, actually". The sha is the one that reproduces the
   measured drift; the version is the one a human reads. Neither substitutes for
   the other.
2. **The stamp must be deterministic in the bundle.** No build timestamp, no git
   sha, or `check-plugin-sync.mjs` becomes unpassable. Everything
   non-deterministic (mtime, self-hash) is observed at *runtime* from the file,
   not baked in.
3. **`scripts/release.mjs` must change** if the version is injected — rebuild
   the standalone bundle and refresh the committed plugin bundle after the
   version bump, inside the release commit. This is the single riskiest edit in
   the ticket and it is a change to a rail whose comments explicitly argue the
   other way, so it needs an operator decision (see open-questions).
4. **Include `repoRoot` and how each root was resolved.** It costs one line, it
   is the second half of the same failure (the `.mcp.json` vs `.codex` split),
   and the ticket already asks for root provenance from MCP-010.
5. **Detection is one-sided by construction.** The currently-installed 0.3.2 app
   predates this feature, so it will simply omit the field. That is fine and
   should be stated in the tool description: *absence* of a `server` block is
   itself the signal "this build is older than 0.3.3". Do not try to make the
   old binary talk.
6. **Core is untouched.** This lives entirely in `packages/mcp-server` plus the
   build/release/doc rails. That makes it a clean parallel lane against
   core-area tickets, but a conflicting lane against MCP-010 (both edit
   `root.ts` and `index.ts`).
7. Trivial defaults taken without asking: cache the self-hash for the process
   lifetime; report a short sha prefix *and* the full digest; classify the build
   shape from the resolved path (`packaged` / `plugin` / `dev-standalone` /
   `dev-esm`); prove packaging with `npm run dist`'s `win-unpacked` output
   rather than a published release; wrap all of it so a failure to stat/hash
   yields `null` fields instead of breaking `get_status`.

## Open questions

See `open-questions` — two are operator-only (changing the release rail;
sequencing against MCP-010).
