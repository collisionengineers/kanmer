# Templates — research

## The rule the ticket sets

Every shipped template's **first line names its type and its nearest
confusion**. That is grep-able, which is why the ticket picks it: a template
whose first line says only "# Research" tells an agent what it is, but not what
it is *not*, and the confusions are the failure PRD-001 problem 4 names
(agents conflating document types).

## Current state, measured

Twelve templates. **None** carries an identity line in the required form.

| Template | First line | Missing |
|---|---|---|
| `files-template.md` | `# Impact — <ticket id>` | Renamed in SKILL-001; content still says Impact. My loose end. |
| `research-template.md` | `# Research — <ticket id>: <topic>` | No contrast with `files`. |
| `plan-template.md`, `checklist-template.md` | title only | plan vs checklist is the commonest conflation |
| `post-implementation-report-template.md` | title only | vs `proof` |
| `proof-template.md` | title only | has good prose, but on line 3 |
| `open-questions-template.md` | title only | vs scratch |
| `ticket-template.md` | mentions `priority` | v2 field |
| PRD/FRD/ADR | title only | the three-way confusion is the whole reason `kanmer-docs` exists |
| `pr-template.md` | title only | vs post-implementation-report |

## The pairs that actually get confused

Not arbitrary. Each is a real failure mode:

- **research vs files** — findings vs surface area. The original v2 names
  (`research.md` / `impact.md`) invited exactly this, and FRD-003 renamed
  `impact` to `files` to make the distinction concrete: one is what you learned,
  the other is what you will touch.
- **plan vs checklist** — reasoning vs executable steps. A plan that is a list
  of boxes has no reasoning; a checklist that is prose cannot be ticked.
- **report vs proof** — claim vs evidence. The report is written by the author
  before merge; proof is gathered on merged `main` after. Conflating them is how
  proof ends up asserting what should happen.
- **open-questions vs scratch** — blocking unknowns vs working notes. Scratch is
  never gated; open-questions is a document a plan must not silently assume past.
- **PRD vs FRD vs ADR** — why/what/how-decided.

## The `files` template needs two sections

FRD-014 R3 and the shape that has actually proved useful across this session's
tickets: a table of files being **changed**, and a second table of **context
files** — what an implementer must read to avoid a trap, and what each tells
them. The second table is the one that carries the value; without it the
document is a diff preview.

## Proof types

FRD-006 gives proof flavours (`proof:visual@staging`). A single proof template
cannot serve a visual proof and a test-output proof equally, since one wants
screenshots under `proof/` and the other wants pasted output. Per-type
templates, with the base template pointing at them.

## `groups` and `profile`

The ticket template lists frontmatter fields and still names `priority`. It
needs `profile` and `groups`, and must drop `priority`.
