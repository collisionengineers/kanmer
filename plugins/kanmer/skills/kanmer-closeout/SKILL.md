---
name: kanmer-closeout
description: Close out a verified Done ticket or an explicitly retired post-merge verification failure — confirm proof.md and disposition are final, record traceability, then remove the worktree, delete the branch, and release so nothing stale accumulates. Use after kanmer-verify's success or terminal-retirement handoff. DO NOT USE FOR deciding whether the work is good, verifying it, or inventing a failure disposition.
---

# Closing out a Kanmer ticket

Closeout is what stops the two slow leaks: tickets that sit taken forever,
and worktrees/branches that outlive their PR. It runs in a fixed order —
**Kanmer record-keeping first**. An isolated ticket then cleans Git and releases
last. A batch instead completes every member's record, releases every member
idempotently, and deletes its one shared worktree and branch only after those
releases. Proof evidence therefore stays available until every member is
terminal, while an interrupted batch closeout can resume from its manifest.

Start by appending `assets/closeout-checklist.md` to the ticket's
checklist.md (`set_ticket_doc append: true`) so the human watches cleanup
progress live.

## 0. Gate: is the PR actually merged?

```sh
gh pr view <branch> --json state,mergedAt,url
```

Proceed only on `state: "MERGED"`. `OPEN` → not a closeout; stop and say so.
`CLOSED` without merge → the abandoned path below.

## 1. Kanmer half

The ticket is in exactly one accepted terminal shape:

- **verified success** — status Done, not archived, final proof result `PASS`,
  or `WAIVED_BY_OPERATOR` with the operator identity and reason in the proof
  body (the human disposition `kanmer-verify` describes; a waiver without
  those is not final); or
- **retired non-success** — status Verifying, archived, final proof result is
  not `PASS`, and the Outcome names the operator's irrecoverable/superseded
  reason plus a successor ticket or explicit no-successor disposition.

Reject every other shape. Closeout never decides that a failure is terminal,
archives it, moves it to Done, or changes its proof result. Those decisions and
evidence belong to `kanmer-verify` and the operator.

1. **Confirm `proof.md` is final** (`get_ticket_doc doc: "proof"`); append the PR
   URL and merge date if verify didn't.
2. **Record traceability** (`update_item` with `expected_updated`): `commits`
   (the merged SHAs), `prs` (the merged PR ref), and — if the board tracks
   deployment — set `deployment` (`n/a` for non-deployable work, `not-deployed`,
   or the environment it shipped to). CI auto-detection is out of scope; set it
   from what actually happened.
3. **Record the Outcome** in the ticket body's Outcome section: follow-up ticket
   ids and anything that shipped differently than planned. For retired
   non-success, preserve the operator, reason, proof result and successor or
   explicit no-successor disposition verbatim.

## 2. Git half

**The board's own worktree is not yours to remove.** In a repo set up through
the GUI the board lives in `.worktrees/kanmer` on the board branch, and MCP is
rooted there — every command in this section takes the **ticket's** worktree and
branch, the ones `take_ticket` recorded on the ticket. Read them off `get_item`
rather than globbing `.worktrees/*`; removing `.worktrees/kanmer` destroys the
checkout the board is being served from.

```sh
# never remove the directory you're standing in — return to the main checkout
cd "$(git worktree list --porcelain | head -1 | cut -c 10-)"

git worktree remove .worktrees/<id>
git branch -d <id>-<slug>       # -D only per the table below
git fetch --prune origin
git worktree prune
```

If the host repo doesn't auto-delete merged branches:
`git push origin --delete <id>-<slug>`.

**Batch members share one worktree and branch (FRD-030).** Before any batch
cleanup action, first call `list_items include_archived: true`. Use the
summaries' `batch.id` to discover every ticket with the exact same batch id;
never infer membership from a matching branch, worktree, or only the active
board. While an authoritative manifest is `active` or `releasing`,
`list_items include_archived: true` is the sole complete roster census: it
keeps projecting the manifest onto every member until manifest unlink — even
after a partial release has cleared all ticket-local batch fields.
`search_items` projects batch metadata only onto matching non-archived results
and is never a complete roster census. Read `batch.state`, the complete `batch.members`,
`batch.workspace`, and `batch.branch` from that projection. This is the fresh
closeout discovery path after any interruption; do not depend on remembering a
member id's old claim fields. Surface listing warnings and refuse a `pending`,
inconsistent, missing, or conflicting projection instead of guessing the
roster. Capture the immutable roster and shared Git path, finish the Kanmer
half for every member, and require every immutable-roster member to be terminal
— Done, or archived under the accepted retired non-success shape — before
cleanup starts.

