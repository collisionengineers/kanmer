---
id: SKILL-013
type: ticket
title: Carry the hard rules into AGENTS.md and skill prose on reconciliation
status: done
area: skills
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T21:50:56.796Z'
  review: '2026-08-17T00:07:51.597Z'
  verifying: '2026-08-17T00:09:52.970Z'
  done: '2026-08-17T00:15:11.723Z'
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
  - docs/architecture/adr/ADR-0014-fix-gains-enter-review.md
commits:
  - 8d9d8f904e2f4c77870ce60bb3d39f2a0127c0c2
prs:
  - '56'
archived: false
created: '2026-08-16T18:25:18.638Z'
updated: '2026-08-17T00:15:53.569Z'
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

- [x] Running setup against a repo on an older Kanmer refreshes its AGENTS block
      to include rules added since. *Partially — see `proof` §"What this run does
      NOT prove". The block is correct, all three writers emit the same bytes, and
      `verify-agents-block` exercises insert/refresh/idempotence in a sandbox. A
      real third-party upgrade was not run.*
- [x] `verify:agents-block` still passes (both copies byte-identical). *28/28,
      up from 26 — and `includes()` is now equality of the fenced region.*
- [x] ADR-0011 states both limits, and `board.ts` cites the ADR rather than
      being the only place they exist.
- [x] The Review-skipping behaviour is either documented as intended or changed
      deliberately, with the decision recorded. *Changed for `fix` (ADR-0014),
      kept for `chore` and `spike`, all four measured.*

## Outcome

Shipped in **PR #56**, squash-merged as `8d9d8f9`. Both halves in one PR, at the
operator's decision.

**The gate change.** `fix` gained a gated `enter-review`
(`post-implementation-report`) — *a fix that opened a PR should not merge
unreviewed*. Applied in `DEFAULT_PROFILES` (new boards) **and** as a resolve-time
injection in `resolveProfiles` (every existing board), kept as a function separate
from the `questions-resolved` pass because the two obey opposite rules. Measured
on all four profiles before and after: **exactly five cells changed, all `fix`**;
`chore` and `spike` keep their one-jump to Done; both FRD-002 acceptance cases
survive. **ADR-0014** records it, and it is the first change authorised to cross
ADR-0011's second limit.

**The prose.** The AGENTS block lost its per-profile requirement table — an R1
violation that omitted `fix`, the default profile — and gained four invariants no
tool reports. Nine skills gained "the board worktree is not yours" (was in 1 of
12, absent from all four that run git) and "a move crosses at most one gated
boundary" (was in 3 of 12). Six profile-to-document claims were removed, two of
them measurably false.

**The three-copy problem, which was a live bug.** The GUI's copy of the block had
drifted to a v2 body and Connect wrote it over real repositories, including this
one during this run. The body now lives once, in `scripts/agents-block-body.mjs`.

**The check.** `scripts/verify-skill-prose.mjs` — SKILL-014's script, committed at
last, widened at both its measured holes, plus a check for the half of R1 a
deletion check cannot see. On the release rail. Validated against the pre-change
tree: 8 violations there, 0 after.

**Honest costs**, in `proof`: the block got **longer** (+273 bytes), against my
plan's prediction, and I declined the pre-registered fallback with a reason. And
check 7 was revised twice after seeing its output — guarded by validating every
revision against the failing tree, not the passing one.

**Follow-ups filed:** [[CORE-028]] (two ADR-0013s on main, + a duplicate-number
rail check), [[CORE-029]] (AGENTS.md §4 still documents v2's seven stages),
[[MCP-018]] (`plugin:check`'s worktree guard tests path, not resolution).
