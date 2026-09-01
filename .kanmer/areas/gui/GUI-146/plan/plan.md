# Plan — GUI-146

## Outcome

`npm run build -w @kanmer/gui` succeeds on `main` again, `npm run verify` proves it on every PR, and a runtime import of the Node core entry from the renderer fails a test instead of the release.

## Non-goals

No vite aliasing or Node-builtin polyfill in the renderer; no change to `packages/core/src/browser.ts` exports; no other renderer refactor; no change to what the release script does after the verify gate.

## Evidence

- Release prepare log `C:\Users\Alex\Documents\KanmerBackups\release-prepare-0.4.0.log` lines 2270–2350: verify rail green, then `electron-vite build` fails with `"createHash" is not exported by "__vite-browser-external", imported by "../../packages/core/dist/index.js"`.
- `git grep` on `main` a744fd76: the only non-`type` import of `@kanmer/core` under `apps/gui/src/renderer` (non-test) is `lib/standup.ts:2`, introduced by PR #298 (CORE-117).
- `scripts/verify.mjs:12-27` `VERIFY_STEPS` has no GUI build; AGENTS.md §10 item 4 requires one.
- `packages/core/src/browser.ts` re-exports `./profiles.js`, which defines `isCaptureItem` (`profiles.ts:216`).

## Current production path

GUI Standup view → `apps/gui/src/renderer/src/lib/standup.ts` (pure report builder) → `isCaptureItem(item)` to exclude captures → rendered by `components/Standup.tsx`. Behaviour to preserve: captures excluded from the standup exactly as today (`apps/gui/src/renderer/src/lib/standup.test.ts` covers it).

## Steps

### Step 1 — Import from the browser entry

- Files: `apps/gui/src/renderer/src/lib/standup.ts`
- Change: `import { isCaptureItem } from "@kanmer/core";` → `import { isCaptureItem } from "@kanmer/core/browser";`
- Preserve: the `import type { … } from "@kanmer/core"` on the next line stays.
- Test: `npm run build -w @kanmer/gui` exit 0 (was exit 1); `npx vitest run src/renderer/src/lib/standup.test.ts` in `apps/gui` exit 0.
- Done when: the GUI builds and the standup test passes.

### Step 2 — Guard test

- Files: `scripts/renderer-core-imports.test.mjs` (new)
- Change: `node:test` suite that walks `apps/gui/src/renderer` recursively, skips `*.test.ts`/`*.test.tsx`, and for each file asserts that every `from "@kanmer/core"` occurrence belongs to an `import type` statement (handle multi-line `import type {\n …\n} from "@kanmer/core";`). `@kanmer/core/browser` is allowed. Include one positive fixture case (a temp file written under `os.tmpdir()`, not under the repo) proving the checker rejects `import { isCaptureItem } from "@kanmer/core";` and accepts the `type` form and the `/browser` form — make the checker a pure function over file text so the fixture needs no repo write.
- Negative case: run the test with Step 1 reverted locally to confirm it fails; then re-apply Step 1. Record both outputs.
- Test: `npm run test:scripts` exit 0.
- Done when: the guard is green on the fixed tree and was red on the broken tree.

### Step 3 — Verify rail

- Files: `scripts/verify.mjs`
- Change: insert `"npm run build -w @kanmer/gui",` immediately after `"npm run build",` in `VERIFY_STEPS`, with a one-line comment: the renderer bundles `@kanmer/core/browser`; only a real build proves the renderer graph stays browser-safe.
- Preserve: the `npm test` env override and every other step and order.
- Test: `node --test scripts/pr-workflow.test.mjs` and `npm run test:scripts` exit 0 (if a test pins the exact `VERIFY_STEPS` list, update that expectation); then `npm run verify` from the worktree root with its own `node_modules` — exit 0 and the log shows the GUI build step.
- Done when: `npm run verify` exit 0 including the new step.

### Step 4 — Documentation in the same PR

- Files: `AGENTS.md`
- Change: §6 `npm run verify` row: add "GUI build" to the list; §7 bullet "Renderer imports from `@kanmer/core` must be `import type`": add one sentence — runtime helpers come from `@kanmer/core/browser` (`packages/core/src/browser.ts`), and `scripts/renderer-core-imports.test.mjs` enforces it.
- Test: `npm run verify:agents-block` exit 0 (the managed block is untouched; this is the contributor guide below it).
- Done when: both edits present; `git diff --check` clean.

## Acceptance mapping

| Criterion | Step | Proof |
| --- | --- | --- |
| GUI builds; packaged smoke boots | 1 | `npm run build -w @kanmer/gui` exit 0; verifier runs the packaged `KANMER_SMOKE` boot at the merge SHA |
| verify rail shows the GUI build | 3 | `npm run verify` log |
| guard fails on reintroduction, passes on fix | 2 | retained red/green outputs |

## Complexity budget

No dependency, no config, no persistent data, no public surface, one new test file, two doc sentences.

## Stop condition

Stop after the PR is open with the post-implementation report written; do not merge. Deviation: if `npm run build -w @kanmer/gui` still fails after Step 1, report the next error verbatim and stop rather than widening scope.
