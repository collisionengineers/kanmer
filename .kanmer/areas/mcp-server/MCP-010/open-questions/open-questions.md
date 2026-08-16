# Open questions — MCP-010

- [ ] **OPERATOR DECISION REQUIRED — is "no board found" fatal, or degraded?**
      Only the human operator can settle this; it is a product-behaviour call,
      not a technical one, and the plan must not assume an answer.
      Today, an MCP server started in a repo with no board still works: the first
      *write* lazily creates `<cwd>/.kanmer` (`index.ts:58-74` → `store.init()`),
      which is how `kanmer-setup` onboards a brand-new project. If discovery
      throwing is fatal at boot, that path disappears — an agent can no longer
      create a board anywhere without being handed `--root`.
      Options: **(a)** throw and exit — loudest, but removes bootstrapping;
      **(b)** boot fine, report `found: false` + the tried list from `get_status`,
      and throw the full diagnostic from the *first write* — keeps bootstrapping
      impossible-by-accident while staying loud; **(c)** throw, and add an explicit
      opt-in (`--init` or `KANMER_INIT=1`) for creating a board at cwd.
      *Recommendation: (c).* It honours the ticket's "throw, naming every path
      tried" verbatim, keeps silence impossible, and makes creating a board an
      explicit act rather than a side effect of a mis-rooted session. (b) is the
      acceptable fallback if the operator wants zero new flags.

- [ ] **Does the ancestor walk pass through a `.git` *file*?** Research says it
      must: in a git linked worktree `.git` is a file (verified: 66 bytes,
      `gitdir: …`), and `kanmer-execute` puts every implementing agent inside
      `.worktrees/<id>`. A boundary of "`.git` exists" would stop there and never
      find `<repo>/.worktrees/kanmer/.kanmer`. *Recommended answer: the hard
      boundary is a `.git` **directory** only; a `.git` file is traversed.* This
      is stated as a question rather than assumed because it is a deliberate
      narrowing of the wording agreed with the operator ("a `.git` boundary") and
      must be recorded in ADR-0012 rather than discovered later in a test.

- [ ] **Which package owns the resolver — `@kanmer/core` or `packages/mcp-server`?**
      The ticket asks for unit tests with an injected `existsSync`, but
      `mcp-server` has no vitest, no `test` script, and `FRD-022:48-49` records
      *deliberately* not adding one. *Recommended answer: `packages/core/src/discover.ts`
      + `discover.test.ts`, exported from core's barrel, with `root.ts` reduced to
      the `--root`/`KANMER_ROOT`/discovery composition.* It sits beside
      `deriveRepoRoot` (its inverse), gets tested by machinery that already runs
      in `npm test`, and leaves FRD-022's no-vitest statement true. The
      alternative — adding vitest to `mcp-server` — is defensible but is a
      governing-doc change on top of a governing-doc change.

- [ ] **What is the tie-break when several `.worktrees/*/.kanmer` exist?**
      `ensureBoardWorktree` creates `.worktrees/kanmer`, but it also adopts a
      board worktree already checked out at any path (`kanmerGit.ts:119-122`), and
      `.worktrees/` simultaneously holds per-ticket worktrees that could carry a
      committed `.kanmer` from their branch. *Recommended answer: exact leaf name
      `kanmer` wins; otherwise lexicographic first, and name every candidate in
      the provenance so an ambiguous pick is visible rather than silent.*
      Cheap to implement, and it makes the failure mode legible.

- [ ] **What is the exact provenance field name and vocabulary?**
      [[MCP-012]] consumes it in `get_status`, so agreeing it here avoids a rename
      later. *Recommended answer: `{ root, how, tried }` with
      `how ∈ "flag" | "env" | "cwd" | "cwd-worktree" | "ancestor" | "ancestor-worktree"`,
      surfaced as `rootSource` in `get_status` alongside the existing
      `projectRoot`.* Confirm with whoever plans MCP-012.

## Parked (explicitly deferred)

- [ ] **Should the GUI use the same discovery function?** `openProject` is always
      given an explicit path, so nothing is broken today. Safe to defer; reopens
      if a "find my board" affordance is ever added to the welcome screen.

- [ ] **Should `--root` pointing at a repo root auto-redirect to its
      `.worktrees/*/.kanmer` board?** Tempting, since the repo-root `.mcp.json`
      on this machine hardcodes the worktree path by hand. Deferred because it
      would make an explicit assertion silently non-literal, which is the exact
      class of surprise this ticket exists to remove. Reopens if users are found
      passing `--root <repo>` and getting an empty board.

- [ ] **Cost of the walk on network/UNC paths.** One `existsSync` plus one
      `readdir` per ancestor level is cheap on local disk; a deep UNC path could
      be slower. Deferred — no evidence of a problem, and the walk terminates at
      the first `.git` directory in practice. Reopens on a report of slow server
      startup.
