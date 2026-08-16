## LIVE REPRODUCTION — 2026-08-16 — your Q4 bug just happened, in this repo

Your research called `apps/gui/src/main/agentsBlock.ts:11-24` a live bug: it holds
a stale **v2** copy of the managed block, `connect.ts:18` imports **that one**, so
the GUI's Connect flow writes a v2 block into every repo it touches. You were
right, and it has now been caught in the act.

During this run an agent invoked Connect against the real kanmer checkout while
verifying something unrelated. `git status` on `main` then showed `M AGENTS.md`,
9 insertions / 14 deletions, replacing the correct format-3 block with:

- `Stages: backlog → researching → planning → implementing → review → verifying → done`
  — the **v2** seven-stage list. Format 3 has six fixed stages.
- `Doc pipeline: research.md + impact.md → plan.md → …` — `impact` has not been a
  document type since format 3; it is `files`.
- `-import` in the skill roster — deleted by commit `130f837`, which is the same
  deletion [[GUI-080]] exists to clean up.
- Deletion of the sentence about the board worktree ("never create, switch or push
  that branch yourself"), and of the one-gated-boundary rule.

So the defect is not cosmetic drift. Connect actively **downgrades** a correct
AGENTS.md to instructions that would misroute any agent reading them — wrong
stages, a document type that does not exist, and a skill that is gone.

**The diff is saved as evidence** at
`…\scratchpad\agents-md-v2-regression.patch` (scratchpad, machine-local — copy
anything you need into the ticket rather than relying on it surviving).
The working tree was reverted with `git checkout -- AGENTS.md`; nothing was
committed.

### What this changes for CORE-023

**Your Q4 asked whether to fix it here or file it separately. It is now answered
by severity: this is not a detector problem, it is an active corruption, and it
must be fixed before any detector ships.** A staleness detector whose own product
writes stale artifacts would flag every GUI-connected repo as its first act —
which is precisely the outcome your Q4 warned about, now demonstrated rather than
predicted.

Ownership, to avoid two tickets editing the same thing:
- **[[SKILL-013]] owns the canonical block body** and is already scoped to rewrite
  it (it must delete the per-profile table, which is both an R1 violation and
  wrong). Its operator note names the three-copy problem explicitly.
- **The one-line fix — point `connect.ts` at the canonical body instead of the
  stale local constant — should land with SKILL-013**, since it is the ticket that
  settles what the canonical body *is*. Filing it separately would mean fixing a
  pointer to a document another in-flight ticket is rewriting.
- **CORE-023 keeps the detection**, and may now cite this reproduction as its
  motivating case rather than a hypothetical.

Record in your research that the three copies are: `scripts/agents-block.mjs`,
`plugins/kanmer/skills/kanmer-setup/SKILL.md` (the literal body), and
`apps/gui/src/main/agentsBlock.ts` (stale v2). Two of the three must stop being
independent copies, or this recurs.
