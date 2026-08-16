# Post-implementation report — MCP-012

## Summary

`get_status` now answers both of the questions an agent has at session start —
**which board** and **which server**. A new `server` block names the build that
is answering (release version, resolved path, a runtime sha256 of its own
bytes, mtime, size, and a build shape), and `repoRoot` / `repoRootSource` join
MCP-010's `rootSource` so the *other* silent divergence — `.codex/config.toml`
passes `--repo-root`, `.mcp.json` does not — is visible too. The defect was
reproduced first and recorded: two provably different bundles (`e92a2679`,
gate absent; `96fe9f8a`, gate present) spawned over real stdio against one
board returned **byte-identical `get_status` output in every field**. After the
change they are distinguishable on first contact, in both directions.

The riskiest part of this ticket was never the handler. It was
`scripts/release.mjs`: putting the version in the bundle makes the bundle a
function of the version, so the release rail had to change or every release
would ship a bundle reporting the *previous* version and leave `plugin:check`
red on main. That was authorised by the operator and is demonstrated
empirically below rather than argued.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/identity.ts` | **added** | Resolves the running script's own path, lazily sha256s its bytes (cached per process), stats mtime/size, classifies the build shape from path segments, and exposes the injected version. Every failure yields `null`; nothing throws, because `get_status` is the orientation call. The self-hash is the field that does the real work — it needs no cooperation from the build system, so it distinguishes bundles produced by entirely different means. |
| `packages/mcp-server/version-define.mjs` | **added** | The esbuild `define`, shared by both tsup configs so the ESM and CJS shapes can never disagree about the version they claim. Reads the **root** `package.json` — the only one `release.mjs` bumps (`packages/mcp-server/package.json` is stuck at `0.1.0`). Plain `.mjs`, not `.ts`: `tsconfig.json` only includes `src/**/*`, and `.mjs` removes any esbuild extension-mapping ambiguity for a config-time import. |
| `packages/mcp-server/src/index.ts` | modified | `get_status` gains `repoRoot`, `repoRootSource` and `server`; `resolveRoot()` classifies `repoRootSource` where `resolveRepoRoot`'s inputs are still in scope (keyed off the *resolved value* first, so a valueless `--repo-root` is not falsely reported as `flag`). `new McpServer({ version: "0.1.0" })` → the injected version. Tool description rewritten. The stderr ready-line now carries the identity too — that is where anyone debugging "why did these two hosts disagree" looks first. |
| `packages/mcp-server/tsup.config.ts` | modified | `define` + `shims: true`. ESM has no `__filename`; tsup injects the `fileURLToPath(import.meta.url)` shim. |
| `packages/mcp-server/tsup.standalone.config.ts` | modified | `define` only. **Deliberately no `shims`** — CJS has `__filename` natively, and this config's output is the one compared byte-for-byte, so it gains nothing it does not need. Verified in the built artifacts: the CJS bundle contains **zero** `import.meta` occurrences. |
| `packages/mcp-server/src/smoke.mjs` | modified | +13 checks. They **recompute the spawned file's sha256 in-test** and compare, rather than asserting a string is a string — a server reporting a constant would pass the weak version. Also asserts the MCP handshake version matches the block, both roots, and that the build shape is never `unknown` for a known entry. |
| `scripts/release.mjs` | modified — **HIGH risk** | See the dedicated section below. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | regenerated | The committed bundle; `plugin:check` gates it byte-for-byte. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | modified | The `get_status` row. Only tool *names* are machine-checked, so this prose is unprotected. |
| `AGENTS.md` | modified | §5 mcp-server: the identity block and the two rules that are easy to break (determinism; the release-rail ordering). Outside the generated managed block. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | modified | New R5b (the surface + its constraints) and R5c (the release commit carries the derived artifacts); R6 links the determinism rule to the byte comparison that forces it. **`FRD-022:48-49`'s smoke-script count was left alone** — MCP-010 already corrected it. |

### What changed in `scripts/release.mjs`, exactly

Three places, all in prose or additive; nothing was deleted.

1. **`:111-121` — the clean-tree refusal text.** Was *"the release commit must
   contain only the version bump"*. Now *"…only the version bump **and the
   artifacts this script regenerates from it**"*, with a comment naming them
   (the plugin bundle, `package-lock.json`) and preserving what must still be
   true at the start: nothing *else* is pending, so nothing is swept in from
   the working tree.
2. **`:155-166` — the `GATE` comment that argued against `plugin:build`.**
   **Rewritten, not removed.** Its original reasoning still holds *at that
   point*: the gate runs before the bump, the tree must be clean, and rewriting
   the bundle there would dirty it for no gain. The comment now says that, and
   adds that `plugin:build` **moved** to step 5b rather than being dropped.
3. **`:223-249` — new step 5b**, after the bump and `npm install
   --package-lock-only`, before the GUI pack: `npm run build`, `node
   scripts/build-plugin.mjs`, then `npm run plugin:check` again as a cheap
   guard that stops the release with the tree still local and fixable. It must
   precede the pack because `extraResources` copies
   `dist/standalone/kanmer-mcp.cjs` into the app. The regenerated bundle is
   tracked, so step 7's existing `git commit -am` carries it — no staging
   change needed.
4. **The `--dry-run` printout** was renumbered and now names the rebuild step,
   or the rehearsal would misdescribe a real release.

## Governing docs

`refs`: `docs/functional/frd/FRD-022-mcp-server-surface.md`.

- **Meets R5.** "Everything a skill needs without bespoke calls" — an agent
  currently cannot answer "which server" or "which `refs` base" from inside a
  session at all. Same gap, one field-set wider.
- **Meets R6, and strengthens it.** The rail stays green: `tool-reference.md`
  updated, the bundle rebuilt and committed with the source, `smoke.mjs`
  extended (133/133).
- **Modifies FRD-022 — authorised.** New **R5b** (the identity surface, the
  determinism constraint, one-sided detection) and **R5c** (the release commit
  carries the artifacts derived from the bump). The operator authorised the
  release-rail widening explicitly; R5c is that decision written down where the
  contract lives.
- **No new ADR.** ADR-0012 already owns root resolution and the `RootSource`
  vocabulary; this *reports* it. `RootSource` is imported from `@kanmer/core`
  rather than re-declared, so it cannot drift — including the seventh value
  `init`, which `smoke:discovery` exercises end-to-end (`rootSource=init`). The
  one real constraint (the stamp must be a pure function of the source tree) is
  imposed *by* the existing `check-plugin-sync.mjs` rail, not chosen here, and
  is recorded in prose at both ends.

## Risks / follow-ups

- **`scripts/release.mjs` is the risk.** Nothing exercises a real release short
  of cutting one. Mitigations: the edit is additive and ordered; step 5b
  re-runs `plugin:check` before anything is packed, committed, tagged or
  pushed; the dry run was updated to match. The failure it prevents is
  demonstrated (see below), not asserted.
- **[[GUI-066]] also edits `release.mjs`.** It had not opened a PR at the time
  of writing and `origin/main` does not contain it, so there was no conflict.
  Rebased onto `origin/main` @ `c81063e` and the full rail re-run after.
  Whoever lands second should re-read step 5b rather than resolving mechanically.
- **A pre-existing flaky GUI test**, unrelated to this change:
  `apps/gui/src/main/kanmerGit.test.ts > ensureBoardWorktree reconciliation >
  moves a worktree left on the old branch onto the configured one` fails
  intermittently with `Test timed out in 5000ms` and `EPERM` on a Windows temp
  dir. It is a real-git test that takes 3–7s against a 5s default timeout, and
  it flakes under machine load (several agents are active on this box). **This
  commit touches zero files under `apps/gui` or `packages/core`** — `git diff
  origin/main HEAD -- apps/gui packages/core` is empty — so the code under test
  is byte-identical to `origin/main`. Passed on one full run (230/230) and
  failed on others. Worth its own ticket to raise the timeout; not this one's.
- **[[CORE-023]] is queued behind this on the same `get_status` handler** and
  should be told the moment this merges. It wants to *judge* staleness; this
  deliberately only *reports*, because judging needs a known-good reference,
  which is CORE-023's job.
- Parked and unchanged: realigning `packages/mcp-server/package.json` and
  `plugin.json` (both `0.1.0`) — neither is read at runtime by the shipped
  bundle, and the version reaches the server by `define`, so neither became a
  source of truth. Surfacing identity in the GUI is also still parked.

## Verification hand-off

On merged `main`, from a clean checkout:

1. `npm install && npm run build`
2. `npm run plugin:check` → *"29 tools match, bundle bytes match, 12 skill
   frontmatters parse"*. **Run it twice with `npm run build` in between** — the
   version `define` must not introduce per-build byte churn.
3. `npm test` (core 193; GUI ~217, allowing for the flake above),
   `npm run typecheck`, `npm run smoke:protocol` (26/26),
   `npm run smoke:discovery` (13/13),
   `node packages/mcp-server/src/smoke.mjs` (**133/133**).
4. **The before/after pair, which is the actual proof.** Spawn the installed
   `…\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs` and the repo's
   `plugins/kanmer/mcp/kanmer-mcp.cjs` against the same board with their own
   registrations' arguments, and call `get_status` on each. Expected: the old
   build **omits** the `server` block entirely (absence = pre-0.3.3), the new
   one reports `sha256`, `build: "plugin"` and `repoRootSource: "derived"`.
   Full transcript in `scratch/falsification.md`.
5. **Survives packaging:** `npm run dist`, then
   `KANMER_SERVER=apps/gui/release/win-unpacked/resources/mcp/kanmer-mcp.cjs`
   `KANMER_NODE=apps/gui/release/win-unpacked/Kanmer.exe`
   `node packages/mcp-server/src/smoke.mjs` → `build: "packaged"`, same sha as
   the committed bundle, 133/133. Already done pre-merge; worth repeating.
