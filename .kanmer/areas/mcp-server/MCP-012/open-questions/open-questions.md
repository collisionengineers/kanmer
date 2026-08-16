# Open questions — MCP-012

Two remain, and **both are operator-only** — they change a release rail and a
wave schedule, which research must not decide unilaterally. Everything else was
decided during research and is recorded as ticked below.

## Needs the operator

- [ ] **OPERATOR — May `scripts/release.mjs` be changed so the release commit
      contains a rebuilt MCP bundle, not just the version bump?** Why it matters:
      if the server version is injected at build time, today's rail ships a
      wrong one. `release.mjs:149-163` builds and runs `plugin:check`, *then*
      bumps `apps/gui/package.json` + root `package.json` (184-192), then packs
      (200-201) — the MCP standalone bundle is never rebuilt after the bump. So
      `v0.3.3` would ship `resources/mcp/kanmer-mcp.cjs` reporting `0.3.2`, and
      the next `plugin:check` would fail against the now-stale committed plugin
      bundle. The fix is a rebuild + `plugin:build` between the bump and the
      pack, which contradicts the deliberate comment at 151-152 ("NOT
      plugin:build — that rewrites the committed bundle, which would dirty the
      tree mid-release") and widens "the release commit must contain only the
      version bump" (115). **Recommended answer: yes** — insert
      `npm run build && node scripts/build-plugin.mjs` after the bump and let
      the release commit carry the regenerated bundle; the alternative is to
      drop the version field and report only the runtime self-sha256 + path +
      mtime, which still makes the drift visible but gives humans no release
      number to read. Only the operator can accept the release-rail risk.

- [ ] **OPERATOR/ORCHESTRATOR — Does MCP-012 wait for MCP-010, or ship
      independently?** Why it matters: both tickets are in Preparing, in area
      `mcp-server`, in group HZN-003, and both edit
      `packages/mcp-server/src/root.ts` and `src/index.ts`. MCP-010's own body
      says *"Return the discovered root and how it was found, so MCP-012 can
      surface it"* — so they are adjacent by design and **cannot run as
      concurrent parallel lanes without a conflict**. **Recommended answer:
      sequence MCP-010 first in the same lane**, and have MCP-012 report root
      provenance from whatever the resolver then exposes. Fallback if MCP-010
      slips: ship MCP-012 now reporting only what today's resolver knows
      (`--root` / `KANMER_ROOT` / cwd, and `--repo-root` / `KANMER_REPO_ROOT` /
      derived) and let MCP-010 enrich the same field later. The scheduler owns
      this call, not the planner.

## Parked (explicitly deferred)

- [ ] Should `get_status` *judge* the build (warn "your server is stale") rather
      than just report it? Safe to defer: judging needs a known-good reference to
      compare against, which is CORE-023's job. Reopen if CORE-023 lands a
      version oracle this could consume.
- [ ] Should `packages/mcp-server/package.json` (`0.1.0`) and
      `plugins/kanmer/.claude-plugin/plugin.json` (`0.1.0`) be realigned with the
      released version (`0.3.2`)? Safe to defer: neither is read at runtime by
      the shipped bundle, so nothing is wrong today. Reopen if the version
      decision makes either one the source of truth.
- [ ] Should the GUI show the identity of each running server (Sessions /
      Connect panels)? Safe to defer: the agent-facing gap is the one that caused
      the incident. Reopen once `get_status` carries the data and a human wants
      it without an agent.

## Decided during research (recorded, not asked)

- **Which version.** The root / `apps/gui` `package.json` version (`0.3.2`) —
  it is the only one `release.mjs` bumps. `packages/mcp-server/package.json`
  (`0.1.0`) is never bumped and is not a usable source.
- **The stamp must be deterministic in the bundle.** No build timestamp and
  **no git sha**: `check-plugin-sync.mjs:57-76` compares the committed bundle's
  bytes against a fresh build, and a git sha embedded in a *committed* artifact
  is always the parent commit's — every subsequent commit would fail the check.
  Non-deterministic facts (mtime, self-hash) are observed at runtime from the
  file instead.
- **Identity = injected version + runtime self-sha256 of the running script +
  resolved path + mtime + size.** The sha is what reproduces the measured
  `e92a2679` vs `96fe9f8a` drift; the version is what a human reads.
- **Build shape is derived from the resolved path + module format**
  (`packaged` / `plugin` / `dev-standalone` / `dev-esm`), per
  `apps/gui/src/main/connect.ts:36-52` — no build-time flag needed.
- **Cost.** Hash lazily and cache for the process lifetime; `get_status` runs
  once or twice a session and the file is ~1.4 MB.
- **Failure mode.** Any stat/hash/path failure yields `null` fields, never an
  `isError` result — `get_status` is the orientation call and must not break.
- **`repoRoot` is included.** It is the second half of the same failure
  (`.codex/config.toml` passes `--repo-root`, `.mcp.json` does not) and is
  invisible today.
- **Detection is one-sided and that is fine.** Servers older than this change
  omit the block; *absence* is the signal "pre-0.3.3 build". This goes in the
  tool description.
- **Proving "survives packaging".** `npm run dist` →
  `apps/gui/release/win-unpacked/resources/mcp/kanmer-mcp.cjs`, driven by
  `smoke.mjs` with `KANMER_NODE`/`KANMER_SERVER` (AGENTS.md §6). No published
  release needed.
