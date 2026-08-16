# Checklist — SKILL-012

## Core

- [ ] Extract the checkbox counter out of `getTicketDocsInfo` into a reusable helper (`packages/core/src/store.ts`)
- [ ] Helper stops counting at a `## Parked` heading (case-insensitive, tolerates the "(explicitly deferred)" suffix)
- [ ] `QUESTIONS_RESOLVED` constant in `profiles.ts` beside `GOVERNING_DOC`
- [ ] `validateProfileMap` accepts it — otherwise every board carrying it fails validation
- [ ] `EvidenceProbe` gains `unresolvedQuestions()`; every implementer updated, tests included
- [ ] `statusOf` branches on it before the `hasType` path; absent document = satisfied
- [ ] `DEFAULT_PROFILES`: requirement added at `leave-preparing` / `enter-review` / `enter-done` on every profile that has each boundary (`spike` → `enter-done` only)

## GUI

- [ ] `profileDraft.ts` accepts the new pseudo-type (it duplicates `GOVERNING_DOC`)
- [ ] Readiness panel renders a requirement with no document to link to

## Skills — `plugins/kanmer/skills/`, NOT `.claude/skills/`

- [ ] `kanmer-plan`: ask, then revise the plan, before the Preparing→Implementing move
- [ ] `kanmer-review`: do not apply fixes while questions are open — stated as a **convention**, since no `move_item` occurs there
- [ ] `kanmer-auto`: report a lane that stopped on a question **as such**, not as a generic failure
- [ ] `kanmer-research`: closing paragraph points at `get_doc_gates` instead of asserting the rule
- [ ] `open-questions-template.md`: `## Parked (explicitly deferred)` documented as **normative**

## Tests

- [ ] Parser: unticked blocks; `[x]` and `[X]` clear; `*` bullets counted
- [ ] Parser: questions below `## Parked` ignored
- [ ] Parser: several files under `open-questions/` summed
- [ ] Parser: no document returns 0; prose without boxes returns 0
- [ ] **Exact-string test on `## Parked`** (ADR-0011 consequence — renaming it must fail loudly)
- [ ] Gate: unsatisfied at each of the three boundaries; satisfied when clear; profiles without it unaffected; `blockedBy` names it
- [ ] Validation: accepted by `validateProfileMap` and by `profileDraft`
- [ ] Integration on real data: GUI-064's `open-questions/` reads 0; a fixture copy with one box re-opened reads 1

## Docs & rail

- [ ] FRD-009: enforcement requirement added, R3 restated (dispatch is for work with no open questions)
- [ ] FRD-002: requirement type + profile-table change
- [ ] Release note: existing boards inherit on upgrade; name the escape (tick, or park with a reason)
- [ ] `npm run plugin:build`, regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` **committed**
- [ ] Verification run: `npm test`, `typecheck`, `typecheck -w @kanmer/gui`, GUI build, `smoke:protocol`, `plugin:check`, boot smoke (this box produces proof.md)
- [ ] Demonstration: `get_doc_gates` shows `questions-resolved` unsatisfied on a ticket with an open question, and `move_item` refuses naming it

## Progress notes
