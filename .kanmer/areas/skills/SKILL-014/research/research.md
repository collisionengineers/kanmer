# Research — SKILL-014: skill workflows, hand-offs, and stale vocabulary

*The research. Not the files document — this is what I **learned**, not what I will **touch**.*

## Question

Two questions, which turned out to have one answer:

1. Does every skill state an ordered workflow and name the skill it hands off to?
2. Does any skill still speak format-2 — naming a document type, stage or field
   that no longer exists?

## Findings

### The roster is complete and correctly sized

- **Twelve skills**, matching FRD-023's end-state table exactly.
  `plugins/kanmer/skills/` holds 33 files across those twelve.
- **`kanmer-import` is gone** — from the directory *and* from every skill's
  prose. `grep -rn "kanmer-import" plugins/kanmer/skills/` returns nothing.
  FRD-023's removal is complete. The ticket body claimed otherwise when it was
  filed; that claim came from reading the stale install at `.claude/skills/`, and
  is **withdrawn**. No skill routes to a skill that does not exist.

### Numbered workflows: nine of twelve, in three different shapes

Measured by `grep -cE "^[0-9]+\. "` plus the heading structure:

| Skill | Ordered workflow | Shape |
|---|---|---|
| kanmer-setup | yes | `## 1.`–`## 7.` headings |
| kanmer-auto | yes | `## 1.`–`## 5.` headings |
| kanmer-groom | yes | `## 1.`–`## 4.` headings |
| kanmer-closeout | yes | `## 0.`–`## 3.` headings |
| kanmer-research | yes | `## Steps` + 1–6 |
| kanmer-plan | yes | `## Steps` + 1–7 |
| kanmer-verify | yes | `## Steps` + 1–6 |
| kanmer-execute | partial | numbered only *inside* `## Finish`; the start is prose |
| kanmer-review | partial | numbered *within* two sections, not across the skill |
| kanmer-tickets | **no** | topic sections + a routing table |
| kanmer-docs | **no** | topic sections |
| kanmer-report | **no** | two modes, no sequence |

The three shapes are not a defect in themselves — the inconsistency is. An agent
that loads `kanmer-execute` mid-task sees a numbered list that covers only the
last third of the skill, and cannot tell that from a list covering all of it.

### Hand-offs: only three skills end by naming a successor

`kanmer-verify` is the model, and the only one that gets it fully right:

> Hand off to **kanmer-closeout** for git cleanup and recording `commits` / `prs` / `deployment` on the ticket.

`kanmer-research` ends on `kanmer-plan`; `kanmer-docs` ends by naming its caller.
Everywhere else the successor is named **mid-document** and the file ends on
something else — `kanmer-closeout` and `kanmer-execute` end on edge-case and
pausing sections, `kanmer-review` on incoming PR feedback, `kanmer-plan` on a
gate note, `kanmer-auto`/`kanmer-groom` on their reporting steps.

So the information is usually present but never where a reader stops. This is the
concrete mechanism behind the ticket's stated risk.

### The stale vocabulary is confined to one seam

The finding that matters most: **`kanmer-tickets/references/tool-reference.md`
has a current tool table and stale prose beneath it.** The table (lines 11–40)
documents all 29 tools, the six fixed stages, profiles, groups, and even the
`group` filter [[SKILL-011]] shipped two hours ago. Everything below it was never
migrated:

| Line | What it says | Why it is wrong |
|---|---|---|
| 53 | summary fields include `priority` | removed by ADR-0006; also omits `profile` and `groups`, which summaries do carry |
| 65–67 | "Default stages on a fresh board: backlog → researching → planning → …", "older or customised boards commonly differ" | seven v2 stages; format 3's six are **fixed** and a board cannot change them (ADR-0002) |
| 73 | "`priority` — id into the board's configurable priority list" | the field does not exist |
| 107 | "Format-2 boards store **tickets only**" | format 3 |
| 110 | `research.md impact.md plan.md checklist.md proof.md` as flat files | wrong twice: `impact` is not a type, and documents are **folders** in format 3 |
| 119 | "rejected on format-2 boards" | format 3 |

