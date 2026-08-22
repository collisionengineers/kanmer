---
id: SKILL-017
type: ticket
title: Correct kanmer-auto's stopping contract and its serial fallback
status: implementing
area: skills
order: 240
assignee: codex-recovery
profile: fix
stageEntered:
  preparing: '2026-08-20T14:08:58.413Z'
taken_at: '2026-08-22T00:13:04.309Z'
branch: skill-017-auto-stopping
worktree: .worktrees/skill-017
labels:
  - auto
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
commits:
  - a72ea84f
prs:
  - '143'
archived: false
created: '2026-08-16T21:22:59.709Z'
updated: '2026-08-22T00:32:13.310Z'
---

## What

Rewrite the parts of `plugins/kanmer/skills/kanmer-auto/SKILL.md` that let a run
stop halfway and call it a report.

## Why

**Auto means auto.** The run completes every ticket in its roster; the only
legal stop is a question only the operator can answer. A run that reports a
partial roster and waits has failed, and the skill currently makes that look
like success.

Three specific gaps:

1. **§5 reads as a general-purpose exit.** "Finish with a standup-style summary"
   describes the terminal state, but nothing says a partial roster is *not* an
   acceptable place to produce one. A real run stopped at 3 of 22 and reported
   in exactly that format.
2. **§4's serial fallback is unbounded.** "If your host has no subagent
   mechanism, run the same waves sequentially — the lane partition still tells
   you the safe order" hands a 22-ticket roster to a serial walker with no
   resume and no state. The parallel path at least has an implicit bound
   (concurrency ~3, one wave at a time); the serial path has none.
3. **Subagents are presented as a host capability, not as the mechanism.** They
   are what keeps the orchestrator's context small enough to finish a long
   roster in one run — each ticket's work happens in a fresh context and the
   orchestrator sees only a summary. The skill never says this, so an agent with
   subagents available has no reason to prefer them.

## Approach

- State the only legal stops: **roster exhausted**, or **an operator-only
  question**. Name partial-roster reporting as a defect.
- Rewrite §4's fallback to require a `run.md` update after every ticket
  ([[SKILL-016]]), so a run that does span invocations resumes invisibly.
- Say why subagents matter, and what changes when the host lacks them: the run
  *will* span invocations, and `run.md` is what makes that a non-event.
- Keep FRD-023 R1 (derive, don't restate) intact — this is orchestration, not
  gate rules. Nothing here should restate what `get_doc_gates` says.

## Verification

- [ ] The skill names the two legal stops and says a partial-roster report is a
      defect.
- [ ] §4's serial path requires the per-ticket state write.
- [ ] A run that hits a genuine operator-only question stops, quotes it, and
      records it in `run.md` — the one stop that *is* correct still works.
- [ ] FRD-023 R1 still holds: no per-profile requirement list enters the skill.
- [ ] Mirrored into `.claude/skills/` after merge (gitignored install artifact;
      source of truth is `plugins/kanmer/skills/`).

## Outcome
