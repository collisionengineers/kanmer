# Post-implementation report

PR [#18](https://github.com/collisionengineers/kanmer/pull/18). 14 templates
touched, 2 new.

## File changes

| Path | Change |
|---|---|
| 11 existing templates | Identity line inserted at line 3. |
| `kanmer-research/assets/files-template.md` | Rewritten — Impact → Files, two tables. |
| `kanmer-execute/assets/proof-visual-template.md` | **New** (FRD-006). |
| `kanmer-execute/assets/proof-test-template.md` | **New** (FRD-006). |
| `kanmer-execute/assets/proof-template.md` | Points at both variants. |
| `kanmer-tickets/assets/ticket-template.md` | `profile` + `groups`; `priority` dropped. |

## Against the governing docs

**FRD-014 R1** — every shipped template names its type and its nearest
confusion, in a fixed shape so the requirement is checkable rather than
asserted. **R3** — the files template has the two sections and explains the
contrast between them.

**FRD-006** — proof flavours get their own templates. The visual one exists
partly to stop the soft warning firing needlessly: core warns when a
`proof:visual` requirement finds no images under `proof/`, so a template that
never mentions the location manufactures warnings.

## Closed a loose end I created

SKILL-001 renamed `impact-template.md` to `files-template.md` so the rewritten
skill's reference would resolve, and left the contents saying "Impact". Called
out at the time as SKILL-002's; done here rather than quietly forgotten.

## For review

**The identity lines are one-line judgements read far more often than they were
written.** If one draws the distinction in the wrong place it teaches the wrong
thing at scale. `report ↔ proof` and `research ↔ files` are the two worth a
second opinion — the others restate distinctions already in the FRDs, but those
two are my phrasing of a subtler split.

**No "research summary template for deep mode."** The ticket lists one. FRD-005
splits research into quick and deep modes, but the deep-mode *skill* prose is
SKILL-001's territory and landed there without a summary concept, so a template
for it would be a template for nothing. Deliberately skipped rather than
invented; if deep mode grows a summary document it should arrive with the skill
change that needs it.

**No group template.** The ticket mentions "group and ticket template updates".
Groups have no template today — `create_group` takes a title and body directly,
and there is no `assets/` file to update. The ticket's phrasing implies one
exists. Not created, because a template for a two-field entity is ceremony.

## What kanmer-verify should run

The line-3 grep across all templates (no output); `priority` absent from every
template; `files-template.md` free of "Impact"; `verify:agents-block`; full
tests.
