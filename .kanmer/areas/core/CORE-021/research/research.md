# The branch precondition — research

Every claim below was run against real git, in a throwaway repo built for the
purpose, not reasoned about.

## The rule as the ticket states it is wrong

The ticket says:

    git rev-list --count <branch> === 0

Run against a freshly created ticket branch in this repo:

```
$ git worktree add … -b probe-edge-case HEAD
$ git rev-list --count probe-edge-case
147
```

**147, not 0.** A branch created at `HEAD` inherits the entire history, so the
count is the whole repo. The rule as written would refuse *every* move out of
Preparing, for every ticket, immediately.

The obvious repair — `git rev-list --count <base>..<branch>` — needs a base, and
there isn't one to hand. `kanmer-execute` says branch from `origin/main`, but
this session's tickets were all cut from `v3-phase-minus-1-prework`. The base is
not recorded anywhere on the ticket, and guessing `main` would misfire on any
stacked or integration-branch workflow.

## The formulation that works, and needs no base

Commits reachable from the branch but from **no other ref**:

```sh
others=$(git for-each-ref --format='%(refname)' refs/heads refs/remotes \
         | grep -v "^refs/heads/<branch>$")
git rev-list --count <branch> --not $others
```

Base-free by construction: "has anything landed here that is nowhere else"
rather than "how far is this from a base I have to identify".

## Measured behaviour, all seven cases

| Scenario | Unique commits | Move out of Preparing |
|---|---|---|
| Branch just created off main | **0** | allowed |
| One real commit of work | **1** | refused |
| That work merged into main, branch kept | **0** | **allowed again** |
| Fresh branch off an already-advanced main | **0** | allowed |
| Branch cut from another feature branch that has work | **0** | allowed |
| That branch after its own commit | **1** | refused |
| Branch does not exist | — | no-op |

## The hard edge case resolves itself

The ticket flags "ticket re-opened and moved back" as the case most likely to
make the rule annoying, and proposes an exemption keyed on
`stageEntered.implementing`.

**No exemption is needed for the common shape.** Row 3 is the measurement: once
the branch's commits are reachable from the base — which is what merging does —
the count returns to 0 and the ticket may leave Preparing again. A ticket whose
PR merged and which is then re-opened for follow-up work is unblocked
automatically, because the code it produced is no longer unique to that branch.

What remains blocked is a ticket sent back from Review **before** its PR merged,
still holding unmerged commits. That is arguably correct — there is code, the
plan did follow it — but it is a real workflow (review asks for changes) and
needs a decision rather than an accident. See open questions.

## Cutting from a non-main branch is handled

Row 5 matters for this repo specifically. Every ticket this session branched off
`v3-phase-minus-1-prework`, not `main`. A base-relative rule pointed at `main`
would have counted the whole v3 line as "work on the ticket branch" and refused
everything. The unique-commits formulation returns 0 correctly.

## Which root the command runs in

Git worktrees **share a ref store**. From the board worktree and from the source
root, `for-each-ref` lists identical branches and `--git-common-dir` resolves to
the same `.git`:

```
board:  C:/Users/PC/Documents/GitHub/kanmer/.git
source: C:/Users/PC/Documents/GitHub/kanmer/.git
```

So for the normal setup the root does not matter — the trap that caused the
watcher bug and CORE-001 is absent here.

It still must run in **`this.paths.repoRoot`**, not `projectRoot`: a board that
is not a worktree of the code repo (a non-git project, or a board kept
elsewhere) would otherwise be queried for branches it does not have.
`repoRoot` already exists for exactly this distinction (CORE-001).

## What the rule cannot see

Work that has been written but **not committed**. The check counts commits; a
worktree full of uncommitted edits with no commit on the branch scores 0 and the
move is allowed. Measured: row 7 scores 1 only because an earlier commit exists.

That is a real hole, and closing it would mean core inspecting a working tree's
dirty state — a different and much more invasive thing than counting refs.

## Cost, and the dependency this introduces

Two git invocations per move out of Preparing (`for-each-ref`, `rev-list`).
Both are cheap and neither touches the network.

The significant cost is architectural: **`packages/core` shells out to git
nowhere today.** This introduces that. It is not obviously wrong — the board is
already a git artifact — but it means core acquires a child-process dependency
and a class of failure (git missing, repo corrupt, slow filesystem) it currently
does not have. Every failure mode must degrade to *allow the move*, never to
block it: a gate that refuses because git was slow is worse than the hole it
closes.

---

# Second pass: the call graph, which changes the design

The formulation above is settled. What was missing was *where* it runs. Three
findings, each measured.

## `assertDocGate` has three callers, and they pass different snapshots

