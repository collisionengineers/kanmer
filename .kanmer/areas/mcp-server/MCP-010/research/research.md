# Research — MCP-010: Resolve the board when no `--root` is given

*The research. Not the files document — this is what I **learned**, not what will be **touched**.*

## Question

Where must board discovery live, what exactly must it search, and what does the
current code do that will break when a discovery step is inserted between
`KANMER_ROOT` and `process.cwd()`?

## Findings

### The current resolution chain, confirmed in code

- `resolveProjectRoot` (`packages/mcp-server/src/root.ts:12-17`) is exactly
  `--root` → `KANMER_ROOT` → `process.cwd()`, and returns a bare `string` with no
  provenance. `readFlag` (`root.ts:35-42`) supports both `--root <p>` and
  `--root=<p>` and `path.resolve`s the result.
  - Its docstring calls the cwd fallback "the common case" because codex
    project-config points cwd at the right folder (ADR-0007). That reasoning
    never covered a board on its own branch.
- `resolvePaths` (`packages/core/src/paths.ts:47-66`) unconditionally joins
  `<root>/.kanmer`. Nothing validates that it exists.
- `store.exists()` (`packages/core/src/store.ts:219-221`) is a plain
  `pathExists(paths.kanmer)` — it *reports* absence, it never *reacts* to it.
  That is why a mis-rooted server looks perfectly healthy: `get_status` returns
  `exists: false` alongside a synthesized default board, and every other read
  returns an empty-but-successful answer.
- `deriveRepoRoot` (`paths.ts:31-37`) maps board → repo, keyed only on the
  board's parent folder being named `.worktrees`. A repo-wide grep for
  `resolveProjectRoot|resolveRepoRoot` returns four source hits (root.ts,
  index.ts, and the compiled copies inside the committed bundle) — **there is no
  repo → board inverse anywhere in the codebase.**

### What the layout actually looks like

- `ensureBoardWorktree` (`apps/gui/src/main/kanmerGit.ts:113-166`) creates the
  board at `join(repoRoot, ".worktrees", "kanmer")` — `WORKTREES_DIR` is the
  exported constant `.worktrees` (`paths.ts:17`); the leaf name `"kanmer"` is a
  string literal in that function.
  - But `kanmerGit.ts:119-122` first parses `git worktree list --porcelain` and
    **adopts whatever path is already checked out on the board branch**, at any
    location. So `.worktrees/kanmer` is a strong convention, not an invariant.
    A `.worktrees/*` glob is therefore the right probe, and it needs a
    deterministic tie-break when more than one child matches.
- Measured on this repo: `git worktree list` shows
  `C:/…/kanmer` (main) and `C:/…/kanmer/.worktrees/kanmer` (kanmer-board), and
  there is **no `<repo>/.kanmer`** — the cwd fallback finds nothing in the
  product's own default layout.

### The `.git` boundary is the crux, and the obvious rule is wrong

- Verified on disk: `.worktrees/kanmer/.git` is a **66-byte file**, not a
  directory, containing `gitdir: C:/…/.git/worktrees/kanmer`. Every git *linked
  worktree* is like this.
- `kanmer-execute` (`plugins/kanmer/skills/kanmer-execute/SKILL.md:37-54`)
  instructs every implementing agent to `git worktree add .worktrees/<id>` and
  `cd` into it. `kanmer-auto` (`SKILL.md:82`) and `kanmer-closeout`
  (`SKILL.md:49`) assume the same layout.
- Therefore: a boundary rule of "stop where `.git` exists" halts the ancestor
  walk at `<repo>/.worktrees/<ticket-id>`, never reaches `<repo>`, and never
  finds `<repo>/.worktrees/kanmer/.kanmer` — **breaking discovery for exactly
  the agents that need it most.**
- Fix that also matches git's own semantics: the hard boundary is a `.git`
  **directory** only; a `.git` **file** means "this is a worktree of a repo
  elsewhere" and the walk passes through it. The ticket's "unrelated parent
  board beyond a `.git` boundary" case still holds, because an unrelated nested
  repo has a real `.git` directory.
- Second ordering consequence: each level must be **probed before** the boundary
  is applied. The repo root is simultaneously the level that holds `.git` and
  the level that holds `.worktrees/`.

### Injection style, and where the resolver can actually be tested

- The style the ticket asks for is `renameWithRetry` (`packages/core/src/io.ts:68-72`):
  the function takes `rename = fs.rename` as a default parameter, documented as
  "purely as a test seam".