Three more `impact` sites outside it: `kanmer-plan/assets/plan-template.md:5`,
`kanmer-review/assets/pr-review.md:7`, `kanmer-docs/assets/doc-structure.md:26`.
`profiles.ts:17` has no `impact` — the type is `files`.

`kanmer-review/assets/pr-review.md` is stale in a second way: reviews are no
longer pipeline documents at all (`SKILL.md:24` — `set_ticket_doc` rejects them,
they go to `append_scratch`), so the four `kanmer-review/assets/pr-*.md` files
describe documents the tool refuses to write.

The pattern: **what the release rail checks stayed current; what it does not
check drifted.** FRD-023 R5 mechanizes "any tool-surface change updates the tool
reference" — and the tool *table* is exactly the part a tool change makes you
edit. The prose below it is never in the diff.

### One restated rule is not just restated — it is wrong

`kanmer-review/SKILL.md:48`:

> `enter-review` and `enter-done` are gated, so a question raised during
> implementation cannot get past those

False on two counts, both established on [[SKILL-012]] and recorded in its
`proof`:

1. **`fix` and `chore` declare no `enter-review` boundary at all**, so for those
   profiles the sentence names a gate that does not exist.
2. More seriously, it implies protection at the merge. `kanmer-review` merges
   *then* moves — `gh pr merge` is outside the gate engine entirely — so on
   **every** profile, including `feature`, a ticket with an open question has a
   perfectly mergeable PR. Only `enter-done` holds universally.

The paragraph exists to warn that the review-fix rule is unenforceable; it then
overstates what *is* enforced, in the same breath.

### FRD-023 R1 holds, and the exceptions are principled

`grep` for boundary names finds seven hits, none of which is a per-profile
requirement list — which is what R1 forbids:

- **Structural invariants** — "a move crosses at most one gated boundary", "the
  six fixed stages". Properties of the engine, true for every profile, and the
  thing an agent most needs before its first `move_item`.
- **The `questions-resolved` parse rule** in `open-questions-template.md` —
  deliberate under ADR-0011: the checkbox format *is* load-bearing, and the
  template is what teaches it.

No skill says "a feature needs research + files + plan + checklist". The
acceptance grep passes today and the workflow work must not break it.

### One gap in the derive-don't-restate mechanism

Ten of twelve skills call `get_doc_gates`. The two that do not are
`kanmer-closeout` (correct — it runs entirely after Done and moves nothing) and
**`kanmer-review`, which does move the ticket** (`move_item <id> verifying`).
Review is the one stage-moving skill that never self-checks the gate it is about
to cross.

## Implications

- The workflow work is **normalisation, not authorship**: nine skills already
  have an order, three do not, and the successor is usually written down but in
  the wrong place. Move it to the end and make the shape uniform.
- "Every skill names its successor" cannot be literal. `kanmer-report`,
  `kanmer-docs` and `kanmer-tickets` are **service** skills — invoked from
  anywhere, returning to their caller. For those the honest ending is *who calls
  me and where control returns*, not a fabricated successor.
- The sweep is bigger than the four `impact` lines the ticket lists, but it is
  bounded and it is all in one file plus three assets. It is a text change with
  no code behind it.
- `kanmer-review/SKILL.md:48` must be corrected, not merely reworded — it is the
  only place in the roster that states something measurably false.
- Adding `get_doc_gates` to `kanmer-review` closes the last hole in R1's
  mechanism and costs one sentence.
- The AGENTS block is the one change that reaches **every** repo. Both copies of
  `BLOCK_BODY` must move together — `scripts/agents-block.mjs` and
  `kanmer-setup/SKILL.md` — and `verify-agents-block.mjs:146-154` asserts they
  are byte-identical, so the rail catches a half-done edit.

## Open questions

Recorded in `open-questions`. None needs the operator: each is a scope judgement
answerable from FRD-023 and the code, and each is written down with its reason.
