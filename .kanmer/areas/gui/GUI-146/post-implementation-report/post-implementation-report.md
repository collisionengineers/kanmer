# Post-implementation report — GUI-146

## Outcome

Fixed the renderer's runtime import of the Node `@kanmer/core` entry, added a
dependency-free guard test that fails fast on any regression, and put
`npm run build -w @kanmer/gui` into the `npm run verify` rail so both the PR
gate and the release rail prove the renderer bundles again. All four plan
steps done exactly as scoped; nothing else touched.

## Files changed

| Path | Change |
| --- | --- |
| `apps/gui/src/renderer/src/lib/standup.ts` | line 2: `import { isCaptureItem } from "@kanmer/core";` → `import { isCaptureItem } from "@kanmer/core/browser";`. The `import type { ... } from "@kanmer/core"` on the next line is unchanged. |
| `scripts/verify.mjs` | `VERIFY_STEPS`: inserted `"npm run build -w @kanmer/gui",` immediately after `"npm run build",` with a one-line comment explaining why (renderer bundles `@kanmer/core/browser`; only a real build proves the graph stays browser-safe). |
| `scripts/renderer-core-imports.test.mjs` (new) | Dependency-free `node:test` guard, styled like the other `scripts/*.test.mjs` files. Exports a pure function `findRuntimeCoreImports(text)` (regex over whole `import ... from "@kanmer/core"` statements, single- or multi-line, excluding `import type` and excluding `@kanmer/core/browser`). One test walks `apps/gui/src/renderer` recursively (skipping `*.test.ts`/`*.test.tsx`) and asserts zero offenders; six more test the pure function directly against the required cases (single-line runtime import rejected, multi-line runtime import rejected, single-line `import type` accepted, multi-line `import type` accepted, `@kanmer/core/browser` accepted). No repo registration needed — `scripts/test-scripts.mjs` enumerates `scripts/*.test.mjs` automatically. |
| `AGENTS.md` | §6 `npm run verify` row: added "the GUI build" to the description. §7 "Renderer imports from `@kanmer/core` must be `import type`" bullet: added one sentence naming `@kanmer/core/browser` (`packages/core/src/browser.ts`) as the runtime entry and `scripts/renderer-core-imports.test.mjs` as the enforcement. The managed block (between the `kanmer:instructions` markers) was not touched — confirmed by `npm run verify:agents-block` (31/31 checks pass) and by `git diff --stat AGENTS.md` showing only 2 insertions/2 deletions in the contributor-guide section below the block. |

## Commands run, in order, with exit codes

