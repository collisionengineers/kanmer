## Objective

Build each rail artifact (`core`, `server`, `standalone`) exactly once per `npm run verify` run, and refuse (never silently rebuild) any later step that consumes a stale/mismatched already-built output.

## Governing docs

No PRD/FRD/ADR is linked to this ticket. This is an internal build-tooling change to the verification rail with no product-facing behaviour change; the acceptance criteria in the ticket body are the governing contract. `AGENTS.md` §6 is updated to describe the new commands (documentation, not a new governing doc).

## Starting state

- `scripts/verify.mjs` exports `VERIFY_STEPS`, imported by `scripts/release.mjs:45` and run in its loop at `:308`.
- Root `npm test` = `check:manual && test -w core && test -w gui && test:http -w mcp-server && test:scripts`.
- `packages/mcp-server` `test:http` = `npm run build && node --test <fixed file list>`.
- `mcpb:build` = `npm run build && node scripts/build-mcpb.mjs`; `mcpb:check` = `mcpb:build && node scripts/check-mcpb-sync.mjs`.
- Net effect: `npm run build` runs 3 times per `npm run verify` (once directly, once inside `test:http`, once inside `mcpb:build`).

## Required changes

1. `scripts/build-stamp.mjs`: dependency-free (node builtins only). `writeStamp()` computes and writes `dist/verify-stamp.json` with `stampVersion:1, createdAt, head, dirty, dirtyDigest, lockHash, node, nodeMajor, platform, outputs:[{id,path,bytes,sha256}]` for ids `core` (`packages/core/dist/index.js` + `packages/core/dist/browser.js` — treat as one output entry with a combined digest, or two entries; pick two entries id `core-index`/`core-browser` under outputs, but expose logical id `core` to `assertBuilt`), `server` (`packages/mcp-server/dist/index.js`), `standalone` (`packages/mcp-server/dist/standalone/kanmer-mcp.cjs`). `dirtyDigest`: sha256 over `git status --porcelain=v1 -z` output concatenated with sorted sha256 of each modified/untracked tracked-path file; null when clean. `readStamp()` returns parsed JSON or null. `assertBuilt(ids)` exits 1 with a clear stderr message (never rebuilds) on: absent stamp, `stampVersion` mismatch, HEAD differs, `dirty` true and `dirtyDigest` differs (or stamp says clean but tree is now dirty), `lockHash` differs, `nodeMajor` differs, any requested output id missing/hash-mismatched. CLI: `--write` calls `writeStamp()`; `--assert <id...>` calls `assertBuilt(ids)`.
2. `packages/mcp-server/scripts/run-http-tests.mjs`: exports the exact current `test:http` file list as a constant; default behaviour = `npm run build` then `node --test <files>`; `--assume-built` flag calls `assertBuilt(["server"])` (import from root `../../scripts/build-stamp.mjs`) and skips the build step.
3. `scripts/run-tests.mjs`: owns the exact `npm test` chain (`check:manual`, `test -w core`, `test -w gui`, `test:http -w mcp-server`, `test:scripts`) in the same order, same env passthrough, exits on first failure. `--assume-built` runs `npm run test:http:built -w @kanmer/mcp-server` instead of `test:http -w @kanmer/mcp-server`.
4. `package.json` scripts: mcp-server `test:http` → `node scripts/run-http-tests.mjs`; add `test:http:built` → `node scripts/run-http-tests.mjs --assume-built`. Root `test` → `node scripts/run-tests.mjs`; add `test:built` → `node scripts/run-tests.mjs --assume-built`; add `mcpb:build:built` → `node scripts/build-stamp.mjs --assert server standalone && node scripts/build-mcpb.mjs`; add `mcpb:check:built` → `npm run mcpb:build:built && node scripts/check-mcpb-sync.mjs`. Public `test`, `test:http`, `mcpb:build`, `mcpb:check` keep today's fresh-checkout (self-building) behaviour.
5. `scripts/verify.mjs` `VERIFY_STEPS`: `npm run build` → `node scripts/build-stamp.mjs --write` → `npm run build -w @kanmer/gui` → `npm run test:built` → `npm run typecheck` → ... (unchanged) ... `npm run mcpb:check:built` → rest unchanged. Update the `KANMER_ROOT` env comparison from `step === "npm test"` to `step === "npm run test:built"`.
6. `scripts/release.mjs`: after the `for (const step of VERIFY_STEPS) run(step);` loop, `const stamp = readStamp(); if (stamp?.dirty) refuse(...)`. No other change to release.mjs.
7. `scripts/verify-steps.test.mjs`: statically resolve every `VERIFY_STEPS` string through root and workspace `package.json` `scripts` maps — handle `npm run X`, `npm run X -w <ws>`, `&&` chains, bare `node ...` leaves as terminal. Assert root `build` script is reached exactly once across the whole resolved rail (this is the acceptance test). Also unit-test `build-stamp.mjs`: init a temp git repo, commit a file, run `writeStamp`, then mutate (wrong head via new commit, wrong nodeMajor via forced field edit, wrong output hash via touching an output file, dirty digest change via editing a tracked file) and assert `assertBuilt` throws/exits 1 for each; assert a matching, clean case passes.
8. `.github/workflows/pr.yml`: `node-version: 24` for both the `verify` and `kanmer-gate` jobs' `actions/setup-node@v4` steps. Leave `release.yml` at 20 and root `package.json` `engines` unchanged.
9. `scripts/pr-workflow.test.mjs`: read it first; only touch if it currently asserts a `node-version` value (expected: it does not — it asserts trigger/concurrency/board-fetch text, not the Node version).
10. `AGENTS.md` §6: append a sentence to the `npm test`, `npm run verify`, and `mcpb:check` rows about the stamp and the `:built` variants (per conduct rule 24 — AGENTS.md changes must accompany the behaviour they document).

