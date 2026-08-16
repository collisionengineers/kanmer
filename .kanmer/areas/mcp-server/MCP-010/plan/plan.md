# Plan — MCP-010: Resolve the board when no `--root` is given

*The plan. Not the checklist — this is the **reasoning**; the checklist is the executable distillation of it.*

Written FROM `research/research.md` and `files/files.md`. Every open question is
resolved in `open-questions.md`; the answers there are binding and are not
re-opened by this plan.

## Approach

Insert a **discovery** step between `KANMER_ROOT` and the cwd fallback, and make
"no board anywhere" a **fatal** boot error rather than a silent empty board. The
resolver is a pure function, `discoverBoardRoot`, in **`packages/core/src/discover.ts`**
— pure over injected `existsSync` **and** `readdirSync` (the `.worktrees/*` step
is a glob, which `existsSync` cannot enumerate), matching the `renameWithRetry`
test seam at `io.ts:68-72`. It walks from cwd upwards; at each level it probes
`<L>/.kanmer` then `<L>/.worktrees/*/.kanmer`, **and only then** applies the
boundary — because the repo root is simultaneously the level holding `.git` and
the level holding `.worktrees/`. The hard boundary is a `.git` **directory**
only; a `.git` **file** is traversed, because that is what every git *linked
worktree* is and `kanmer-execute` puts every implementing agent inside one.
`packages/mcp-server/src/root.ts` stays thin composition and returns
`{ root, how, tried }` instead of a bare string.

Three alternatives were weighed and rejected. **Fixing only the manifests**
(MCP-011 alone) is cheapest but absolute roots do not survive another machine or
user account, and it leaves hand-registration and `.mcpb` installs broken.
**Booting degraded** — report `found: false`, throw on first write — keeps
bootstrapping with no new flags, but the operator rejected it: it preserves a
silent boot, and silence is the defect. **Putting the resolver in
`packages/mcp-server`** is where it is used, but that package has no test runner
and `FRD-022:48-49` records that absence as deliberate; core already owns
`deriveRepoRoot`, of which this is the exact inverse.

## Governing docs

