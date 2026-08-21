# Proof

PR [#133](https://github.com/collisionengineers/kanmer/pull/133), merged on main as **cfd2e35aa7fbff1807fccd32caadf64442b2c70a** (fix commit **60705980** included).

## Acceptance

The reference-file lifecycle is wired through core, typed IPC, Electron main, and the Editor: picker and drag/drop add files under the gate-exempt `reference/` folder, collisions suffix safely, the list opens externally, and removal is confirmed and containment-checked. The merged implementation also rejects pre-normalization traversal such as `foo/../mockup.png` for both add and remove.

## Merged-main verification

- `npm test -w @kanmer/core -- --testTimeout=30000` — **PASS**, 258/258.
- The first concurrent default full-core run recorded **FAIL**, 257/258: `migration: v2 → v3 > collapses seven stages to six...` exceeded Vitest's 5-second test timeout under load. The focused migration suite then passed 16/16, and the full rerun with the explicit 30-second timeout passed 258/258; the initial failure is retained here rather than erased.
- `npm test -w @kanmer/gui` — **PASS**, 351/351 across 37 files.
- `npm run typecheck` — **PASS**.
- `npm run build -w @kanmer/gui` — **PASS**.
- `node packages/mcp-server/src/smoke.mjs` — **PASS**, 195/195 protocol and surface checks.
- `npm run plugin:build && npm run plugin:check` — **PASS** in the main checkout: 30 tools, bundle bytes match, 12 skill frontmatters, manifests v0.3.3, isolated handshake. The committed artifact was restored afterward; the baseline `plugin:check` against the merged artifact failed with exit 1 because esbuild emitted only checkout-relative source-comment path differences (514 lines each way), so this reproducibility issue remains explicit rather than being hidden in an unowned commit.
- `git diff --check` — **PASS**.

## Manual evidence

Native Electron drag/drop, opening a real binary, and the confirmation click were not available in an authorized disposable GUI session. The deterministic Editor tests and core containment/collision tests cover the shared implementation; manual visual evidence remains **INCONCLUSIVE**.

## Scope

No GUI-105 document-inventory, provider, or unrelated ticket changes were included.
