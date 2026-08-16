# Checklist — SKILL-012

## Core

- [x] Extract the checkbox counter out of `getTicketDocsInfo` into a reusable helper — landed in `docpaths.ts` as `countCheckboxes`, beside the other doc readers
- [x] Helper stops counting at a `## Parked` heading (case-insensitive, tolerates the "(explicitly deferred)" suffix)
- [x] `QUESTIONS_RESOLVED` constant in `profiles.ts` beside `GOVERNING_DOC`
- [x] `validateProfileMap` accepts it — otherwise every board carrying it fails validation
- [x] `EvidenceProbe` gains `unresolvedQuestions()`; every implementer updated, tests included
- [x] `statusOf` branches on it before the `hasType` path; absent document = satisfied
- [x] `DEFAULT_PROFILES`: requirement added at `leave-preparing` / `enter-review` / `enter-done` on every profile that has each boundary (`spike` → `enter-done` only)
- [x] **Added mid-flight:** `resolveProfiles` injects it into the profiles in force, so existing boards inherit — see progress notes

## GUI

- [x] `profileDraft.ts` accepts the new pseudo-type (it duplicates `GOVERNING_DOC`)
- [x] Readiness panel renders a requirement with no document to link to — `Editor.tsx` maps requirements generically; no special-casing exists to break

## Skills — `plugins/kanmer/skills/`, NOT `.claude/skills/`

- [x] `kanmer-plan`: ask, then revise the plan, before the Preparing→Implementing move
- [x] `kanmer-review`: do not apply fixes while questions are open — stated as a **convention**, since no `move_item` occurs there
- [x] `kanmer-auto`: report a lane that stopped on a question **as such**, not as a generic failure
- [x] `kanmer-research`: closing paragraph points at `get_doc_gates` instead of asserting the rule
- [x] `open-questions-template.md`: `## Parked (explicitly deferred)` documented as **normative**

## Tests

- [x] Parser: unticked blocks; `[x]` and `[X]` clear; `*` bullets counted
- [x] Parser: questions below `## Parked` ignored
- [x] Parser: several files under `open-questions/` summed
- [x] Parser: no document returns 0; prose without boxes returns 0
- [x] **Exact-string test on `## Parked`** (ADR-0011 consequence — renaming it must fail loudly)
- [x] Gate: unsatisfied at each of the three boundaries; satisfied when clear; profiles without it unaffected; `blockedBy` names it
- [x] Validation: accepted by `validateProfileMap` and by `profileDraft`
- [x] Integration on real data: a copy of the real board, GUI-064's own `open-questions/` as the fixture — clean, re-opened, and parked
- [x] **Added mid-flight:** `resolveProfiles` injection — existing board.yml, vacuous boundary stays vacuous, no double-add, never `leave-backlog`, no new boundary

## Docs & rail

- [x] FRD-009: R5 added, R3 restated (dispatch is for work with no open questions)
- [x] FRD-002: P4a added; the shipped-profile table updated
- [x] Release note: 0.3.3 section — existing boards inherit on upgrade, escape named
- [x] `npm run plugin:build` **at the repo root**, regenerated bundle committed
- [x] Verification run: `npm test`, `typecheck -w @kanmer/gui`, `smoke:protocol`, `plugin:check`, `verify:agents-block`
- [x] Demonstration: the gate refuses a real move, and the refusal says what to do

## Progress notes

**The demonstration earned its place twice.** Both bugs below passed every test
I had written, and were caught only by running the gate against a copy of the
real board.

**1. "Existing boards inherit" was false as implemented.** `resolveProfiles` is
`board.profiles ?? DEFAULT_PROFILES` (`board.ts`), and every board written by
setup or migration carries its own `profiles:` block — so editing
`DEFAULT_PROFILES` reached **new boards only**, while the ADR and release note
both claimed otherwise. Raised to the operator rather than guessed, since the
three fixes lead to materially different products. Answer: inject at resolve
time. Existing boards inherit, `board.yml` is not rewritten, and the requirement
stays visible in `get_doc_gates` so skills derive rather than restate.

**2. The first injection gated `leave-backlog`, which is backwards.** Questions
are raised *during* research; gating entry to the stage where they get worked
traps the ticket outside it.

**3. And it must not add a boundary a profile did not already declare.**
`collapsesPipeline` counts *gated* boundaries, so giving `spike` a gated
`leave-preparing` and `enter-review` would turn its Backlog → Done jump from one
gated boundary into three and refuse it — breaking the acceptance case FRD-002
exists to protect. Stated cost: `fix` and `chore` declare no `enter-review`, so
for them a question raised during implementation is caught at `enter-done`
rather than at review.

**Rail on `6eadb04`:** core **182** passed (was 159 on main), GUI **202** (was
201), `smoke:protocol` 26/26, `plugin:check` 29 tools + bundle bytes match,
`verify:agents-block` 26/26, `typecheck -w @kanmer/gui` clean.

**The bundle was built at the repo root, not in the worktree** — the trap
SKILL-011 fell into (PR #32, [[MCP-007]]). Verified directly:
`grep -c questions-resolved plugins/kanmer/mcp/kanmer-mcp.cjs` → 1.

**Demonstration output** (copy of the real board; subject GUI-064):

```
as it stands, all 4 ticked:   leave-preparing=OK       enter-review=OK       enter-done=OK
one question re-opened:       leave-preparing=BLOCKED  enter-review=BLOCKED  enter-done=BLOCKED
same question, parked:        leave-preparing=OK       enter-review=OK       enter-done=OK

GUI-064 cannot move from "preparing" to "implementing": leaving Preparing
requires questions-resolved (profile "feature"). … "questions-resolved" is not a
document: open-questions/ still has unticked "- [ ]" lines. Answer them and tick
the box, or move them under "## Parked (explicitly deferred)" with a reason for
deferring, then move.

Control — GUI-069 has no open-questions document: not blocked
```
