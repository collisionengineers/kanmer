# Research — CORE-031: shared verification rail

## Question

How should Kanmer expose one deterministic PR verification command while preserving the release script’s refusal and publishing behaviour, avoiding a second copy of the verification pyramid, and remaining reliable on Windows?

## Findings

- `package.json` has separate `build`, `test`, `typecheck`, MCP smoke, skill verification, managed-block verification, and plugin synchronization scripts, but no root `verify` command. Source: `package.json`.
  - `npm test` already runs `npm run check:manual`, the core tests, GUI tests, and `scripts/*.test.mjs`; a second explicit `check:manual` inside the shared rail would be duplicate work.
  - `npm run build` builds `@kanmer/core` and `@kanmer/mcp-server`, including the standalone MCP bundle. It intentionally does not build/package the Electron GUI.
- `scripts/release.mjs` currently owns a local `GATE` array and executes it before any version bump or packaging. Source: `scripts/release.mjs`, verification-gate section.
  - Its present order is build → plugin check → tests → MCP smokes → managed-block verification → an explicit duplicate manual check → skill verification → typecheck.
  - It does not run `smoke:discovery`, even though root discovery is a separate product path and already has a dedicated script.
  - Everything after the gate—version validation, package/version rewrites, plugin rebuild after the bump, two packaging passes, tag/push, publication, and release-asset verification—must remain release-only.
- `scripts/check-plugin-sync.mjs` compares the committed plugin bundle with the freshly built standalone bundle. Source: `scripts/check-plugin-sync.mjs`.
  - Therefore the shared rail must build before `plugin:check` and must not run `plugin:build`; rebuilding the committed bundle would mutate the checkout and invalidate CI/main-checkout verification.
  - The check deliberately refuses in linked ticket worktrees. The authoritative rail is consequently expected to run from a normal checkout, which matches GitHub Actions’ checkout shape and the MASTERPLAN constraint.
- The repository’s MCP verification has three distinct paths. Sources: `packages/mcp-server/src/smoke.mjs`, `packages/mcp-server/src/smoke-protocol.mjs`, and `packages/mcp-server/src/smoke-discovery.mjs`.
  - `smoke.mjs` exercises the built server’s tool surface and store behaviour.
  - `smoke-protocol.mjs` checks raw JSON-RPC/protocol compatibility and actor identity.
  - `smoke-discovery.mjs` checks root/board discovery without an explicit `--root`; it is not redundant with the other two.
- `AGENTS.md` §6 is the repository’s command contract, while §§10–11 still describe a manual-only verification model and no CI. Source: `AGENTS.md`.
  - This ticket specifically needs the command/release-rail wording in §6. Broader statements about CI and branch protection belong to CORE-032 and CORE-033 and should not be pre-emptively rewritten here.
- A dependency-free ESM script can be both importable and directly executable. The least-surprising shape is to export the immutable ordered `VERIFY_STEPS` array and a small runner, then execute the runner only when `scripts/verify.mjs` is the process entry point. Source precedent: the dependency-free scripts under `scripts/` and Node 20 ESM support declared in `package.json`.

## Implications

- There must be exactly one ordered command array, in `scripts/verify.mjs`, consumed by both `npm run verify` and `scripts/release.mjs`.
- The load-bearing order is: tests → all-workspace typecheck → core/server build → standard MCP smoke → protocol smoke → discovery smoke → skill prose verification → AGENTS managed-block verification → plugin synchronization.
- The release script must import the array and keep its existing `run()`/refusal/publishing machinery; it must not shell out to `npm run verify`, because importing the commands makes the shared source explicit and preserves release logging and immediate failure semantics.
- No package, workflow, GUI build, Electron boot, distribution build, release-asset check, or committed plugin rebuild belongs in this ticket.
- CORE-032 can depend on the stable command name without duplicating the command list.

## Open questions

No product or architecture question remains. The command list, exclusions, checkout constraint, and release-script relationship are fixed by the ticket and MASTERPLAN S-01.
