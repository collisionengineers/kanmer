# Setup as reconciliation — research

## Observed failing, not inferred

Running `/kanmer-setup` on this repo produced the wrong answer. `get_status`
returns `format: 3` with 41 items; the skill's mode table only knows
`format: 1` (upgrade) and `format: 2` (already set up), so format 3 matches
**nothing**. It fell through to "already set up — switch to kanmer-tickets",
which is right by accident, not by rule.

Worse, the skill's terminal step would have run `agents-block.mjs` and, before
SKILL-005, written v2 operating instructions over a v3 repo. Setup's final act
was a regression.

## The model is wrong, not just the numbers

ADR-0010 replaces three modes with **one reconcile loop**: every run brings
reality into Kanmer, idempotently. Modes are a branch taken once; reconciliation
is a thing you re-run after every Kanmer update, which is why the ADR makes
"run setup after updating Kanmer" the standing instruction.

Patching `format: 2` → `format: >= 2` would leave the skill structurally wrong:
still one-shot, still with no ingest, still unable to answer "what changed since
last time".

## The four things a reconcile run does

From ADR-0010 and FRD-013:

1. **Version steps** — apply anything a Kanmer upgrade requires. This is why the
   run is repeatable rather than a first-time action.
2. **AGENTS block** — refresh it. Idempotent already (`agents-block.mjs` only
   rewrites between the markers), and now correct after SKILL-005.
3. **Migration** — if the board predates format 3, `migrate_board` with
   `dry_run: true` first. CORE-012 made a second run a genuine no-op, so
   reconciliation can call it unconditionally.
4. **Ingest** — GitHub issues, plan documents, or commit history: whatever
   exists that is not already on the board.

## Ingest is the dangerous part

Closing GitHub issues is destructive and **external** — it changes state outside
the repo, for other people. The ticket says list-then-confirm, never silent, and
that is the one instruction in this skill that must not be softened into
"confirm if unsure".

Idempotency is the other half. A second run must not re-import. The mechanism
ADR-0010 implies is a recorded source link per ticket, checked before creating —
`refs` cannot hold a URL (it validates repo-relative paths that must exist), so
the source belongs in the body as a stable marker, searchable with
`search_items`.

## Per-item plan mining, and why profile `custom` with an empty map

Historical work becomes **done** tickets — one per plan *item*, not per
document, because the items are what seed the board's areas and become the
template for future tickets.

Those tickets have no research, no checklist, no report. Under any shipped
profile they would be permanently gate-debt. `custom` with an empty
requires-map is the only profile that asks for nothing, which is exactly right
for work that finished before the board existed. Creation is ungated
(`create_item` states it), so they can be born in Done without moving.

Checked against CORE-011: creating directly into Done crosses no boundary,
because gates apply on `move_item`, not creation. Backfill is unaffected by the
one-gate rule.

## Stage proposals must go

Greenfield step 4 still offers to customise stages. Format 3 fixes them. What
varies per ticket is the **profile**, so that is what a greenfield run should be
proposing instead — SKILL-001 corrected the stage sentence, but the surrounding
flow still treats board shape as negotiable.