| # | Command | Exit | Notes |
| --- | --- | --- | --- |
| 1 | `npm ci` (worktree root) | 0 | 647 packages added; gives the linked worktree its own `node_modules` per AGENTS.md §8 gotcha 8. |
| 2 | `npm run build` (worktree root) | 0 | Core + server workspaces built; `packages/core/dist` now exists. |
| 3 | `npm run build -w @kanmer/gui` — **before the fix** | 1 | Reproduced the exact reported failure: `error during build: ../../packages/core/dist/index.js (675:9): "createHash" is not exported by "__vite-browser-external", imported by "../../packages/core/dist/index.js".` |
| 4 | Applied Step 1 (import change) | — | — |
| 5 | `npm run build -w @kanmer/gui` — **after the fix** | 0 | 428 modules transformed; `out/renderer/assets/index-*.js` emitted. |
| 6 | `npx vitest run src/renderer/src/lib/standup.test.ts` (in `apps/gui`) | 0 | 14/14 tests passed. |
| 7 | `node --test scripts/renderer-core-imports.test.mjs` — **on the fixed tree** | 0 | 6/6 tests passed (guard proven green first). |
| 8 | Reverted Step 1 locally (`@kanmer/core/browser` → `@kanmer/core`) | — | Negative-proof step per plan. |
| 9 | `node --test scripts/renderer-core-imports.test.mjs` — **on the reverted tree** | 1 | Failed as expected: `AssertionError [ERR_ASSERTION]: runtime import of @kanmer/core found in renderer files ... "file": ".../standup.ts", "found": ["import { isCaptureItem } from \"@kanmer/core\";"]`. 5 pass / 1 fail. |
| 10 | Re-applied Step 1 (import fix restored) | — | — |
| 11 | `node --test scripts/renderer-core-imports.test.mjs` — **on the re-fixed tree** | 0 | 6/6 tests passed again. |
| 12 | Applied Step 3 (`VERIFY_STEPS` edit) | — | `grep -rn VERIFY_STEPS scripts/*.test.mjs` returned no matches — no test pins the exact list, so no expectation needed updating. |
| 13 | `npm run test:scripts` | 0 | 167/167 tests passed across 11 suites (includes the new guard file, `pr-workflow.test.mjs`, and the rest). |
| 14 | Applied Step 4 (AGENTS.md edits) | — | — |
| 15 | `npm run verify:agents-block` | 0 | 31/31 checks passed; managed block untouched. |
| 16 | `npm run verify` (worktree root, full rail) | 0 | Full log at `/tmp/verify-full.log` (2129 lines). Step order confirmed via `grep -n "^\$ " /tmp/verify-full.log`: `npm run build` → **`npm run build -w @kanmer/gui`** → `npm test` (167/167 pass, includes the guard) → `npm run typecheck` → `npm run verify:docs` → `node packages/mcp-server/src/smoke.mjs` → `npm run smoke:headless` → `npm run mcpb:check` → `npm run smoke:protocol` → `npm run smoke:discovery` → `npm run verify:skills` → `npm run verify:agents-block` (31/31) → `npm run plugin:check` (`plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 41 tools`). No Windows timing flake (`store.test.ts`/`claims.test.ts`/`docs.test.ts` timeout, teardown `ENOTEMPTY`, `antigravity-plugin-config.test.mjs` `EBUSY`) was hit; a single run was sufficient. |
| 17 | `git diff --check` | 0 | Clean, no whitespace errors. |

## Red-then-green guard evidence (command #7, #9, #11 above)

- **Green (fixed tree, first run):** `ℹ tests 6 / ℹ pass 6 / ℹ fail 0`.
- **Red (reverted tree):** `ℹ tests 6 / ℹ pass 5 / ℹ fail 1` with the assertion naming `apps/gui/src/renderer/src/lib/standup.ts` and the exact offending import string.
- **Green again (re-fixed tree):** `ℹ tests 6 / ℹ pass 6 / ℹ fail 0`.

## Failing-then-passing GUI build evidence (command #3, #5)

- **Before:** `npm run build -w @kanmer/gui` exit 1 — `error during build: ../../packages/core/dist/index.js (675:9): "createHash" is not exported by "__vite-browser-external", imported by "../../packages/core/dist/index.js".` — matches the symptom recorded in the ticket body from `release-prepare-0.4.0.log`.
- **After:** `npm run build -w @kanmer/gui` exit 0 — renderer, main and preload bundles all built; no `createHash`/`__vite-browser-external` error.

## Deviations

None. All four plan steps were followed exactly; no scope was widened. The packaged `KANMER_SMOKE` boot mentioned in the ticket's verification checklist is a `kanmer-verify` responsibility at the merged SHA (per the plan's acceptance-mapping table: "verifier runs the packaged `KANMER_SMOKE` boot at the merge SHA"), not an execution-phase command, and was not run here.

## Notes for kanmer-verify

- Re-confirm `npm run build -w @kanmer/gui` and `npm run verify` at the merged SHA.
- Run the packaged `KANMER_SMOKE` boot as named in the ticket's acceptance mapping.
- The guard test `scripts/renderer-core-imports.test.mjs` should stay green; it is included automatically in `npm run test:scripts` / `npm test`.
