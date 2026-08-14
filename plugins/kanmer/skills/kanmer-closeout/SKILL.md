---
name: kanmer-closeout
description: Close out a finished Kanmer ticket after its PR merges — verify the merge, finalise proof.md, move the ticket to the final stage, record the outcome, then remove the worktree, delete the branch, and release, so nothing stale accumulates. Use when the user says "the PR merged", "close out <ID>", "wrap up this ticket", "clean up the worktree/branch", or when a taken ticket's PR has landed. DO NOT USE FOR deciding whether the work is good (kanmer-review) or for tickets whose PR hasn't merged yet.
---

# Closing out a Kanmer ticket

Closeout is what stops the two slow leaks: tickets that sit taken forever,
and worktrees/branches that outlive their PR. It runs in a fixed order —
**kanmer record-keeping first, git cleanup second, release dead last** —
because proof evidence may still need the worktree alive, a git snag must
not strand the board, and a lingering ⛏ badge on a done ticket is a visible
prompt to finish cleanup, unlike a silently orphaned directory.

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

1. **Finalise `proof.md`** — append the PR URL and merge date to the
   evidence (`set_ticket_doc doc: "proof", append: true`).
2. **`move_item` to the board's last stage** (resolve via `list_board`; the
   proof gate is now satisfied).
3. **Record the Outcome** in the ticket body's Outcome section
   (`update_item` with `expected_updated`): PR link, merge date, follow-up
   ticket ids, anything that shipped differently than planned.

## 2. Git half

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

## 3. Release, last

`take_ticket action: "release"` — issued only once nothing is actually in
flight. Done: board shows the ticket finished, git shows nothing left.

## Edge cases

| Case | Do this |
|---|---|
| **PR still `OPEN`** | Not a closeout. Stop, tell the user, touch nothing — the ticket stays taken in review. |
| **PR `CLOSED` without merge** | Never move to the final stage. Ask the user: rework (leave everything, move the ticket back a stage) or abandon (append why to checklist.md, then the abandoned-cleanup below). |
| **Abandoning: worktree dirty / branch unmerged** | Show the user `git -C .worktrees/<id> status --porcelain` and the unmerged commits before any `--force` / `-D`. Only after they confirm it's disposable: `git worktree remove --force`, `git branch -D`, release, then archive or re-stage the ticket per the user. |
| **`git worktree remove` refuses (dirty)** on a merged PR | That's the safety working. Commit-and-push or stash anything that matters to the branch first; `--force` only for confirmed-disposable output (build artifacts) after showing the user what's there. |
| **`git branch -d` refuses ("not fully merged")** | Expected after a squash- or rebase-merge — the PR's commits aren't ancestors of main. Because step 0 verified `MERGED`, `git branch -D` is safe **in that case only**. If merge state couldn't be verified (no `gh`, no network), don't `-D`; leave the branch and flag it. |
| **You're standing inside the worktree** | You can't delete the directory you're in (Windows holds the cwd handle). The `cd` to the main checkout is step one of the git half precisely for this. |
| **Pausing, not closing** (work will resume) | Append the resume point (branch + worktree path) to checklist progress notes, release the ticket, and **keep** the worktree and branch — see `kanmer-execute`'s pausing section. |
| **Worktree recorded on the ticket but gone on disk** | `git worktree list`: registered but missing → `git worktree prune`; directory lingering but unregistered → plain `rm -rf` of the leftover dir. Either way continue normally — a missing worktree is just less to clean. |
| **Several tickets share one branch** | Do the kanmer half per ticket as each finishes; do the git half only when the **last** of them closes — `list_items` and check no other ticket's `taken.branch` matches first. |
