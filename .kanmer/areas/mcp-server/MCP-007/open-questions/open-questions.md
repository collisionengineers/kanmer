# Open questions — MCP-007

The signal question the ticket asks is **closed**: measured in both roots, the
canonical test is `git rev-parse --git-dir` !== `git rev-parse --git-common-dir`
(run with `cwd = root`, both sides `path.resolve`d), with `statSync(root/.git).isFile()`
as the no-subprocess fallback. Evidence in `scratch/notes.md`. The `.worktrees/`
path-segment test proposed in the ticket body is **rejected** — it only recognises
worktrees this repo's own convention created.

What is left is not technical.

## Needs the operator — answer before implementing

> These are policy about how humans and agents work this repo. Do not let the plan
> pick a default and move on; the wrong default here makes a correct guard obstructive
> and it will get disabled.

- [ ] **Q1. Once `plugin:build` refuses inside a worktree, how does a ticket branch that changes `packages/core` or `packages/mcp-server` refresh the committed bundle before its PR?** Today `kanmer-execute` puts every implementing agent in `.worktrees/<id>` and AGENTS.md §8 gotcha 8 says build at the repo root — but the root is on `main`, not the ticket branch. Three coherent answers, and they lead to different code: **(a)** the bundle is never refreshed on a ticket branch; it is rebuilt at the root after merge, as PR #32 did — cheapest, but leaves every server PR knowingly shipping a stale artifact until a follow-up commit. **(b)** the implementer runs `npm install` inside the worktree first, giving it real `node_modules` so resolution stays local — then the guard must key on the *cause* (no local `node_modules`) rather than on "is a worktree", which is a different check from the one researched. **(c)** the guard covers `plugin:check` only, and `plugin:build` stays unguarded — the artifact can still be produced wrong, but it can no longer be *validated* wrong. This is the ticket's own "refuse over warn" argument applied only where it is cheap. **Which one is the intended workflow?**

- [ ] **Q2. Is there an escape hatch, and who is allowed to use it?** e.g. `KANMER_ALLOW_WORKTREE_BUILD=1`. Argument for: without one, an unforeseen legitimate case has no recourse but editing the script. Argument against: SKILL-011 shipped precisely because a guard reported OK when it could not be true, and an env var is how a future agent makes the refusal go away at 2am rather than fixing the cause. **Default recommendation if unanswered: no hatch** — but that should be a decision, not a silence.

## Needs deciding in the plan

- [ ] **Q3. Does `AGENTS.md` §8 gotcha 8 get rewritten or extended?** The paragraph currently reads as the *only* defence and narrates SKILL-011 at length. Once the guard exists, is the narrative still earning its space, or does it become two lines pointing at the guard? Cosmetic, but §8 is the file agents actually read before debugging, and a gotcha that describes a trap the tooling now catches trains people to skim §8.

## Parked (explicitly deferred)

- **Shared helper vs. duplication.** If the guard lands in both `check-plugin-sync.mjs` and `build-plugin.mjs`, ~15 lines are duplicated. There is no `scripts/lib/` and every script in `scripts/` is flat and dependency-free by policy. At n=2 duplication is defensible; creating `scripts/lib/` is a structural precedent for the whole directory. Decide when writing the code, once Q1 has settled whether it is one script or two. Not a blocker either way.
- **Whether the guard should also assert the bundle's embedded path-comment depth** (`../../node_modules`, confirmed present, vs `../../../../node_modules`). A genuine second signal, but tsup-comment-formatting-dependent and it answers a different question — "was this artifact built wrong" rather than "am I able to judge it". Belongs to a future ticket about artifact provenance, if one is ever wanted.
- **Making worktrees build correctly at all** (per-worktree `node_modules`, hoisting or linker changes). Much larger than this ticket, and only becomes relevant if Q1 resolves as (b).
