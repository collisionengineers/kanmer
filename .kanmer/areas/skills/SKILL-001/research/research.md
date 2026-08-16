# Roster sweep — what is actually stale

Measured, not estimated. 13 skills, 9 already calling `get_doc_gates`, 46
residue hits across 11 files.

## Genuinely stale

| Pattern | Where | Replacement |
|---|---|---|
| `researching`, `planning` stages | research, plan, tickets, auto, groom, report, setup | `preparing` (six fixed stages) |
| `impact.md` as a document | research, plan, review, auto | `files/` — v3's `DOC_MOVES` relocates `impact.md` → `files/impact.md` |
| `priority` / `priorities` | tickets, groom, auto, setup | removed in v3; `ColumnKind` narrowed to `area` |
| `pr-changes-summary`, `pr-comments`, `pr-comment-disposition`, `pr-review` | review | **none exist** — see below |
| `kanmer-import` | its own dir, plus review and tickets cross-refs | deleted, 13 → 12 |
| "Researching → Planning gate" prose | research, setup | `get_doc_gates` |

## Not stale — nearly swept by mistake

`docs_todo` and `link_doc` read like v2 but are both live. `docs_todo` still
satisfies the governing-doc requirement (FRD-002 P4) and `get_doc_gates`
reports it; `link_doc` is still a registered tool. Grepping for "looks v2"
would have removed a working field from seven skills.

## kanmer-review has no valid documents

Its entire 4-doc review set is unrepresentable. v3's `DOC_TYPES` is a fixed
seven — research, files, plan, checklist, open-questions,
post-implementation-report, proof — and `set_ticket_doc` rejects anything else.
Under v2 these came from a per-area doc set on a PR-review board; profiles
replaced that mechanism entirely.

Found by running the skill for real on [[GUI-005]], not by reading it.

Options: fold the review into `post-implementation-report` (wrong — that is the
author's document, and review is meant to be someone else's), add review types
to the vocabulary (a core change, and FRD-003 fixed the folder list
deliberately), or write the review to **scratch**, which is never gated and
exists for exactly this. Scratch is the only one that does not require changing
core or lying about authorship.

## kanmer-auto is wrong twice over

It partitions parallel waves by comparing `impact.md` file tables — a document
that no longer exists at that path. And nothing in it knows about profiles, so
it would drive a `spike` through the full feature pipeline.

## New this session: CORE-011 changes what skills may instruct

A move may now cross at most one gated boundary. Any skill telling an agent to
jump stages is now instructing it to hit an error. Checked: none currently do —
they move one stage per phase — but `move_item`'s **tool description** still
advertises the old freedom, and ADR-0009 makes tool descriptions a higher
contract layer than skills. Fixing the description belongs here, with the sweep,
because it is the same contract statement.

## Exit criterion

The ticket names it: a grep for hardcoded gate rules returning zero. That is
checkable, so it goes in the checklist as a command rather than a claim.