## Expected files

- `scripts/build-stamp.mjs`
- `packages/mcp-server/scripts/run-http-tests.mjs`
- `scripts/run-tests.mjs`
- `scripts/verify-steps.test.mjs`
- `scripts/verify.mjs`
- `scripts/release.mjs`
- `package.json`
- `packages/mcp-server/package.json`
- `.github/workflows/pr.yml`
- `scripts/pr-workflow.test.mjs` (conditional)
- `AGENTS.md`

## Do not modify

`scripts/agents-block-body.mjs`, any `SKILL.md`, `packages/mcp-server/src/reconciliation.ts`, `apps/gui/src/**`, `.github/workflows/release.yml`, root `engines`, `scripts/test-scripts.mjs` (behaviour, though it auto-discovers the new test file), `packages/core/scripts/check-browser.mjs`.

## Constraints

- Dependency-free scripts (node builtins only), matching the rest of `scripts/`.
- Never rebuild silently on assertion failure — always exit 1 with a clear message.
- Keep every existing assertion and test file selection identical; only change how they are invoked/gated.
- Public standalone commands (`npm run test:http -w @kanmer/mcp-server`, `npm run mcpb:check`, root `npm test`) must still pass unmodified on a fresh `git clone && npm ci`.

## Ordered steps

### Step 1 — build-stamp.mjs
Write `scripts/build-stamp.mjs` with `writeStamp`, `readStamp`, `assertBuilt`, and CLI handling for `--write` / `--assert <ids...>`.

### Step 2 — run-http-tests.mjs and run-tests.mjs
Write `packages/mcp-server/scripts/run-http-tests.mjs` and `scripts/run-tests.mjs`, each supporting `--assume-built`.

### Step 3 — package.json wiring
Update root and mcp-server `package.json` scripts per Required change 4.

### Step 4 — verify.mjs and release.mjs
Update `VERIFY_STEPS` ordering/env comparison and add the release-time dirty refusal.

### Step 5 — verify-steps.test.mjs
Write the static resolver test plus build-stamp unit tests.

### Step 6 — pr.yml Node bump
Bump both jobs to `node-version: 24`; verify `pr-workflow.test.mjs` still passes unmodified (or update if it asserts node-version).

### Step 7 — AGENTS.md
Add the stamp/`:built` sentence to the three command rows.

## Acceptance checks

- `node --test scripts/verify-steps.test.mjs scripts/pr-workflow.test.mjs` passes.
- `npm run build && node scripts/build-stamp.mjs --write` then `npm run test:built` and `npm run mcpb:check:built` pass without rebuilding core/server/standalone redundantly.
- `node scripts/build-stamp.mjs --assert server standalone` passes right after a build; fails after touching a tracked source file (dirty digest change), after checking out a different HEAD, or after a Node major mismatch.
- Fresh `git clone` + `npm ci`: `npm run test:http -w @kanmer/mcp-server` and `npm run mcpb:check` still pass (AT-07).

## Commands

```
node --test scripts/verify-steps.test.mjs scripts/pr-workflow.test.mjs
npm run build && node scripts/build-stamp.mjs --write
npm run test:built
npm run mcpb:check:built
node scripts/build-stamp.mjs --assert server standalone
```

## Failure and deviation rules

If a required output cannot be represented as the exact ticket-specified `outputs` shape (e.g. core has two files, not one), record the deviation in the post-implementation report and choose the closest faithful representation (two `core-*` output entries checked together for the `core` id) rather than silently dropping a check. Any other deviation from this plan is recorded in the post-implementation report, not silently absorbed.

## Stop condition

Stop once: the scoped checks above all pass, `pr.yml` is on Node 24 in both jobs, `release.mjs` refuses on a dirty stamp, `AGENTS.md` §6 is updated, and the fresh-clone safety check (AT-07) passes. Do not run the full `npm run verify` locally — CI and Alex own that.
