## Review — PR #40, MCP-010 — 2026-08-16

**I am both the author and the reviewer of this change. This is not an
independent review and should not be read as one.** What it is: a second pass
over my own diff against the ticket's own documents, with the disagreements
recorded rather than resolved in my head.

Reviewed at `b358d1b`, base `43dcedb`, `mergeStateStatus: CLEAN`.

### 1. Changes — what the diff actually does

14 files. Read in the order the change has to be believed in:

- **`packages/core/src/discover.ts` (new, ~130 lines).** One exported function
  plus two module-private helpers. The loop is: push `<L>/.kanmer` to `tried`
  and test it; if `<L>/.worktrees` exists, order its children and test each
  `<child>/.kanmer`, pushing every one; if it does not exist, push the literal
  glob so the diagnostic shows what was *looked for*; then, and only then, the
  boundary — `existsSync(<L>/.git) && isDirectory(<L>/.git)` — then ascend, with
  `path.dirname(L) === L` as the floor. `first` flips after the first iteration
  and is the only thing separating `cwd*` from `ancestor*` in the reported `how`.
- **`discover.test.ts` (new).** 11 cases over a fake IO built from two path sets,
  `dirs` and `files`. No temp directories, no cleanup, no platform branches.
- **`root.ts`.** Rewritten docstring, discovery step, `--init`, and
  `noBoardMessage` exported separately from the throw.
- **`index.ts`.** Three `const`s become three `let`s plus a `resolveRoot()`
  called as the first statement of `main()`; `get_status` gains `rootSource`;
  the ready-line and the fatal handler change.
- **`smoke-discovery.mjs` (new)**, `package.json` (one script), ADR-0012 (new),
  FRD-022, AGENTS.md, README.md, `examples/codex-config.toml`, kanmer-setup
  SKILL.md, and the rebuilt `kanmer-mcp.cjs`.

