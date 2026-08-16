---
id: SKILL-013
type: ticket
title: Carry the hard rules into AGENTS.md and skill prose on reconciliation
status: implementing
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T21:50:56.796Z'
taken_at: '2026-08-16T23:20:18.788Z'
branch: skill-013-hard-rules-and-fix-gate
worktree: .worktrees/skill-013
labels: []
groups:
  - HZN-003
links:
  - CORE-023
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
  - docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
archived: false
created: '2026-08-16T18:25:18.638Z'
updated: '2026-08-16T23:20:18.788Z'
---

## What

When `kanmer-setup` runs against a repo whose Kanmer has been **updated**, the
rules that changed must reach that repo — the AGENTS.md managed block and the
skill prose both. Today the block is refreshed between its markers but its
*content* is a literal that only changes when someone remembers to change it.

## Why

[[SKILL-012]] added a real gate (`questions-resolved`) that no existing repo's
AGENTS.md mentions. ADR-0009 puts the AGENTS block **third** in the contract
hierarchy — above skills, because it is always in context — so a rule absent
from it is a rule most agents never see. Reconciliation is the only moment we
get to fix that on someone else's repo, and it is the moment FRD-013 exists for.

## A finding that has to shape this: fix/chore/spike can skip Review entirely

Measured, not assumed. With every document present and an implementing ticket:

```
fix      implementing -> done   ALLOWED (skips review AND verifying)
chore    implementing -> done   ALLOWED
spike    implementing -> done   ALLOWED
feature  implementing -> done   REFUSED - crosses 2 gated boundaries
```

Only `feature` is forced through Review, because only it has two gated
boundaries for the anti-collapse rule to catch. So for three of four profiles
**`kanmer-review` may never be invoked at all** — nothing in the engine requires
it. Two consequences worth stating plainly:

- The `kanmer-review` open-questions convention is weaker than [[SKILL-012]]
  recorded: not merely unenforceable, but on a `fix` it may never run.
- `proof` for those profiles is written without `kanmer-verify` ever seeing
  merged main, since Verifying is skipped too.

Whether that is correct is a real question. A `chore` arguably *should* be able
to go straight to Done. A `fix` that opened a PR arguably should not. Decide it
here rather than leaving it implied by a rule about boundary counting.

## Also in scope: amend ADR-0011 with the limits its implementation found

[[SKILL-012]] discovered two constraints on `questions-resolved` that ADR-0011
does not state, both found by demonstration rather than by the tests. They live
only in `board.ts` comments and a closed ticket, which is the wrong place for a
rule that constrains future work:

- **Never gate `leave-backlog`.** Questions are raised *during* research, so
  gating entry to the stage where they get worked traps the ticket outside it.
  The first implementation did exactly this and was wrong.
- **Never add a boundary a profile did not already declare.**
  `collapsesPipeline` counts *gated* boundaries, so giving `spike` a gated
  `leave-preparing` and `enter-review` would turn its Backlog → Done jump from
  one gated boundary into three and refuse it — breaking the acceptance case
  FRD-002 exists to protect.

Neither contradicts ADR-0011; they are limits it should have stated. Fold them
in here because this ticket already owns "the rules that changed must reach the
places that state them", and the ADR is one of those places.

Note the second limit is the same mechanism as the Review-skipping finding
above — both are consequences of counting gated boundaries — so whatever is
decided there should be reflected in the ADR in one pass.

## Approach

- Audit which enforceable rules are missing from the AGENTS block, starting with
  `questions-resolved` and the read-everything duty.
- Make reconciliation actually refresh it: `scripts/agents-block.mjs` holds
  `BLOCK_BODY` as a literal that `verify-agents-block.mjs` asserts is
  byte-identical to the copy in `kanmer-setup/SKILL.md`. Any change touches both.
- Amend ADR-0011 with the two limits above.
- Decide and document the Review-skipping behaviour; if it should change, that is
  a profile or stage-contract change and needs its own ADR.
- Keep to ADR-0009: the block states rules; skills point at `get_doc_gates`.

## Verification

- [ ] Running setup against a repo on an older Kanmer refreshes its AGENTS block
      to include rules added since.
- [ ] `verify:agents-block` still passes (both copies byte-identical).
- [ ] ADR-0011 states both limits, and `board.ts` cites the ADR rather than
      being the only place they exist.
- [ ] The Review-skipping behaviour is either documented as intended or changed
      deliberately, with the decision recorded.

## Outcome
