# Research — SKILL-012: where open questions enter the workflow

## Question

Where should unresolved open questions stop a ticket, and by what mechanism —
skill prose, or a real gate? The proposed shape was: research → plan → questions
asked → revise plan → execute once nothing is open.

## Findings

### F1. That proposal is already the board's own structure — it is the `leave-preparing` boundary

Format 3 merged v2's Researching and Planning into one **Preparing** stage
(`packages/core/src/stages.ts:40`, and `kanmer-plan/SKILL.md:21-23` states it
outright: *"Research and planning share that stage… the move you are working
towards is Preparing → Implementing"*).

So "research → plan → ask → revise plan → execute" is not a new sequence to
build. It is entirely inside Preparing, and the moment it describes — *nothing
open, now start coding* — is exactly the `leave-preparing` boundary. The
proposal names a gate that already exists and simply carries no such
requirement.

### F2. The intent is already written down. Nothing enforces it

`kanmer-research/assets/open-questions-template.md:3` — *"these **block** the
plan"*. `kanmer-research/SKILL.md:53` — the ticket is ready for planning when
*"the open questions are answered or explicitly parked"*.

Both are prose. Grepping the whole shipped skill tree for open-questions gives
nine hits, and after the templates and the `docs/product/` ones, the operational
mentions are: `kanmer-research` (writes it), and `kanmer-review:25` (lists it
among documents to read). **`kanmer-plan`, `kanmer-execute`, `kanmer-verify`,
`kanmer-closeout` and `kanmer-auto` never mention it at all.**

### F3. `open-questions` is a legal requirement type — and requiring it would be actively wrong

`DOC_TYPES` (`packages/core/src/profiles.ts:15-23`) includes `open-questions`, so
a profile *may* list it at a boundary. But `statusOf`
(`packages/core/src/gates.ts:78-99`) satisfies a doc requirement from
`ev.hasType(type)` — **existence, not content**.

So `"leave-preparing": [..., "open-questions"]` would mean "you must have written
an open-questions file", and a file consisting of four unanswered questions would
*satisfy* the gate. It would enforce the paperwork and not the rule. Verified
against `get_doc_gates SKILL-012`: no profile carries `open-questions` today, at
any boundary.

### F4. The board's own history shows the soft rule has never once been recorded as resolved

A sweep of all 118 tickets found **three** open-questions documents board-wide:

| Ticket | State | Questions |
|---|---|---|
| GUI-064 | **Done**, shipped v0.3.2 | 4 boxes, **none ticked**. Q1 (MCP respawn timing) genuinely unresolved — proof.md admits the instrumentation printed nothing. Q4 still reads *"Awaiting the user's call"* although MCP-005 was in fact filed. |
| GUI-004 | **Done** (`spike`) | 1 question, explicitly escalated as *"a decision for the user"* setting policy for every research-only ticket. It resolved itself in practice; the doc was never updated and still reads as live. |
| CORE-021 | **Archived** | Opens *"Four for you"* — all four unanswered. One wants its own ADR that does not exist; one has **no recommended answer at all**. Abandoned by archiving, not decided. |

GUI-064 also reached Done with its checklist at 21/23.

The rule is not being bent occasionally. Across every ticket that ever raised a
question, the recorded resolution rate is **zero**. That is the signature of a
rule with no enforcement point, not of careless agents.

### F5. FRD-023 R1 rules out fixing this in skill prose

R1: *"**Derive, don't restate**: no skill contains gate rules; every phase
skill's first steps are get_item + get_doc_gates + read-everything."* The FRD's
own verification section calls R1 "not yet true" and names removing restated gate
prose as the Phase 6 exit criterion.

Writing "refuse to proceed while questions are open" into five skills is adding
five new restatements of a gate rule — the precise thing R1 is trying to delete.
A real requirement, surfaced by `get_doc_gates`, is the design that complies:
skills keep asking the gate and obeying the answer.

### F6. The checkbox convention already exists, and core already parses it

The template uses `- [ ]` per question and has a `## Parked (explicitly
deferred)` section. `getTicketDocsInfo` (`packages/core/src/store.ts:1045-1060`)
already walks every file of a doc type and counts them:

```ts
const m = /^\s*[-*]\s+\[( |x|X)\]/.exec(line);
if (!m) continue;
total++;
if (m[1] !== " ") checked++;
```

So a content check needs no new convention and no new parser — it is the
existing loop pointed at `open-questions/`, with one addition: **stop counting at
the `## Parked` heading**. That makes kanmer-research's "answered or explicitly
parked" mechanically true rather than aspirational, and gives a question an
honest exit that is not just ticking a box you did not answer.

### F7. A gate *implements* FRD-009 R3 rather than conflicting with it

R3, the headless rule: no user available → take the recommended answer, record
question + assumption, *"and stop at the deliverable — never guess **forward**
across a decision boundary."*

Under a `leave-preparing` requirement, a headless run writes its questions,
cannot tick them, and is blocked from entering Implementing. That **is** stopping
at the deliverable. R3 asks for a decision boundary the agent will not cross; the
gate makes that boundary literal instead of honour-system. The ticket body's
worry that this might make R3 unreachable is wrong, and I am correcting it here.

### F8. Two of the three requested stops are boundaries. One is not

| Requested stop | Real boundary? |
|---|---|
| before execution | **yes** — `leave-preparing` (F1) |
| before closing | **yes** — `enter-done` |
| before review *fixes* | **no** |

Review fixes happen *inside* the review stage, on the PR branch; no `move_item`
occurs, so no gate can fire. That stop can only be skill prose in
`kanmer-review`. Worth stating plainly rather than promising enforcement that
cannot exist. A third boundary, `enter-review`, does exist and catches questions
raised during implementation.

### F9. The pseudo-requirement constant is duplicated in the GUI

`GOVERNING_DOC` is declared twice — `packages/core/src/profiles.ts:47` and
`apps/gui/src/renderer/src/lib/profileDraft.ts:25-26`, which validates
requirement strings in the Settings profile editor. Any new pseudo-type must be
added in both, or the Settings editor rejects a profile the core accepts.

## Implications

**Make it a requirement, not prose — `questions-resolved`, a pseudo-type
alongside `governing-doc`.**

- F3 rules out requiring the document; F5 rules out prose; F6 makes the content
  check cheap and already-conventional. That leaves one design.
- Satisfaction: zero unticked `- [ ]` above the `## Parked` heading across the
  files in `open-questions/`. Absent document = satisfied (no questions raised is
  not a failure state).
- Boundaries: `leave-preparing` (F1 — the user's proposed point), `enter-review`,
  `enter-done`. The review-fix stop is prose in `kanmer-review`, honestly labelled
  as unenforceable (F8).

**This is an architectural departure and wants an ADR.** `gates.ts:174-177` is
explicit that gates check *existence*, deliberately: the anti-collapse rule was
built structurally so it "needs no timestamps and so has nothing to be wrong
about". A content-aware requirement is the first gate that reads inside a
document. It is defensible — the parser is a regex over a convention the
templates already ship, and the failure mode is a stuck ticket rather than a
wrong one — but it is a decision, not an implementation detail.

**Profiles must be chosen carefully.** A `spike`'s deliverable *is* research, and
surfacing questions can be the entire point of one — GUI-004 was exactly that.
Giving `spike` an `enter-done` requirement would make the profile
self-contradictory. Proposed: `feature` and `fix` at all three boundaries they
have; `chore` at `enter-done`; `spike` nothing. This changes the shipped profile
table, so it is the user's call.

**Retroactivity is real but small here.** `update_item`'s contract says gates
re-evaluate immediately. On this board only SKILL-011/012 are in flight, so
nothing is stranded — but GUI-064, with four unticked boxes, would be stuck if
ever re-opened. On another board the change could strand tickets mid-pipeline.
The escape is the one the template already documents: tick it, or move it under
Parked with a reason.

## Open questions

Carried in `open-questions` — profile assignment, the ADR, and whether the
answer's provenance must be recorded.
