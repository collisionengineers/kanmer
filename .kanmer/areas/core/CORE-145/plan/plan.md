# Plan (CORE-145)

Root cause: `packages/mcp-server/package.json`'s `build` (`tsup && tsup
--config tsup.standalone.config.ts`) never builds `@kanmer/core`, so a
genuinely fresh `git clone` + `npm ci` + `npm run test:http -w
@kanmer/mcp-server` fails in esbuild resolving `@kanmer/core`.

Chosen remedy (of the ticket's two options): fix it in
`packages/mcp-server/scripts/run-http-tests.mjs`'s non-assume-built branch,
not in the package.json `build` script. Rationale for "pick one, do not do
both":

- Root `npm run build` is `npm run build -w @kanmer/core && npm run build -w
  @kanmer/mcp-server` — it already builds core once, in order, before
  mcp-server. If `@kanmer/mcp-server`'s own `build` script were changed to
  `npm run build -w @kanmer/core && tsup && ...`, then the root `npm run
  build` invocation would build core *twice* (once directly, once via the
  nested mcp-server build) — reintroducing exactly the kind of duplicate
  build CORE-140 exists to prevent, and one that CORE-144's new "every
  workspace's build script reached at most once" assertion would now catch as
  a regression. So the package.json route is rejected.
- Instead, `run-http-tests.mjs`'s default (non-assume-built) branch checks
  `existsSync(join(repoRoot, "packages", "core", "dist", "index.js"))` before
  its existing `npm run build` call, and runs `npm run build:core` at the
  repo root first only when that file is absent. This only affects the direct
  `npm run test:http -w @kanmer/mcp-server` / public `npm test` path — the
  rail's `--assume-built` branch (`assertBuilt(["server"])`) is untouched, so
  `VERIFY_STEPS`' "root build reached exactly once" invariant is unaffected:
  the rail never takes the branch this fix touches.
- `packages/mcp-server/package.json`'s `build` script itself is left exactly
  as-is, so `mcpb:build` / root `npm run build` keep building core exactly
  once each, unchanged.

AGENTS.md §6's `npm test` row is updated to say a cold checkout also builds
`@kanmer/core` first when missing, so the documented command contract stays
accurate (conduct rule 24).

## Proof

1. Fresh clone outside the repo from this worktree, no prior build:
   `git clone <worktree> "$TMP/kanmer-fresh-145" && cd "$TMP/kanmer-fresh-145"
   && npm ci && npm run test:http -w @kanmer/mcp-server` — must pass with no
   `packages/core/dist` present beforehand.
2. `node --test scripts/verify-steps.test.mjs` — still proves one root build
   per rail (this fix does not touch `VERIFY_STEPS` or the rail's
   `--assume-built` branch).
3. `npm run test:scripts`.

## Out of scope

Any change to `VERIFY_STEPS`, the rail's `--assume-built` behaviour, or the
public `mcpb:build` / `mcpb:check` commands (already unaffected on a fresh
clone per the ticket).
