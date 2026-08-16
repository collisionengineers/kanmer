## OPERATOR ANSWERS — 2026-08-16

Both operator questions are ANSWERED. The planner may tick Q1 and Q2 citing this
note. Q3 (AGENTS.md §8 rewrite) was flagged as planner-level — decide it in the
plan; the recommendation to shrink the narrative to two lines pointing at the
guard is endorsed, since a gotcha describing a trap the tooling now catches
trains people to skim §8.

**Q1 — how does a ticket branch refresh the committed bundle?
ANSWERED: option (c) — guard `plugin:check` ONLY. `plugin:build` stays unguarded.**

```
plugin:build   -> works anywhere
plugin:check   -> refuses in a worktree
```

Rationale the operator selected: the artifact can still be *produced* wrong, but
it can no longer be *validated* wrong — and validation is the failure that
actually shipped. `scripts/release.mjs` runs `plugin:check` from the repo root, so
the release rail is unaffected. Nothing in the current `kanmer-execute` workflow
breaks, and no `npm install` inside worktrees is required.

**Scope consequence — read this before planning.** Option (b) is NOT chosen, so
the guard keys on **"is this a worktree"**, not on "is `node_modules` missing".
Use the signal research verified:

- primary: `git rev-parse --git-dir` !== `git rev-parse --git-common-dir`, run with
  `cwd = root`, both sides `path.resolve`d (git returns one relative and one
  absolute across the two cases, so a naive string compare is accidentally right
  here and wrong elsewhere)
- fallback when `git` is off PATH: `statSync(root/.git).isFile()`

The `.worktrees/` path-segment test stays **rejected** — it only recognises
worktrees this repo's own naming convention created.

**Q2 — escape hatch? ANSWERED: NO HATCH.**

No `KANMER_ALLOW_WORKTREE_BUILD` or equivalent. Do not add one "just in case", and
do not add one later without asking. An unforeseen legitimate case means editing
the script and justifying it in review. The operator's reasoning matches the
research recommendation: SKILL-011 shipped precisely because a guard reported OK
when it could not be true, and an env var is how a future agent makes the refusal
go away at 2am instead of fixing the cause.

Use the house `refuse(why, fix)` idiom at `release.mjs:41-45` — the refusal must
say what to do, not merely that it refused.

**Lane A position: MCP-007 runs after CORE-023. It is not blocked.**