The report's Changes table lists all 14 with rationales, and `gh pr diff
--name-only` returns exactly those 14. No smuggled extras.

### 2. Comments

**C1 — `main().catch` sniffs the error by message prefix. (non-blocking)**
`message.startsWith("no Kanmer board found")` decides whether to print the
message or the stack. A string sniff is a weak join, and if `noBoardMessage`'s
first words are ever reworded the handler silently reverts to stacks. A
`class NoBoardError extends Error` would be exact.

**C2 — `let projectRoot!: string` defeats the compiler's one real guard here.
(non-blocking)** The definite-assignment assertions mean a handler that somehow
ran before `resolveRoot()` would read `undefined` with no type error and no
runtime error until something dereferenced it. The property that makes this safe
is temporal, not typed: no handler can run before `server.connect()`, and
`resolveRoot()` is the first statement of `main()`.

**C3 — `readSwitch` accepts only the bare `--init`. (non-blocking)**
`--init=true` and `--init true` are not recognised; `--root` supports both forms.
Asymmetric.

**C4 — `KANMER_INIT === "1"` is exact-match. (non-blocking)** `KANMER_INIT=true`
does nothing, silently.

**C5 — `root.ts` itself is still untested. (non-blocking, deliberate)** The
composition layer — flag precedence, the `--init` branch, the message shape —
has no unit test, because `packages/mcp-server` has no runner and FRD-022:48-49
says it deliberately does not. It is covered end-to-end instead, by
`smoke-discovery.mjs` cases (c) and (d).

**C6 — the `.worktrees/*` glob line is pushed only when `.worktrees` is absent.
(non-blocking, intended)** When it exists, `tried` carries the concrete
candidates instead. Verified in the not-found output: every level shows the glob
because no level had a `.worktrees`.

**C7 — the bundle was not built where AGENTS.md §8 requires. (would be blocking;
mitigated and disclosed)** See disposition.

### 3. Disposition

- **C1** — *won't-do-because*. An exported error class for one call site widens
  the module's surface, and the failure mode is a stack trace printed *above* a
  message that is still fully present — strictly no worse than today's
  behaviour, where the stack is all there is. Recorded here so the next person
  to reword that string knows it is load-bearing.
- **C2** — *won't-do-because*. The alternatives are worse: passing the store
  through ~30 handler closures is the "widest mechanical edit" the files
  document warned against, and a lazy getter hides an initialisation order that
  is currently one visible line at the top of `main()`. The `!` is the honest
  marker that this is a temporal guarantee.
- **C3, C4** — *won't-do-because*, and deliberately not filed as tickets. Both
  are speculative ergonomics for a flag that has one documented spelling in
  README, `examples/codex-config.toml`, the kanmer-setup skill and the error
  message itself. Filing tickets for them would be inventing work.
- **C5** — *won't-do-because*, per FRD-022:48-49 and the scheduler's Q3 ruling.
  Adding a runner here is precisely the governing-doc change this ticket was
  told not to make.
- **C6** — no action; asserted by `discover.test.ts` ("reports every path it
  tried") and visible in the captured diagnostic.
- **C7** — *fixed-in-PR by other means, and disclosed*. The prescribed build
  location was attempted and proved unavailable: the main checkout is owned by
  concurrent agents and was switched off this branch mid-build, advancing two
  commits. The root cause was removed instead — `npm install` inside the
  worktree, so `@kanmer/core` resolves to
  `.worktrees/mcp-010/packages/core` (`realpathSync`-verified). Both tells
  AGENTS.md names were then checked directly on the artifact: it **contains**
  `discoverBoardRoot`, and **513/513** embedded path comments read
  `../../node_modules`, with **zero** `../../../../node_modules`. Called out in
  the PR body, the report and the verification hand-off; re-running
  `plugin:check` at the repo root post-merge is step 1 of verify. [[MCP-007]]
  already exists to make this guard mechanical rather than procedural, and this
  is a second data point for it.

Nothing above evaporated: every point is either applied, refused with a reason,
or handed to verify.

### 4. Checked

- **Report against diff** — 14 files claimed, 14 files changed, rationales match
  what each hunk does. The report additionally discloses the two places the
  implementation departed from the plan (a third IO seam; FRD-022:48-49 amended
  after all). Both departures are in the checklist notes too, not only here.
- **Governing docs** — ADR-0012's eleven numbered decisions were walked against
  the diff one at a time; each has code behind it. Decision 3 (the
  `.git`-directory-only boundary) has two independent covers: a named unit test
  and `smoke-discovery.mjs` case (b) against a real `gitdir:` file on disk.
  The ADR's **"Corrected premise"** section is present and says plainly that the
  approved plan's wording was wrong — the scheduler's explicit requirement, and
  the thing most likely to have been quietly fixed instead. FRD-022 is `approved`
  and was modified with authorization; its "reads never create `.kanmer/`" claim
  survives and is *asserted* by smoke case (d) (`exists: false` after booting
  with `--init`), which is stronger than the prose it protects.
- **Ripple effects from `files.md`** — `resolveProjectRoot` has exactly one
  source caller (`index.ts:32`), confirmed by grep; the GUI's `--root` tests are
  untouched and still pass; the committed bundle is regenerated; all five prose
  sites asserting the old order are amended; `deriveRepoRoot` and `refs`
  resolution are untouched and the resolver returns the board root, which
  `smoke-discovery.mjs` case (a) proves by finding `.worktrees/board` and not the
  fixture root.
- **Open questions** — all five ticked with citations before Preparing was left;
  three parked with reasons. No fix in this review turns on an open question.
- **Scope** — `kanmer-setup` is in scope on the operator's explicit instruction,
  not scope creep. The GUI was audited and deliberately **not** changed
  (`connect.ts:47` always passes `--root`); that is recorded as a checked finding
  rather than an assumption.

### 5. Verdict

**PASS.** The rail is green in full (`npm test` 201, typecheck clean,
`plugin:check` OK at 29 tools with matching bundle bytes, smoke 120/120,
smoke-protocol 26/26, agents-block 26/26, manual up to date, smoke-discovery
13/13), and the ticket's central claim is evidenced by a before/after pair
captured on either side of the change rather than described.

The one thing this review cannot certify from inside the worktree is the bundle
bytes against a repo-root build. That is not hand-waved: it is the first item of
the verification hand-off, and `kanmer-verify` runs it on merged `main` at the
root, which is the only place the check means anything.

Merging, then moving to Verifying.
