# Plan — MCP-012: Make server identity visible in get_status

Written from `research` and `files`, with both open questions answered by the
operator (`scratch/operator-answers.md`) and the scheduler
(`scratch/scheduling.md`). MCP-010 has merged as `741ef81`; this ticket is its
consumer.

## Approach

Ship **two independent identity signals**, because neither substitutes for the
other. A **build-time injected version** (esbuild `define`, read from the root
`package.json`) answers *"which release"* in a form a human reads; a **runtime
self-sha256 of the running script**, plus its resolved path, mtime and size,
answers *"which file, actually"* — and that is the one that reproduces the
measured `e92a2679` vs `96fe9f8a` divergence, because it needs no cooperation
from the build at all. Alongside them go the two root facts an agent needs in
the same breath: `rootSource` (already shipped by MCP-010 — **reported as-is,
not renamed**) and `repoRoot`, which is what governing-doc `refs` resolve
against and is invisible today.

The rejected alternative was a git sha or build timestamp in the stamp. Both
are fatal: `check-plugin-sync.mjs:57-76` compares the committed bundle
byte-for-byte with a fresh build, so a timestamp breaks it every build and an
embedded sha breaks it every commit (the bundle is committed, so the baked sha
is always the parent's). The version define is the one intentional source of
byte churn and it moves **once per release**. Everything non-deterministic is
observed at runtime from the file instead of baked into it.

The operator authorised the consequence: `scripts/release.mjs` must rebuild the
bundle inside the release commit, or v0.3.3 would ship a bundle reporting
0.3.2 and leave `plugin:check` failing. **That file, not the `get_status` diff,
is this ticket's real risk.**

### Shape

`get_status` gains one nested block and one sibling field. `projectRoot` and
`rootSource` keep their exact top-level names and positions from MCP-010.

```jsonc
{
  "projectRoot": "…\\.worktrees\\kanmer",
  "repoRoot":    "…\\kanmer",        // NEW — what refs resolve against
  "rootSource":  "flag",             // MCP-010, unchanged
  "repoRootSource": "flag",          // NEW — flag | env | derived
  "server": {                        // NEW — absence means pre-0.3.3
    "version": "0.3.2",
    "path": "…\\resources\\mcp\\kanmer-mcp.cjs",
    "sha256": "e92a2679…",  "sha256Short": "e92a2679",
    "mtime": "2026-08-16T15:14:14.000Z", "size": 1465172,
    "build": "packaged"              // packaged|plugin|dev-standalone|dev-esm|unknown
  },
  …existing fields unchanged…
}
```

Placement note, so review can object rather than discover it: `repoRoot` sits
top-level beside `projectRoot`/`rootSource` rather than inside `server{}`,
because it is a *root*, not a property of the binary, and `rootSource` is fixed
top-level by MCP-010 — splitting the two roots across two nesting levels would
be worse than either. The contiguous head `projectRoot / repoRoot / rootSource
/ repoRootSource / server{}` **is** the identity block.

`repoRootSource` is a small honest addition, not a new question: the measured
divergence is precisely that codex passes `--repo-root` and `.mcp.json` does
not, so naming *how* the repo root was reached is the same fact `rootSource`
gives for the board root. Symmetric, one line, no new inputs.

No second `format` field: `get_status.format` already means the **store**
format, and a module-format field of the same name would be actively
confusing. Module format is implied by `build`.

### The seven `how` values

`rootSource` is `RootSource` from `@kanmer/core` — read off merged main
(`packages/core/src/discover.ts:14-22`), it is **seven** values, not six:
`flag | env | cwd | cwd-worktree | ancestor | ancestor-worktree | init`.
`init` was added by MCP-010 deliberately (nothing was found and `--init` /
`KANMER_INIT=1` permitted creating a board at cwd; reporting `cwd` there would
be a lie). MCP-012 reports the type as-is — it does not re-declare the union,
so it cannot drift from it.

### `__filename`, and why the standalone config is left alone

Neither tsup config sets `shims`. The CJS standalone bundle has `__filename`
**natively** — no shim needed — so the byte-compared config gains only the
`define`. The ESM dev build (`dist/index.js`) has no `__filename`, so
`shims: true` goes on `tsup.config.ts` **only**, where tsup injects the
`fileURLToPath(import.meta.url)` shim. `import.meta` is never written in
source, so nothing has to be shimmed in the CJS direction. `@types/node`
declares `__filename` globally, so `tsc --noEmit` is satisfied without a cast.

The version constant is read defensively —
`typeof __KANMER_VERSION__ === "string" ? … : "0.0.0-dev"` — so an unbuilt or
un-defined context (vitest, `tsx`) degrades to a marker instead of throwing.
`typeof` on an undeclared identifier is legal JS; with the define applied
esbuild folds the whole expression to the literal.

## Governing docs

`refs`: `docs/functional/frd/FRD-022-mcp-server-surface.md`.

- **Meets R5** (*"`list_board`/`get_status` surface … everything a skill needs
  without bespoke calls"*). Server identity and the repo root are exactly that:
  an agent currently cannot answer "which server" or "which `refs` base" from
  inside a session at all, so it is the same gap R5 names, one field-set wider.
- **Meets R6** (the release rail: tool-reference rows match names, the bundled
  `kanmer-mcp.cjs` is byte-current, `smoke.mjs` exercises the surface over real
  stdio). Kept green deliberately, and *strengthened*: the rebuilt bundle is
  committed with the source, and the new smoke assertions hash the spawned file
  in-test rather than checking `typeof === "string"`.
- **Modifies FRD-022, authorised.** R5's sentence is extended to include server
  identity and root provenance, and R6 gains the release-rail step the operator
  approved (the release commit now carries the bump **and** the artifacts
  derived from it). `FRD-022:48-49`'s smoke-script count was already corrected
  by MCP-010 — **do not re-amend that line**; only the counts this ticket
  actually changes get touched.
- **No new ADR.** ADR-0012 already owns root resolution and its `RootSource`
  vocabulary; this reports that vocabulary rather than deciding anything about
  it. The one genuine design decision — the stamp must be a pure function of
  the source tree — is a constraint imposed *by* the existing rail
  (`check-plugin-sync.mjs`), not a new architectural choice, and it is recorded
  in prose at both `release.mjs` and `check-plugin-sync.mjs`.

## Steps

1. **Falsify first** (done before any code): re-measure both bundles' sha256 /
   size / mtime / `grep -c questions-resolved`, then spawn both over real stdio
   with their own registrations' arguments and capture `get_status` from each.
   Recorded in `scratch/falsification.md`. **Result: byte-identical output from
   two provably different binaries** — the defect, demonstrated.
2. **New `packages/mcp-server/src/identity.ts`.** Resolve `__filename`; lazily
   sha256 the file and cache for the process lifetime; stat for mtime/size;
   classify `build` from the path (`…/resources/mcp/kanmer-mcp.cjs` → packaged;
   any other `…/mcp/kanmer-mcp.cjs` → plugin; `…/dist/standalone/…` →
   dev-standalone; `…/dist/index.js` → dev-esm; else unknown); expose the
   injected version. **Every failure yields `null`, never a throw.**
3. **Inject the version.** `define: { __KANMER_VERSION__: JSON.stringify(v) }`
   in both tsup configs, `v` read from the root `package.json` relative to each
   config's own `import.meta.url`. Add `shims: true` to `tsup.config.ts` only.
4. **Wire `get_status`** (`index.ts`): add `repoRoot` (from
   `store.paths.repoRoot` — the *effective* one), `repoRootSource`, and the
   `server` block. Capture `repoRootSource` in `resolveRoot()` where
   `resolveRepoRoot`'s flag/env/undefined outcome is actually known.
5. **Switch `new McpServer({ version: "0.1.0" })`** (`index.ts:232`) to the
   injected version — it is stale by two minor versions and is the same fact.
6. **Tool description**: say what the block means and that its **absence** is
   the signal "server older than 0.3.3". Detection is one-sided by
   construction; do not try to make old binaries talk.
7. **`smoke.mjs` assertions**: `server` exists; `server.path` is the file the
   test actually spawned; `server.sha256` equals a `node:crypto` hash of that
   file computed in the test; `build` is one of the five; `repoRoot` present;
   `rootSource === "flag"` (smoke passes `--root`). This is the regression
   test — mcp-server has no vitest suite.
8. **`scripts/release.mjs` — the HIGH-risk edit.** Insert `npm run build` and
   `node scripts/build-plugin.mjs` after the version bump and before the pack.
   Rewrite (**not delete**) the comment at `151-152` that argues the other way,
   and widen the rule text at `115` in prose. Update the `--dry-run` printout
   too, or the dry run misdescribes what a real release does.
9. **Rebuild and commit the bundle.** `npm run plugin:build` at the **repo
   root**, not in the worktree — a worktree build resolves `@kanmer/core` to the
   wrong copy and ships a stale bundle (`9658d08`). If the shared checkout is
   contended, use MCP-010's workaround: `npm install` inside the worktree so
   `@kanmer/core` resolves to the branch's own core, verified with
   `realpathSync`, and settle `plugin:check` in a clean detached checkout.
10. **Docs**: `tool-reference.md`'s `get_status` row, `AGENTS.md` §7, FRD-022
    R5/R6. Only tool *names* are machine-checked, so this prose is unprotected
    and must be done by hand.
11. **Rebase on `origin/main`** before the PR (**[[GUI-066]] also edits
    `release.mjs`**), re-run the rail after, and state exactly what changed in
    that file and where.

## Verification

- **The before/after pair is the proof.** Re-run step 1's two spawns against
  the rebuilt bundle: the same two commands that returned identical JSON must
  now name each build distinctly — different `sha256`, different `path`,
  different `build`, and different `repoRoot`/`repoRootSource` for the
  `--repo-root` split.
- **Survives packaging**: `npm run dist`, then drive `smoke.mjs` at
  `apps/gui/release/win-unpacked/resources/mcp/kanmer-mcp.cjs` via
  `KANMER_SERVER`/`KANMER_NODE` — it must report `build: "packaged"` and the
  unpacked file's real hash. No published release needed.
- **Determinism**: `npm run plugin:check` green **twice**, with a rebuild in
  between, at an unchanged version — proving the define did not introduce byte
  churn per build.
- Rail: `npm test`, `npm run typecheck`, `npm run plugin:check`,
  `npm run smoke:protocol`, plus `smoke.mjs` and `smoke:discovery`
  (MCP-010's, must stay green untouched).

## Risks / open questions

- **`scripts/release.mjs` is the HIGH-risk file.** A mistake ships a
  mis-stamped release or leaves `plugin:check` red on main. Mitigation: the
  edit is additive and ordered (bump → rebuild → pack → commit), `git commit
  -am` already stages the tracked bundle, and `--dry-run` is updated so the
  rehearsal tells the truth. Verified by reasoning through the *next* release's
  gate: build at 0.3.3 vs a committed bundle built at 0.3.3 → match.
- **[[GUI-066]] is in flight on the same file.** Mitigation: `git fetch && git
  rebase origin/main` immediately before the PR, re-run the rail after, and
  report the exact hunks.
- **Contended main checkout.** Other agents switch branches in it; MCP-010's
  bundle build failed mid-way for exactly this. Mitigation: its proven
  workaround, above.
- **Result-shape change on the most-called tool.** Mitigation: purely additive,
  no existing field renamed or moved, `null` on any failure, and the handler
  must never throw — `get_status` is the orientation call.
- **Both open questions are closed** (operator: yes to the release-rail change;
  scheduler: MCP-010 first, then MCP-012, then CORE-023). **Not re-opened.**
- **[[CORE-023]] is queued behind this on the same `get_status` handler** and
  must be told when this merges.
