# Files — CORE-031

## Where the change lands

| Path | Why |
|---|---|
| `scripts/verify.mjs` | New dependency-free ESM entry point. Export the single ordered `VERIFY_STEPS` array, provide the direct runner used by `npm run verify`, resolve the repository root from `import.meta.url`, inherit stdio, and fail immediately on the first non-zero command. |
| `package.json` | Add exactly one root script, `"verify": "node scripts/verify.mjs"`. Do not alter the existing component scripts because they remain the reusable leaves of the verification pyramid. |
| `scripts/release.mjs` | Import `VERIFY_STEPS`, delete the local `GATE` command array, and iterate the imported list before the dry-run boundary. Preserve every pre-flight, bump, rebuild, packaging, tag, publish, repair, and asset-verification step outside that substitution. Update nearby comments that describe the old order or duplicate manual check. |
| `AGENTS.md` | Update §6 to name `npm run verify` as the PR check and state that `scripts/release.mjs` is that same verification rail plus version bump/pack/publish work. Explicitly prohibit inventing a third command list. Limit edits to statements made inaccurate by this ticket. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `scripts/check-plugin-sync.mjs` | `plugin:check` requires a fresh build, compares committed bytes, and refuses in a linked worktree; this fixes its position at the end of the shared rail and rules out `plugin:build`. |
| `packages/mcp-server/src/smoke.mjs` | Defines the ordinary built-server/store smoke that must remain a separate command. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Defines the protocol compatibility smoke reached through `npm run smoke:protocol`; do not replace it with the ordinary smoke. |
| `packages/mcp-server/src/smoke-discovery.mjs` | Defines the missing discovery path that this ticket adds to the common rail. |
| `scripts/build-manual.mjs` | Confirms `check:manual` is a generated-artifact freshness check and explains why its existing inclusion through `npm test` is sufficient. |
| `scripts/verify-skill-prose.mjs` | The skill-contract verification leaf; it must be invoked, not reimplemented in `verify.mjs`. |
| `scripts/verify-agents-block.mjs` | The managed-block end-to-end verification leaf; it must be invoked, not reimplemented. |
| `apps/gui/package.json` | Shows that GUI tests and GUI typechecking are reached through root workspace scripts, while Electron building/packaging is intentionally outside this PR rail. |
| `MASTERPLAN.md` | S-01 fixes the exact order, exclusions, release-rail wording, and acceptance boundary. |
| `.kanmer/groups/EPIC-009/context.md` | Constrains the ticket to the compiled-workflow spine and rules out unrelated workflow mechanisms. |

## Ripple effects

- CORE-032 will call `npm run verify` from GitHub Actions; changing the command name or adding environment-specific assumptions would block the next ticket.
- `npm run release <version> --dry-run` will execute the new order and gain `smoke:discovery`; its later output must still describe only release-specific actions.
- A failure may surface earlier or later than before because tests/typechecking move ahead of build and plugin checking. This is an intentional rail change, not an accidental reorder.
- `npm run plugin:check` still requires the build produced earlier in the same rail and a normal checkout.
- Existing release documentation/comments that explicitly list the old gate order must be corrected in the same diff; unrelated roadmap prose remains for CORE-032/CORE-033.

## Out of scope

- `.github/workflows/*`, branch protection, and required-check configuration.
- GUI/Electron build or boot smoke, `npm run dist:check`, release publication, or release-asset verification.
- Rebuilding or changing `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- Adding dependencies, a task-runner package, caching, parallel execution, conditional step skipping, or OS-specific variants.
- Refactoring the individual leaf scripts or changing what their tests validate.