```
store.ts:666  updateItem          → assertDocGate(…, next,    current.status, next.status)
store.ts:752  assertMoveAllowed   → assertDocGate(…, current, current.status, status)
store.ts:840  takeTicket          → assertDocGate(…, current, current.status, stage)
```

`updateItem` passes **`next`** — the item *with* pending changes. The other two
pass **`current`**. Nothing documents this difference and it decides the rule's
behaviour.

## `take_ticket` is a leave-preparing move, and is safe only by accident

`store.ts:837`: when `input.stage` is omitted, `stage = "implementing"`. So
`take_ticket` on a ticket sitting in Preparing **is** a leave-preparing
transition and hits the new rule.

It is nonetheless safe — but for a reason worth writing down. At `store.ts:840`
the gate receives `current`, whose `branch` is the *old* one; the new branch is
only assigned at `:846`. On the normal path (an untaken ticket) `current.branch`
is `undefined`, the rule no-ops, and the take proceeds. Which is right: the
branch is being created *now*, so it cannot yet hold commits.

That correctness depends entirely on `takeTicket` passing `current` rather than
`next`. Change that line and `take_ticket` starts gating against a branch that
does not exist yet. The plan should state the dependency; a comment at the call
site would be cheap insurance.

The genuinely odd case is `take_ticket --force` onto a ticket already taken with
a branch that has commits: the rule then checks the *outgoing* branch and
refuses a re-take. Rare, and arguably correct, but it is a behaviour change to
`take_ticket` and should be acknowledged rather than discovered.

## Every GUI drag would spawn git twice

`moveItem` runs `assertMoveAllowed` as a pre-flight **only when a position is
given** (`store.ts:726`), then `updateItem` gates again. Two `assertDocGate`
calls per positioned move.

`Board.tsx:107-112` and `:181` show every drop passes a position. So **every
drag onto a column past Preparing costs two git subprocess spawns**, on the
Electron main thread.

The comment at `store.ts:735-737` explicitly accepts the double-check as
"cheap". That stops being true with a subprocess behind it. Either the check
caches within a call, or it runs late enough to be skipped when a cheaper
rejection already fired.

## The rule is a precondition, not a profile requirement

`profiles.ts:120,125,129` give `leave-preparing` requirements for `feature`,
`fix` and `chore`. **`spike` declares none** — so for a spike, `leave-preparing`
is not a gated boundary at all and `collapsesPipeline` does not count it.

If the rule were expressed as a profile requirement it would silently not apply
to spikes. The stated intent — "you cannot leave Preparing once code exists" —
is unconditional, so it belongs beside the collapse check as a **precondition**,
outside `requirementsFor` and outside the `EvidenceProbe`.

## A correction to the file inventory

The inventory warned that because `ensureBoardWorktree` creates the board with
`--orphan` (`kanmerGit.ts:143`), "a rev-list run from the board worktree would
answer about the wrong graph entirely."

**That is wrong, and measured to be wrong.** The board branch is indeed orphan —
`git merge-base kanmer-board main` returns nothing — but git worktrees share a
ref store and object database. From inside the board worktree:

```
$ git -C .worktrees/kanmer rev-list --count v3-phase-minus-1-prework --not main
50
```

The correct answer. Orphan-ness affects the board branch's *own* history, not
its visibility of other branches.

`repoRoot` is still the right cwd — for a board kept outside the code repo, or a
colocated non-git board — but not for the reason given, and the difference
matters: designing around a graph-isolation problem that does not exist would
add machinery for nothing.

## The degrade-to-allow path already has a test

`packages/mcp-server/src/smoke.mjs:206` calls `take_ticket` with
`branch: "feat/smoke"` in a temp sandbox that is **not a git repo**, then moves
the ticket. If the rule throws when git is unavailable instead of allowing,
`smoke.mjs` fails. That is free coverage for the most important failure mode.

## One existing test will break

`store.test.ts:741-757` ("stamps stageEntered on the way in") moves
`preparing → implementing` twice. It passes today because its fixture has no
branch. It is the canary: the moment a test fixture gains a `branch`, this is
the first thing to go red.

## Core has no subprocess today — confirmed exhaustively

No `child_process`, `execFile`, `spawn`, `execSync` or `simple-git` anywhere in
`packages/core/src`, tests included. Runtime deps are `chokidar`, `gray-matter`,
`yaml`, `zod`. This change introduces the first subprocess in `@kanmer/core`,
and core is bundled into `plugins/kanmer/mcp/kanmer-mcp.cjs`.

That is architecturally novel enough to warrant its own ADR rather than a line
in FRD-002.
