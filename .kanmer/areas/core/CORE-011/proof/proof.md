# Proof

Commit `b5b332e`, merged `--no-ff`. Verified on the merged base in the **main
checkout**, not the ticket worktree — see the report for why that distinction
matters here.

## The rule refuses the exact thing it was written for

Against a copy of this repo's live 43-ticket board: create a `feature`, write
all six pipeline documents, then one move to `done`. That is precisely what was
done to 26 tickets.

```
created GUI-018 profile feature, status backlog
all six documents written
RESULT: refused
  GUI-018 cannot move from "backlog" to "done" in one step: that crosses 4
  document gates (leaving Backlog, leaving Preparing, entering Review,
  entering Done). A single move may cross one. Move one stage at a time —
  the next is "preparing". Call get_doc_gates for the full picture.
```

Every document was present. The refusal is about the shape of the move, and
says so rather than naming files that already exist.

The honest path still works, same ticket, same documents:

```
preparing implementing review verifying done
stageEntered: {"preparing":"…41.890Z","implementing":"…41.902Z",
               "review":"…41.914Z","verifying":"…41.925Z","done":"…41.936Z"}
```

Five moves, five recorded entries. On the old code this was one move and no
history at all.

## The two acceptance cases that a naive rule would break

Both asserted in `gates.test.ts` and exercised over stdio in `smoke.mjs`:

- **`chore` Backlog → Implementing** — two stages, one gated boundary. Allowed.
- **`spike` Backlog → Done** — five stages, one gated boundary. Allowed.

Counting stages instead of gated boundaries would have broken both. That is why
the count is of gated boundaries.

## Rail, on the merged base

- `npm test` — core **127** (was 117: +7 gates, +3 store), gui **136**
- `smoke.mjs` — **120/120** (was 117; +3 new collapse checks)
- `smoke:protocol` — 26/26
- `typecheck -w @kanmer/gui` — clean · `build -w @kanmer/gui` — clean
- `plugin:build` + `plugin:check` — 29 tools match, bundle bytes match
- `KANMER_SMOKE=1` boot — exit 0

The plugin rebuild matters more than usual: `move_item`'s refusal is the
behaviour agents hit, and it reaches them only through the bundle.

## A stale-build trap, found and worked around

The new smoke checks initially failed against unchanged code. Cause: the ticket
worktree links the root `node_modules`, so `@kanmer/core` resolves to the main
checkout and `mcp-server`'s build bundled core *without* this change.
`packages/core/dist` in the worktree had the new code; `packages/mcp-server/dist`
did not.

Vitest is unaffected — it imports relatively. Anything crossing a package
boundary must be built and verified on the merged base, which is where this
proof was produced. Recorded in scratch/notes so the next ticket does not
rediscover it.

## Not proven

That the rule catches **code-then-plan** — it does not, and cannot. Writing the
implementation, then the plan, then moving one stage produces correctly ordered
everything. The report and FRD-002 G2a both say so, and name the only signal
that would work (document first-write vs. the first commit on the ticket branch)
as an open design question rather than pretending it is handled.

`stageEntered` does not backfill. The 26 tickets closed before this have no
stage history and will not gain one; inventing timestamps would be fabrication.
