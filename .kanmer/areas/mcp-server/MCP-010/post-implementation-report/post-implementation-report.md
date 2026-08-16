# Post-implementation report — MCP-010

*The report. Not the proof — this is the author's **claim**, written before merge; proof is **evidence**, gathered after.*

## Summary

The MCP server now **discovers** the board when it is started without `--root`,
and **refuses to start** when it cannot find one. Discovery walks up from the
working directory, probing `<L>/.kanmer` and then `<L>/.worktrees/*/.kanmer` at
each level — the layout Kanmer's own desktop app creates — and stops only at a
real `.git` **directory** or the filesystem root; a `.git` **file**, which is
what every git linked worktree has, is passed straight through. The resolver
returns `{ root, how, tried }` instead of a bare string, `get_status` surfaces
`how` as `rootSource`, and the not-found error names every path tried plus all
three recoveries. Bootstrapping a board-less repo survives behind an explicit
`--init` / `KANMER_INIT=1` opt-in, and `kanmer-setup` is updated to use it.

The outcome, on this repo, invoked exactly as both plugin manifests do (no
`--root`, cwd at the repo root): `exists: false`, `boardSource: "default"`,
**0 tickets** → `exists: true`, `boardSource: "file"`, **144 tickets**,
`rootSource: "cwd-worktree"`. Before/after in `scratch/falsification.md`.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/discover.ts` | **added** | `discoverBoardRoot(startDir, io?)`, the pure resolver, and the `RootSource` vocabulary. In core, not `mcp-server`: it is the exact inverse of `deriveRepoRoot` (already in core), and core is where a test runner exists — `FRD-022:48-49` records `mcp-server` having none as deliberate |
| `packages/core/src/discover.test.ts` | **added** | 11 cases over injected fakes, no real filesystem. Named for the decisions they pin, not for the functions they call |
| `packages/core/src/index.ts` | modified | One line in the flat barrel |
| `packages/mcp-server/src/root.ts` | modified | `resolveProjectRoot` gains the discovery step, the `--init` opt-in and the fatal throw; returns `{ root, how, tried }`. `noBoardMessage(tried)` is exported separately so the diagnostic is a value, not only a throw. Docstring rewritten — it called the cwd fallback "the common case" |
| `packages/mcp-server/src/index.ts` | modified | Root resolution moves out of module scope into `main()`; `projectRoot`/`rootSource`/`store` become module-level `let`s assigned before `server.connect()`, so no handler closure changes. `get_status` gains `rootSource`; the stderr ready-line reports provenance; `main().catch` prints a resolution failure as its message rather than a stack |
| `packages/mcp-server/src/smoke-discovery.mjs` | **added** | Four real-stdio cases with no `--root`. A separate script, not an extension of `smoke.mjs`, because those 120 checks share one `--root` sandbox and one client while this one needs a different cwd per case and a process expected to die |
| `package.json` | modified | `smoke:discovery` script |
| `docs/architecture/adr/ADR-0012-board-discovery-order.md` | **added** | The decision (see below) |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | modified | `:8` and `:26` asserted the retired order as fact; `:48-49`'s "**two** `.mjs` smoke scripts" would have become false |
| `AGENTS.md`, `README.md`, `examples/codex-config.toml` | modified | The same three-step order in prose, user-facing |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | modified | Reads `rootSource` at orientation; recognises the boot failure; onboards a board-less repo via the `--init` opt-in instead of lazy creation |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | modified (build artifact) | Committed, sha256-gated bundle carrying its own compiled `resolveProjectRoot` |

## Governing docs

**`docs/architecture/adr/ADR-0012-board-discovery-order.md` — NEW ADR**, written
in this ticket and linked (`docs_todo` cleared). Its eleven numbered decisions
map one-for-one onto the diff: the order and `how` vocabulary (1) → `root.ts` +
`discover.ts`; probe-before-boundary (2) → the loop body in `discoverBoardRoot`,
with a dedicated test; the `.git`-**directory**-only boundary (3) → the
`isDirectory` seam and two tests; the `.worktrees/*` tie-break (4) →
`orderCandidates`; board-root-not-repo-root (5) → the resolver returns the
candidate, not its grandparent, so `deriveRepoRoot` keeps working; resolver home
and seams (6) → `packages/core/src/discover.ts`; explicit roots unvalidated (7)
→ the two short-circuits with `tried: []`; `{ root, how, tried }` as `rootSource`
(8) → `get_status`; fatal not-found with the full list (9) → `noBoardMessage`;
`--init` (10) → `readSwitch` + `KANMER_INIT`; resolution inside `main()` (11) →
the `let` bindings and `resolveRoot()`.

It carries a **"Corrected premise"** section, as required rather than as
decoration: the approved plan said the walk "stops at a filesystem root or a
`.git` boundary", undifferentiated. That wording is **wrong** — a linked
worktree's `.git` is a 66-byte file, `kanmer-execute` puts every implementing
agent inside one, and the rule as written would have broken discovery for
exactly the layout this ticket exists to serve. It is recorded as a correction
rather than quietly fixed.

**`docs/functional/frd/FRD-022-mcp-server-surface.md` — MODIFIED**, with
authorization for this run, and necessary: it is `status: approved` and two of
its lines assert the retired order as *verified fact*. `:8` and `:26` are
amended and pointed at ADR-0012; `:26` additionally records that resolution now
happens inside `main()`. Its "reads never create `.kanmer/`" claim is preserved
and re-verified — `--init` governs whether a *write* may create a board, not
whether a read does, and `smoke-discovery.mjs` case (d) asserts exactly that
(`exists: false` after booting with `--init`). `:48-49`'s no-vitest decision is
**kept**, which is the whole reason the resolver went to core; only its stale
count of smoke scripts changed.

No PRD touched. No other `refs` entry affected.

## Risks / follow-ups

- **The `.git` file-vs-directory rule is the one that breaks silently.** It
  breaks only for agents working inside `.worktrees/<id>` — never on a
  developer's own machine at the repo root, which is why it would have shipped.
  Covered twice: `discover.test.ts` ("traverses a .git FILE…") and
  `smoke-discovery.mjs` case (b), against a real `gitdir:` file on disk.
- **Fatal not-found is a user-visible behaviour change.** Anyone who was
  silently running against an empty board now gets an error instead. That is the
  intent, and the message names all three ways out. The GUI is unaffected:
  `connect.ts:47` always emits `--root <boardRoot>`, and explicit roots stay
  unvalidated by design.
- **`--init` adds a seventh value to a vocabulary MCP-012 consumes.** The six
  settled values keep their exact meanings; `init` is an addition, not a rename,
  and it exists because reporting `cwd` for "nothing was found" would be the
  same class of plausible-wrong-answer this ticket removes. **MCP-012 must
  report `init` alongside the other six.**
- **The bundle build deviated from instruction**, unavoidably — see the
  course-correction note in the checklist. The main checkout is concurrently
  owned by other agents and could not be held on this branch; it was switched
  off the branch mid-build and advanced two commits. The worktree was given its
  own `node_modules` instead, and the result verified with the two tells
  AGENTS.md names (bundle contains `discoverBoardRoot`; 513/513 embedded paths
  read `../../node_modules`, zero read `../../../../node_modules`).
  **A reviewer should re-run `npm run plugin:check` at the repo root after
  merge** — that is the only place the check is authoritative, and it is listed
  in the verification hand-off below. [[MCP-007]] is the ticket that makes this
  guard mechanical instead of procedural.
- **[[MCP-011]] is unblocked** and should land next: the manifests can now drop
  any notion of carrying `--root`, against a resolver that works.
- Parked, with reasons, in `open-questions.md`: GUI reuse of the resolver;
  `--root <repo>` auto-redirect; walk cost on UNC paths.

## Verification hand-off

On merged `main`, at the repo root:

1. `npm run build && npm run plugin:check` — **the authoritative bundle check.**
   Expect `plugin-sync OK — 29 tools match, bundle bytes match`.
2. `npm test` — expect all green, including `src/discover.test.ts (11 tests)`.
3. `npm run typecheck`, `npm run smoke:protocol` (26/26),
   `npm run verify:agents-block` (26/26), `npm run check:manual`
   (`up to date (12 chapters)`), `node packages/mcp-server/src/smoke.mjs`
   (120/120).
4. `npm run smoke:discovery` — expect **13/13**.
5. **The after-half of the falsification pair**, which is the ticket's actual
   claim: run the built server with **no `--root`** and cwd at the repo root,
   then call `get_status`. Expect
   `projectRoot: …\.worktrees\kanmer`, `rootSource: "cwd-worktree"`,
   `exists: true`, `boardSource: "file"`, and a non-zero ticket count — against
   the BEFORE in `scratch/falsification.md`, which shows the same invocation
   returning an empty default board.
6. **The not-found message**, in a board-less temp directory with no `--root`:
   expect exit code 1 and every probed path listed, then the three recoveries.

No UI work; no screenshots.