**`docs/architecture/adr/ADR-0012-board-discovery-order.md` — NEW ADR** (written
in this ticket, `link_doc`'d, `docs_todo` cleared). Discovery order is a
cross-cutting decision that binds the server, both plugin manifests (MCP-011),
`get_status` (MCP-012) and `kanmer-setup`, so it earns its own ADR rather than
prose in a plan. It fixes: the five-step order and the `how` vocabulary
(§Decision 1); probe-before-boundary (2); the `.git`-directory-only boundary (3);
the `.worktrees/*` tie-break (4); board-root-not-repo-root (5); the resolver's
home and injection seams (6); explicit roots staying unvalidated (7); the
`{ root, how, tried }` shape surfaced as `rootSource` (8); fatal not-found with
the full `tried` list (9); `--init` as the sole bootstrap opt-in (10); resolution
moving inside `main()` (11). It carries a dedicated **"Corrected premise"**
section recording that the approved plan's wording — the walk "stops at a
filesystem root or a `.git` boundary", undifferentiated — is *wrong* and
superseded, not quietly fixed. Steps 1–4, 6 and 9 of this plan implement it
one-for-one.

**`docs/functional/frd/FRD-022-mcp-server-surface.md` — MODIFIED**, on the
operator's standing instruction for this run and because the doc currently
contradicts the change. It is `status: approved`, so this is a governing-doc
edit, not a comment fix. Two lines assert the retired order as verified fact:
`:8` ("root resolved `--root` → `KANMER_ROOT` → cwd") and `:26` ("Root resolution
is exactly `--root` → `KANMER_ROOT` → `cwd` `root.ts:12-19`, applied once
`index.ts:26-27`"). Both are amended to the new order and pointed at ADR-0012;
`:26`'s line references are re-verified against the changed files. **`:48-49`
("`packages/mcp-server` has **no unit tests** … which is why Phase 3 extends them
rather than adding vitest") stays true and is deliberately left alone** — the
whole reason the resolver lands in core is to keep it true. `:8`'s second clause,
"**reads never create `.kanmer/`** — only an actual write does", also stays true:
`--init` gates *whether a write may create*, it does not make a read create.
Step 8 does this.

No PRD is touched. No other doc in `refs`.

## Steps

1. **`packages/core/src/discover.ts`** — `discoverBoardRoot(startDir, io?)`,
   pure over `{ existsSync, readdirSync }` defaulting to `node:fs`. Returns
   `{ found: true, root, how, tried }` or `{ found: false, tried }`.
   - Per level `L`: probe `<L>/.kanmer` (`how: "cwd"` at the start level,
     `"ancestor"` above it); then, if `<L>/.worktrees` exists, `readdirSync` it
     and probe each `<L>/.worktrees/<child>/.kanmer` (`"cwd-worktree"` /
     `"ancestor-worktree"`), tie-breaking exact leaf `kanmer` first, else
     lexicographic — **and pushing every candidate examined into `tried`**.
   - Then, and only then, stop if `<L>/.git` is a **directory**
     (`statSync`-free: `existsSync(<L>/.git)` plus an `isDirectory` probe through
     the injected seam — see step 2 for the seam shape). Also stop at the
     filesystem root (`path.dirname(L) === L`).
   - Reuse `KANMER_DIR` and `WORKTREES_DIR` from `paths.ts`; do not re-type the
     literals.
   - `tried` records the `.worktrees/*` step as the literal glob
     `<L>\.worktrees\*\.kanmer` when the directory does not exist, and as each
     concrete candidate when it does — so the error reads like the operator's
     preview.
2. **Settle the boundary seam.** `existsSync` cannot distinguish file from
   directory, and the boundary rule is the single most load-bearing detail in
   this change. The injected shape is
   `{ existsSync, readdirSync, isDirectory }`, all three defaulting to `node:fs`
   (`isDirectory` = `(p) => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false`).
   A third seam is cheaper than the alternative — a `readdirSync(dirname)` +
   `withFileTypes` dance — and keeps every test a plain object literal.
3. **`packages/core/src/discover.test.ts`** — vitest, injected fakes, no real
   filesystem. Named cases, one per row of the decision:
   colocated board at cwd · board at `<cwd>/.worktrees/kanmer` · cwd two levels
   deep inside the repo · **cwd inside a sibling ticket worktree
   `<repo>/.worktrees/api-003/src` whose `.git` is a FILE, still reaching
   `<repo>/.worktrees/kanmer/.kanmer`** (the regression test for the corrected
   premise) · an unrelated parent board beyond a real `.git` **directory**, not
   found · probe-before-boundary at the repo root (`.git` dir *and*
   `.worktrees/` on the same level) · two `.worktrees/*` candidates, exact
   `kanmer` wins · two candidates, neither named `kanmer`, lexicographic wins ·
   no board anywhere, every probed path present in `tried` · filesystem-root
   termination.
4. **`packages/core/src/index.ts`** — one line, `export * from "./discover.js";`
   in the flat barrel.
5. **`packages/mcp-server/src/root.ts`** — `resolveProjectRoot(argv, env, cwd?)`
   returns `{ root, how, tried }`; `how` adds `"flag"`, `"env"` and `"init"`.
   `--root`/`KANMER_ROOT` short-circuit **unvalidated** (`tried: []`). Otherwise
   `discoverBoardRoot`. Not found + `--init`/`KANMER_INIT=1` → `{ root: cwd,
   how: "init", tried }`. Not found without it → throw
   `noBoardError(tried)`, whose message is exactly the operator's preview: the
   ordered `tried` list, then all three recoveries. Docstring rewritten — it
   currently calls the cwd fallback "the common case". `resolveRepoRoot` and
   `readFlag` unchanged; add `readSwitch(argv, "--init")`.
6. **`packages/mcp-server/src/index.ts`** — the widest mechanical edit.
   `projectRoot` / `repoRoot` / `store` / `rootSource` become module-level `let`
   bindings assigned at the top of `main()`, **before** `server.connect()`. Every
   handler closure already references them by name and none runs before connect,
   so no handler changes. `get_status` gains `rootSource` next to the existing
   `projectRoot` (MCP-012's field, defined here). The stderr ready-line reports
   *how* the root was found. Verify by inspection that nothing reads `store` or
   `projectRoot` at module-evaluation time; `tsc` with `strict` catches
   definite-assignment mistakes.
7. **`packages/mcp-server/src/smoke-discovery.mjs`** (new, kept out of
   `smoke.mjs` so the existing 85-check run is untouched) — three real stdio
   cases against the built server, over a `mkdtemp` fixture repo:
   (a) no `--root`, cwd = `<fixture>` containing `.worktrees/board/.kanmer` →
   `get_status.projectRoot` is that board and `rootSource` is `cwd-worktree`;
   (b) no `--root`, cwd = `<fixture>/.worktrees/tkt-001/src` with a `.git`
   **file** at the ticket worktree → the same board, `rootSource`
   `ancestor-worktree`;
   (c) no `--root`, cwd = an empty `mkdtemp` outside any repo → the process
   **exits non-zero** and stderr carries "no Kanmer board found" plus the tried
   paths. Wired into `package.json` as `smoke:discovery`. No test runner is added
   to `packages/mcp-server` — this is an `.mjs` script, exactly as
   FRD-022:48-49 prescribes.
8. **Governing docs.** ADR-0012 is already written and linked (see above); it is
   moved into the branch as part of the PR. Amend `FRD-022` `:8` and `:26`.
9. **Prose that asserts the old order** — `AGENTS.md:138`, `README.md:205`,
   `examples/codex-config.toml:16-17`. Three one-liners; they are user-facing and
   would otherwise be wrong the moment this merges.
10. **`kanmer-setup` — in scope, on the operator's explicit instruction.** Step 1
    of that skill is "`get_status` (it never creates `.kanmer/`)", and its
    greenfield path (step 6) relies on lazy `<cwd>/.kanmer` creation on first
    write. Under a fatal resolver a board-less repo can no longer be onboarded by
    a server started without `--root`. Add the opt-in to the skill: how to
    recognise the fatal message, and that onboarding a board-less repo means
    re-registering the server with `--init` (or `--root <repo>`), never
    hand-creating `.kanmer/`. Audit the GUI call path in the same step —
    `connect.ts:47` always emits `--root <boardRoot>` and explicit roots stay
    unvalidated, so **the GUI needs no change**; that is recorded as a verified
    finding, not an assumption.
11. **Rebuild the committed bundle.** `plugins/kanmer/mcp/kanmer-mcp.cjs` carries
    its own compiled `resolveProjectRoot` and is sha256-gated by
    `check-plugin-sync.mjs`. **Build at the repo root, never inside the
    worktree** — a worktree build resolves modules wrongly and produces a stale
    bundle, which is the exact defect PR #32 had to fix (MCP-007). Commit the
    rebuilt bundle in the same PR.
12. **Run the rail and write the report.**

## Verification

`proof.md` is produced on merged `main` from:

- **The before/after pair.** The BEFORE is already captured, on unmodified `main`
  (5d0e0d7), in `scratch/falsification.md`: no `--root`, cwd = repo root, server
  announces "ready", `get_status` returns `exists: false`, `boardSource:
  "default"`, all counts zero, and never mentions the 128-ticket board at
  `.worktrees\kanmer`. The AFTER is the identical invocation finding that board,
  with `rootSource: "cwd-worktree"`.
- **The not-found message**, pasted verbatim, showing every path tried and all
  three recoveries.
- `npm test` (core unit tests incl. `discover.test.ts`, plus GUI),
  `npm run typecheck`, `npm run build`, `npm run plugin:build`,
  `npm run plugin:check`, `npm run smoke:protocol`,
  `node packages/mcp-server/src/smoke.mjs`,
  `node packages/mcp-server/src/smoke-discovery.mjs`,
  `npm run verify:agents-block`, `npm run check:manual`.

## Risks / open questions

- **The `.git`-file boundary is the one that breaks everything if wrong.** It
  breaks *silently* and only for agents working inside `.worktrees/<id>` — i.e.
  not on the developer's own machine at the repo root. Mitigation: it is a named
  test (step 3, the sibling-ticket-worktree case) **and** a real-stdio case
  (step 7b), and it is written down as a corrected premise in ADR-0012 rather
  than fixed silently.
- **`index.ts` module-scope → `main()`.** ~30 closures capture `store` and
  `projectRoot`. Mitigation: keep them module-level `let` bindings so no closure
  is rewritten; assign before `server.connect()`; rely on `tsc --strict` and the
  85-check smoke run, which exercises every tool.
- **Fatal not-found is a behaviour change users will meet as a new error.**
  Mitigation: the message names all three recoveries; `kanmer-setup` is updated
  in the same ticket (step 10); GUI is verified unaffected.
- **The committed bundle.** Forgetting it fails `plugin:check`; building it in
  the worktree produces a *passing-looking* stale bundle. Mitigation: step 11 is
  its own checklist box and names the main checkout explicitly.
- **`tried` on a deep tree could get long.** Accepted: a long list is the honest
  answer, and it is the same list the provenance field carries. No truncation —
  truncating the diagnostic is how the original defect was born.
