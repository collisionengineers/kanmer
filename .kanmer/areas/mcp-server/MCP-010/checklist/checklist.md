# Checklist — MCP-010

*The checklist. Not the plan — every line is **independently tickable**; the reasoning lives in the plan.*

- [x] **Falsification (BEFORE) captured** on unmodified `main` — no `--root`,
      cwd = repo root, `get_status` finds no board. Recorded in
      `scratch/falsification.md`. *(Done during planning, while `main` was still
      pristine.)*
- [ ] `packages/core/src/discover.ts` — `discoverBoardRoot(startDir, io?)` over
      injected `{ existsSync, readdirSync, isDirectory }`, returning
      `{ found, root?, how?, tried }`; reuses `KANMER_DIR` / `WORKTREES_DIR`
- [ ] Probe order inside each level: `<L>/.kanmer`, then
      `<L>/.worktrees/*/.kanmer` with exact-leaf-`kanmer` then lexicographic
      tie-break, every candidate pushed to `tried`
- [ ] Boundary applied **after** the level is probed: stop on a `.git`
      **directory** (a `.git` file is traversed) and at the filesystem root
- [ ] `packages/core/src/discover.test.ts` — ten named cases incl. the
      sibling-ticket-worktree `.git`-file regression, the unrelated parent board
      beyond a real `.git` directory, probe-before-boundary at the repo root,
      both tie-breaks, and not-found listing every tried path
- [ ] `packages/core/src/index.ts` — `export * from "./discover.js";`
- [ ] `packages/mcp-server/src/root.ts` — `resolveProjectRoot` returns
      `{ root, how, tried }`; `--root`/`KANMER_ROOT` short-circuit unvalidated;
      `--init`/`KANMER_INIT=1` opt-in; not-found throws the operator's message
      verbatim (tried list + all three recoveries); docstring rewritten
- [ ] `packages/mcp-server/src/index.ts` — resolution moves inside `main()`
      (module-level `let`, assigned before `server.connect`); `get_status` gains
      `rootSource`; the stderr ready-line reports how the root was found
- [ ] `packages/mcp-server/src/smoke-discovery.mjs` — three real-stdio cases
      (worktree board from repo root; board from inside a ticket worktree; fatal
      not-found exits non-zero with the tried list), wired as
      `npm run smoke:discovery`. **No vitest added to `packages/mcp-server`**
- [ ] `docs/architecture/adr/ADR-0012-board-discovery-order.md` in the branch,
      incl. its "Corrected premise" section on the `.git`-file rule *(authored
      and `link_doc`'d during planning; `docs_todo` cleared)*
- [ ] `docs/functional/frd/FRD-022-mcp-server-surface.md` — amend `:8` and `:26`
      to the new order and point at ADR-0012; leave `:48-49` untouched
- [ ] Prose that asserts the old order: `AGENTS.md:138`, `README.md:205`,
      `examples/codex-config.toml:16-17`
- [ ] `kanmer-setup` skill — the `--init` opt-in for onboarding a board-less
      repo; GUI call path audited (`connect.ts:47` always passes `--root`, so no
      GUI change) and the finding recorded
- [ ] Rebuild and commit `plugins/kanmer/mcp/kanmer-mcp.cjs` — **built at the
      repo root, not in the worktree** (MCP-007 / PR #32)
- [ ] Verification run (this box produces proof.md): `npm test`,
      `npm run typecheck`, `npm run plugin:check`, `npm run smoke:protocol`,
      `npm run verify:agents-block`, `npm run check:manual`, both smoke scripts,
      and the AFTER half of the falsification pair

## Progress notes

(append with `set_ticket_doc(doc: "checklist", append: true)`)

---

**2026-08-16 — implementation**

- `discover.ts` + `discover.test.ts` landed; 11 tests, all green, all injected —
  no real filesystem. `DiscoverIO` ended up with **three** seams, not two:
  `existsSync`, `readdirSync` and `isDirectory`. `existsSync` cannot tell a
  `.git` file from a `.git` directory, and that distinction is the whole
  boundary rule, so it needs its own fakeable call rather than a `statSync`
  buried in the resolver. Plan step 2 anticipated this.
- `root.ts` exports `noBoardMessage(tried)` separately from
  `resolveProjectRoot`, so the message is a testable value and not only a throw.
- `main().catch` now prints a resolution failure as its **message**, not its
  stack: the whole point is that the tried paths are the first thing read, and a
  stack trace above them buries them. Every other fatal still prints a stack.
- `smoke-discovery.mjs` grew a fourth case beyond the three planned: `--init`
  boots at cwd, reports `rootSource: "init"`, and still does **not** create
  `.kanmer` merely by booting. That last assertion is the one that keeps
  FRD-022's "reads never create `.kanmer/`" honest under the new flag.
- FRD-022:48-49 was **not** left completely alone after all. Its wording — "the
  **two** `.mjs` smoke scripts are its entire automated coverage" — becomes
  false the moment a third is added. Amended to keep the *decision* (no vitest
  in `mcp-server`) intact while the *count* stays true, and to say explicitly
  that the resolver's unit tests live in core so the decision did not have to be
  overturned. Leaving it would have swapped one stale sentence for another.

**Course correction — the bundle build could not be done as instructed.**

The plan (and AGENTS.md §8 gotcha 8) says: build the committed bundle at the
repo root, never inside a worktree, because a worktree has no `node_modules` and
`@kanmer/core` resolves *up* to the main checkout. Confirmed here before doing
anything: `require.resolve("@kanmer/core")` from the fresh worktree pointed at
`C:\…\kanmer\node_modules\@kanmer\core`, i.e. main's core. The trap is real.

The prescribed fix — check the branch out in the main checkout and build there —
turned out to be **unavailable**: other agents are working this repo
concurrently and own the main checkout. Mid-run it was switched off my branch
back to `main` and advanced two commits (#37, #38); `git worktree list` shows
three other live ticket worktrees. Holding the main checkout on this branch
would break them.

Taken instead: `npm install` **inside** the worktree, which removes the root
cause rather than working around its location — the worktree gets its own
`node_modules`, so `@kanmer/core` resolves to the worktree's own core and the
relative path structure tsup embeds is identical to a root build's. Verified
rather than assumed, with the two tells AGENTS.md itself names:
the built bundle **contains** the new resolver, and its embedded paths read
`../../node_modules`, not `../../../../node_modules`. Both recorded in the
post-implementation report. This is a deviation from an explicit instruction and
is written down as one.
