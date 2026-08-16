# Open questions — MCP-007

The signal question the ticket asks is **closed**: measured in both roots, the
canonical test is `git rev-parse --git-dir` !== `git rev-parse --git-common-dir`
(run with `cwd = root`, both sides `path.resolve`d), with `statSync(root/.git).isFile()`
as the no-subprocess fallback. Evidence in `scratch/notes.md`. The `.worktrees/`
path-segment test proposed in the ticket body is **rejected** — it only recognises
worktrees this repo's own convention created.

**All questions below are answered.** Q1 and Q2 by the operator, recorded verbatim
in `scratch/operator-answers.md` (2026-08-16); Q3 in `plan.md`. Do not reopen them.

## Answered by the operator

- [x] **Q1. Once `plugin:build` refuses inside a worktree, how does a ticket branch that changes `packages/core` or `packages/mcp-server` refresh the committed bundle before its PR?** **ANSWERED: option (c)** — guard **`plugin:check` ONLY**; `plugin:build` stays unguarded. The artifact can still be *produced* wrong, but it can no longer be *validated* wrong, and validation is the failure that actually shipped. `scripts/release.mjs` runs `plugin:check` from the repo root, so the release rail is unaffected; nothing in the current `kanmer-execute` workflow breaks, and no `npm install` inside worktrees is required. **Scope consequence:** option (b) was NOT chosen, so the guard keys on *"is this a worktree"*, not on *"is `node_modules` missing"* — use the researched signal above.

- [x] **Q2. Is there an escape hatch, and who is allowed to use it?** **ANSWERED: NO HATCH.** No `KANMER_ALLOW_WORKTREE_BUILD` or equivalent, now or later, and not to be added later without asking. An unforeseen legitimate case means editing the script and justifying it in review. Operator's reasoning: SKILL-011 shipped precisely because a guard reported OK when it could not be true, and an env var is how a future agent makes the refusal go away at 2am instead of fixing the cause. The refusal uses the house `refuse(why, fix)` idiom at `release.mjs:41-45` — a refusal that does not say what to do is half a refusal.

## Decided in the plan

- [x] **Q3. Does `AGENTS.md` §8 gotcha 8 get rewritten or extended?** **DECIDED: shrunk to about two lines pointing at the guard** (operator-endorsed as planner-level). The current paragraph narrates SKILL-011 at length and reads as the only defence; once the guard exists that narrative stops earning its space, and a gotcha describing a trap the tooling now catches trains people to skim §8. The SKILL-011 history stays recoverable through this ticket and PR #31/#32.

## Parked (explicitly deferred)

- **Shared helper vs. duplication.** Moot under Q1's answer: the guard lands in exactly one script, so there is no duplication and no `scripts/lib/` precedent to set. `scripts/` stays flat and dependency-free.
- **Whether the guard should also assert the bundle's embedded path-comment depth** (`../../node_modules`, confirmed present, vs `../../../../node_modules`). A genuine second signal, but tsup-comment-formatting-dependent and it answers a different question — "was this artifact built wrong" rather than "am I able to judge it". Belongs to a future ticket about artifact provenance, if one is ever wanted.
- **Making worktrees build correctly at all** (per-worktree `node_modules`, hoisting or linker changes). Much larger than this ticket, and only relevant under option (b), which was not chosen.
- **Guarding `plugin:build`.** Explicitly out of scope by Q1's answer. Revisiting it means reopening Q1 with the operator, not adding it quietly.