- **`packages/mcp-server` has no test runner at all**: no `test` script
  (`package.json:11-17`), no `vitest` devDependency, no `*.test.ts` file, and no
  `vitest.config.*` anywhere in the repo (tests are colocated and discovered by
  vitest's defaults). Root `npm test` runs only `-w @kanmer/core` and
  `-w @kanmer/gui` (`package.json:15`).
- `FRD-022:48-49` records this as a **deliberate decision**: "`packages/mcp-server`
  has **no unit tests** — the two `.mjs` smoke scripts are its entire automated
  coverage, which is why Phase 3 extends them rather than adding vitest."
- So the ticket's "unit tests over fixture trees with an injected `existsSync`"
  cannot be satisfied inside `mcp-server` without overturning that decision.
  `@kanmer/core` already has vitest, already owns `deriveRepoRoot`, and its
  `index.ts` is a flat `export *` barrel — a new `discover.ts` there is the
  cheap route. `paths.ts` has no test file today, so a *new* module avoids
  retrofitting one onto it.
- `existsSync` alone cannot enumerate `.worktrees/*`. A directory listing is
  needed, so the seam is two functions (`existsSync`, `readdirSync`), both
  defaulting to `node:fs`.

### Two behaviours that a naive "throw when not found" would break

- **A throw at import time is nearly invisible.** `index.ts:33-35` resolves the
  root at module top level, *before* `main()`. A throw there never reaches
  `main().catch` (`index.ts:1104-1107`), so the host reports only "server failed
  to start" and the carefully-worded diagnostic is lost. Since making the
  failure loud is the entire point, resolution must move inside `main()` (or be
  deferred), where the existing fatal handler writes to stderr — the only legal
  log channel, because stdout is the transport (`index.ts:1100`).
- **Bootstrapping a brand-new project goes away.** Today `write()` →
  `ensureInit()` → `store.init()` (`index.ts:58-74`) lazily creates
  `<cwd>/.kanmer` on the first write. That is how `kanmer-setup` onboards a repo
  with no board. If "found nothing" is fatal at boot, an agent can never
  initialise a new project without `--root`. This is a real trade-off, not an
  edge case — see open questions.

### What must stay unvalidated

- Explicit `--root` / `KANMER_ROOT` are assertions, not questions, and must
  remain authoritative without an existence check: `npm run inspect` passes
  `--root ./sandbox` (`package.json:27`) and `smoke.mjs` passes `--root <mkdtemp>`
  (`smoke.mjs:13,31`) — both point at directories with no `.kanmer` on purpose.

### Downstream consumers of the resolved root

- `new KanmerStore(projectRoot, { repoRoot })` (`index.ts:35`) and
  `watchKanmer(projectRoot, …)` (`index.ts:1013`) both ride on the same value, so
  discovery redirects the resource-subscription watcher automatically.
- `deriveRepoRoot` (`paths.ts:54`) already produces the right `repoRoot` for a
  discovered `.worktrees/<x>` board, so governing-doc `refs` keep resolving
  against `<repo>/docs/` with no extra work — **provided discovery returns the
  board root (`…/.worktrees/kanmer`), not the repo root.**
- `get_status` (`index.ts:240-255`) returns the closed-over `projectRoot` string.
  [[MCP-012]] wants "which board" and "which server" in one answer, so the
  resolver's return shape should be `{ root, how, tried }`, not a string.
- The Claude Desktop `.mcpb` case ([[MCP-008]]) gets **no help** from discovery —
  its cwd is the host's, unrelated to any repo. There the not-found error message
  *is* the deliverable.

### The documented contract that this change contradicts

Five places assert the current three-step order as fact and will be stale:
`FRD-022:8` and `FRD-022:26` (an **approved** doc), `AGENTS.md:138`,
`README.md:205`, `examples/codex-config.toml:16-17`, plus `root.ts`'s own
docstring.

### The ship rail

`plugins/kanmer/mcp/kanmer-mcp.cjs` is a **committed** build artifact (`git ls-files`
confirms; `dist/` is gitignored per `.gitignore:2`) carrying its own compiled copy
of `resolveProjectRoot` (`kanmer-mcp.cjs:40491`). `scripts/check-plugin-sync.mjs:59-76`
sha256-compares it against a fresh `dist/standalone` build. Any change here needs
`npm run build && npm run plugin:build` in the same commit or `npm run plugin:check`
fails. (Related hazard: [[MCP-007]] — a bundle built inside a worktree.)

## Implications

1. **Put `discoverBoardRoot` in `@kanmer/core`, not in `mcp-server`.** It gets
   unit tests without overturning FRD-022's documented no-vitest stance, it sits
   next to `deriveRepoRoot` whose inverse it is, and it becomes reusable by the
   GUI and by [[MCP-011]]. `root.ts` stays the thin composition layer.
2. **The boundary rule must be "`.git` directory", not "`.git` exists".** Get this
   wrong and discovery fails for every `kanmer-execute` agent. This is the single
   most important thing the plan must encode, and it deserves a named test.
3. **Probe each level, then apply the boundary** — never the reverse.
4. **Resolution must happen inside `main()`**, so a not-found throw reaches the
   fatal handler and is actually printed.
5. **Return provenance, not a string.** `{ root, how, tried }` serves both the
   error message (`tried` is the list to name) and [[MCP-012]] (`how`).
6. **Two injected seams**, `existsSync` and `readdirSync`, defaulting to
   `node:fs`, matching `io.ts:68-72`.
7. **The ADR is not optional paperwork** — FRD-022 currently states the old order
   as verified fact in an approved document. The ADR (next free number:
   **ADR-0012**) sets the order and the boundary rule; FRD-022 is amended to
   point at it.
8. **The bundle rebuild is part of the change**, not a follow-up.

## Open questions

See `open-questions.md`. One of them (fatal-vs-degraded on not-found) is an
operator decision and is flagged there as such.
