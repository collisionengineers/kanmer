# Proof

Commit `130f837`, merged into `v3-phase-minus-1-prework`, pushed, PR
[#15](https://github.com/collisionengineers/kanmer/pull/15). Verified on the
merged base in the main checkout.

## The exit criterion, run

The ticket names it: a grep for hardcoded gate rules returning zero.

```sh
grep -rnE "researching|impact\.md|pr-changes-summary|pr-comment-disposition|kanmer-import" \
  plugins/kanmer/skills/*/SKILL.md
```

Three hits, all accounted for:

- `kanmer-setup:112,114` — inside the AGENTS.md managed block. SKILL-005's
  territory; `verify-agents-block.mjs` asserts byte-identity with
  `scripts/agents-block.mjs`, so touching one alone fails the build.
- `kanmer-tickets:3` — "researching a ticket", the verb.

`docs_todo` and `link_doc` are excluded from the grep deliberately. Both are
live; sweeping them would have removed the governing-doc escape from seven
skills. Confirmed present in **7** skills after the sweep.

## Counts

| Check | Result |
|---|---|
| `ls plugins/kanmer/skills \| wc -l` | **12** |
| README skill rows | **12** |
| `verify:agents-block` | 26/26 — the block was not disturbed |

## Rail, on the merged base

- `npm test` — core **127**, gui **136**
- `smoke.mjs` **120/120** · `smoke:protocol` **26/26**
- `plugin:build` + `plugin:check` — 29 tools match, bundle bytes match

## Not proven, and one of these matters

**`plugin:check` cannot verify what this ticket mostly changed.** It compares
tool *names* and bundle bytes. The `move_item` description and its
`tool-reference.md` row were matched by hand; a drift between them would pass
every automated check in the repo. That is a real gap in the release rail, not
a gap in this work.

**No skill was executed end to end after the sweep.** The rewrite is verified by
grep, counts and the build — not by an agent following the new text. The three
defects this ticket fixed were all found by *running* a skill, which is a fair
warning that reading is not enough. `kanmer-research` and `kanmer-auto` changed
most and are the likeliest to hide a fresh mistake.

**A freshly set-up repo still receives v2 operating instructions**, because the
AGENTS block is out of scope here. SKILL-005 is now the highest-value remaining
skill ticket for that reason.
