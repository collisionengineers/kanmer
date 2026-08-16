# Open questions — MCP-010

All five are **resolved**. Q1 by the operator (`scratch/operator-answers.md`,
2026-08-16); Q2–Q5 by the scheduler (`scratch/scheduling.md`, same day). The
answers are binding on the plan and are not re-opened here.

- [x] **OPERATOR DECISION REQUIRED — is "no board found" fatal, or degraded?**
      **ANSWERED by the operator: option (c) — throw, PLUS an explicit `--init`
      opt-in.** (`scratch/operator-answers.md:3-4`.) Concretely, quoting that
      note: "**Not-found is fatal.** No silent boot into a rootless session. The
      error names **every path tried**, in order, and names all three
      recoveries." and "**Bootstrapping survives behind an explicit opt-in.**
      `--init` (and/or `KANMER_INIT=1`) is what permits creating a board where
      none was found … it must now be reached only through the opt-in, never by
      accident."
      The operator also settled the blast radius: "**`kanmer-setup` is
      affected.** … Check the skill and any GUI call path that expects lazy
      creation, and update them in this ticket — a fatal resolver plus a setup
      flow that assumes lazy creation is a broken product, not two tickets."
      (`operator-answers.md:27-30`.) `kanmer-setup` is therefore **in scope** for
      this ticket.
      And: "The `tried` list in the error is the same list that goes in the
      `tried` provenance field. One source, two surfaces."
      (`operator-answers.md:31-32`.)

- [x] **Does the ancestor walk pass through a `.git` *file*?**
      **Yes. Accepted: the hard boundary is a `.git` DIRECTORY only; a `.git`
      FILE is traversed.** (`scratch/scheduling.md:7-15`.) A linked git worktree's
      `.git` is a 66-byte `gitdir:` file, and `kanmer-execute` puts every
      implementing agent inside `.worktrees/<id>` — so "stop wherever `.git`
      exists" would halt at `<repo>/.worktrees/<ticket-id>` and never find
      `<repo>/.worktrees/kanmer/.kanmer`, which is the dominant real case.
      The scheduler flags this as a **correction, not a clarification**: "This
      corrects the approved plan. The plan document says the walk 'stops at a
      filesystem root or a `.git` boundary' without distinguishing file from
      directory. That wording is wrong and is superseded by this note. Say so
      explicitly in the ADR — a silently corrected premise is how the same
      mistake returns." (`scheduling.md:17-20`.) ADR-0012 records it as a
      corrected premise under its own heading.
      Also accepted there: **probe each level BEFORE applying the boundary**,
      because the repo root holds both `.git` and `.worktrees/`
      (`scheduling.md:22-23`).

- [x] **Which package owns the resolver — `@kanmer/core` or `packages/mcp-server`?**
      **Accepted: `packages/core/src/discover.ts`**, exported from the core
      barrel, with `packages/core/src/discover.test.ts` beside it;
      `packages/mcp-server/src/root.ts` stays thin composition
      (`scratch/scheduling.md:25-34`). `packages/mcp-server` has no test runner
      and `FRD-022:48-49` records that absence as deliberate — overturning an
      approved doc as a side effect of a bug fix is not this ticket's mandate.
      **No test runner is added to `packages/mcp-server`.**

- [x] **What is the tie-break when several `.worktrees/*/.kanmer` exist?**
      **Accepted: exact leaf `kanmer` wins; otherwise lexicographic; all
      candidates named in the provenance** (`scratch/scheduling.md:36-41`).
      `.worktrees/kanmer` is a convention rather than an invariant
      (`kanmerGit.ts:119-122` adopts a board worktree checked out at any path),
      so the tie-break must be deterministic and must never silently pick.

- [x] **What is the exact provenance field name and vocabulary?**
      **Accepted: `{ root, how, tried }` with
      `how ∈ flag | env | cwd | cwd-worktree | ancestor | ancestor-worktree`,
      surfaced in `get_status` as `rootSource`** (`scratch/scheduling.md:43-49`).
      "MCP-010 defines the vocabulary; MCP-012 reports it. MCP-012 does not get
      to rename it."
      **One planner-level extension, recorded rather than assumed:** the
      operator's Q1 answer introduced `--init` *after* Q5 was settled, so the
      vocabulary has no value for "nothing was found and `--init` permitted a
      board at cwd". All six settled values keep their exact meaning; a seventh,
      **`init`**, is added for that case only. Calling it `cwd` would be a lie —
      `cwd` means "`<cwd>/.kanmer` was found" — and the whole point of this
      ticket is that a root must never be reported as discovered when it was
      not. This is an addition, not a rename, so it does not disturb the
      scheduler's ruling; MCP-012 must report `init` alongside the other six.
      Recorded in ADR-0012 §Decision.

## Parked (explicitly deferred)

- [ ] **Should the GUI use the same discovery function?** `openProject` is always
      given an explicit path, and `connect.ts:47` always emits `--root
      <boardRoot>`, so no GUI path relies on discovery or on lazy creation and
      nothing is broken today. Safe to defer; reopens if a "find my board"
      affordance is ever added to the welcome screen.

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
