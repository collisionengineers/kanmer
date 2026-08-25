# Post-implementation report — SKILL-034

## Outcome

The Kanmer plugin now ships the exact canonical managed-block writer and body that the installed `kanmer-setup` skill invokes. The existing skill command resolves from `skills/kanmer-setup` to the version-root `scripts/agents-block.mjs`, so no prose or alternate implementation was needed.

## Changes

- Extended `scripts/build-plugin.mjs` to copy `agents-block.mjs` and `agents-block-body.mjs` into `plugins/kanmer/scripts/`.
- Committed those generated runtime files beside the installed skills.
- Extended `plugin:check` to reject a missing or byte-drifted packaged setup runtime.
- Added an installed-layout regression that copies the plugin to a versioned cache-shaped path, executes the documented relative command, reruns it byte-idempotently, and confirms malformed markers fail without modifying the target.
- Updated `AGENTS.md` to document the generated setup-runtime contract.

## Scope disposition

No setup prose changed: its existing relative path is correct. No fallback, dependency, second managed-block body, cache mutation, or unrelated setup behaviour was introduced.

## Verification

All commands exited 0:

- `npm run plugin:build`
- `npm run plugin:check` — 37 tools, bundle bytes, 12 skill frontmatters, manifests, isolated handshake, and setup runtime sync pass
- `npm run verify:agents-block` — 31/31
- `npm run test:scripts` — 104/104
- `npm run verify:skills`
- `node --test scripts/plugin-setup-runtime.test.mjs` — 2/2 after installed-copy strengthening
- `git diff --check`

## Production caller

The production caller is the installed `kanmer-setup` skill command. Marketplace/plugin installation copies the whole `plugins/kanmer` payload, and the command now reaches the committed version-root script without requiring a source checkout.
