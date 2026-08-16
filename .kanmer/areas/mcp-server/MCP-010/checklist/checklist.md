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