After that all-terminal check, a fresh closeout agent may call
`take_ticket action: "release"` for every roster member. Terminal batch release
is deliberately not actor-bound: it does not require the original MCP actor or
`controller_run`, because implementation ownership is over and closeout may be
recovering another process's interruption. Release is idempotent across the
manifest's `releasing` phase: after an interruption, repeat the remaining
releases until the manifest is gone. Only then remove the one shared worktree
and delete the shared branch. An early release refuses `BATCH_ACTIVE`; an
unreadable, incomplete, or changed roster is a stop rather than permission to
clean Git.

## 3. Release, last

`take_ticket action: "release"` — issued only once nothing is actually in
flight. Success stays Done; retired non-success stays archived in Verifying.
In both cases Git shows nothing left and the live board has no stale taken work.
For a batch, use the exception above: release every member idempotently before
the shared git cleanup; the manifest makes an interrupted `releasing` pass
resumable.

## Edge cases

| Case | Do this |
|---|---|
| **PR still `OPEN`** | Not a closeout. Stop, tell the user, touch nothing — the ticket stays taken in review. |
| **PR `CLOSED` without merge** | Never move to the final stage. Ask the user: rework (leave everything, move the ticket back a stage) or abandon (append why to checklist.md, then the abandoned-cleanup below). |
| **Abandoning: worktree dirty / branch unmerged** | Show the user `git -C .worktrees/<id> status --porcelain` and the unmerged commits before any `--force` / `-D`. Only after they confirm it's disposable: `git worktree remove --force`, `git branch -D`, release, then archive or re-stage the ticket per the user. |
| **`git worktree remove` refuses (dirty)** on a merged PR | That's the safety working. Commit-and-push or stash anything that matters to the branch first; `--force` only for confirmed-disposable output (build artifacts) after showing the user what's there. |
| **`git branch -d` refuses ("not fully merged")** | Expected after a squash- or rebase-merge — the PR's commits aren't ancestors of main. Because step 0 verified `MERGED`, `git branch -D` is safe **in that case only**. If merge state couldn't be verified (no `gh`, no network), don't `-D`; leave the branch and flag it. |
| **You're standing inside the worktree** | You can't delete the directory you're in (Windows holds the cwd handle). The `cd` to the main checkout is step one of the git half precisely for this. |
| **Pausing, not closing** (work will resume) | This is not closeout. Leave the ticket taken, retain its recorded branch and worktree, and use `kanmer-execute`'s pausing section to append the resume point. Do **not** release it: release clears the metadata the resume lane requires. |
| **Worktree recorded on the ticket but gone on disk** | `git worktree list`: registered but missing → `git worktree prune`; directory lingering but unregistered → plain `rm -rf` of the leftover dir. Either way continue normally — a missing worktree is just less to clean. |
| **`.worktrees/kanmer` shows up in `git worktree list`** | Not a leftover — that is the **board's** worktree, on the board branch, and MCP is rooted in it. Never `remove`, `prune` away, `rm -rf`, or `push --delete` it, and never `-D` the board branch. It is the one entry in that directory this skill does not own. |
| **Several tickets share one branch** | Do the kanmer half per ticket as each finishes; do the git half only when the **last** of them closes — `list_items` and check no other ticket's `taken.branch` matches first. |

---

**No successor — this is the end of the pipeline.** The ticket is either Done
with PASS (or an operator waiver) or archived in Verifying with an explicit
non-success disposition;
the worktree and branch are gone, and the ticket is released. If closeout produced
follow-up work, that is a **new ticket** via `kanmer-tickets`, starting again at
Backlog; it is not a continuation of this one. Control returns to whoever was
driving — often `kanmer-auto`, which counts this ticket as finished and moves to
the next in its roster.
