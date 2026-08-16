# Proof

PR [#17](https://github.com/collisionengineers/kanmer/pull/17), merged on GitHub.
Verified on the merged base after fast-forwarding.

## Checks

| Check | Result |
|---|---|
| `verify:agents-block` | **26/26** — the AGENTS section survived the rewrite intact |
| Residue grep (`researching`, `impact.md`, `kanmer-import`, `format: 2`, "three modes") | **0** |
| Managed block in the diff | untouched — the only apparent hit was the frontmatter `description`, checked line by line |

That last check is the one that mattered: this rewrite replaced everything above
the AGENTS section while leaving that section byte-identical, and the two are in
the same file. `verify:agents-block` would have caught a slip, but the diff was
read as well rather than trusting the check alone.

## The original defect, gone

`get_status` on this repo returns `format: 3`. The old mode table had entries
for format 1 and format 2 only, so format 3 matched nothing. There is no mode
table now — the loop runs the same six steps whatever the format, and step 3
migrates only if there is something to migrate.

## Not proven, and one of these is structural

**Prose cannot be unit-tested.** The greps prove the skill says nothing false.
They cannot prove an agent following it behaves correctly. The three defects
fixed across SKILL-001/004/005 were all found by *running* skills, which is a
standing warning that reading is not enough.

**Step 5b is the risky instruction.** "One ticket per plan item" is a judgement
against documents whose structure varies. The `N documents → M items → K
tickets` preview is the only guard, and a preview only guards if the agent stops
at it.

**Step 2 (version steps) has no mechanism.** No Kanmer version declares any, and
there is no manifest of per-version actions for the skill to read. It is
currently an instruction to a human reader rather than something executable —
honest as written, but it will need a real mechanism the first time a version
actually requires a step. Flagged in the report; worth its own ticket then.

**Issue ingestion was not exercised.** This repo's issues are not being migrated,
so the close sequence in 5a has never run. It is the most dangerous path in the
skill and it is verified only by reading.
