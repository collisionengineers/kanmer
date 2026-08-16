# Post-implementation report

PR [#17](https://github.com/collisionengineers/kanmer/pull/17). One file,
`plugins/kanmer/skills/kanmer-setup/SKILL.md` — a rewrite, because the mode
table *was* the structure.

## Against the governing docs

**ADR-0010** — all four reconcile responsibilities present (version steps,
AGENTS block, migration, ingest); per-**item** plan mining; `custom` + empty
requires for historical tickets; list-then-confirm on issue closing;
idempotency by construction.

**FRD-013** — setup is re-runnable and reports what it did.

## What changed structurally

Three modes → six ordered steps, each a no-op when there is nothing to do.
Greenfield stops being a mode and becomes the branch taken at step 5 when there
is nothing to ingest.

Ingest picks **one** source (issues → plans → commits) rather than running all
three, because each is a different answer to "what is the record of intent
here" and combining them duplicates work.

## Interaction with two changes from this session

- **CORE-012** made `migrate_board` a genuine no-op on a current board, so step
  3 can call it unconditionally. Before that fix, an unconditional call would
  have flapped `version.json` on every setup run.
- **CORE-011** does not affect backfill: it constrains `move_item`, and
  historical tickets are *created* in Done. Verified against `createItem`'s
  documented ungated behaviour rather than assumed.

## For review

**This is prose; the real test is an agent following it, and that cannot be
automated here.** The residue grep and `verify:agents-block` prove it says
nothing false. They cannot prove it produces the right behaviour.

**Step 5b is the risky one.** "One ticket per plan item" is a judgement against
documents whose structure varies. The preview (`N documents → M items → K
tickets`) is the only thing between a misread and a hundred spurious tickets,
and a preview is only a safeguard if the agent actually stops at it.

**Version steps (step 2) are specified but empty.** No Kanmer version currently
declares any, so the step is a placeholder with no mechanism behind it — there
is no manifest of per-version actions to read. It is written as an instruction
to a reader rather than something the skill can execute. Worth its own ticket
when the first real version step exists.

## What kanmer-verify should run

`verify:agents-block` (26/26); the residue grep at zero; confirm the AGENTS.md
section is byte-identical to its pre-change state; read step 5a and confirm the
close sequence has no discretionary language.
