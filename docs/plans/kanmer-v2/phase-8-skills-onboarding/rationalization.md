# Skills & tools rationalization

Opinionated answers to the five meta-questions, with before→after tables. Companion to [`plan.md`](plan.md).

## Q1 — Should our skills be amended? **Yes, substantially.**

Every stage-referencing skill is touched for the 7 stages + gates + scratch + `refs`. The roster's core usability property — **one skill per board transition** (an agent picks by "what am I about to do to this ticket") — is preserved and extended.

## Q2 — Should our tools be amended? **Yes: +4 new, ~6 changed, 0 removed (20 → 24).**

| Before | After | Action | Why |
|---|---|---|---|
| `set_ticket_doc` (fixed enum) | dynamic doc, validated against area config | change | per-area doc types; enum can't be static (`index.ts:143`). Error lists valid ids. |
| `get_ticket_doc` (fixed enum) | dynamic doc | change | symmetric read. |
| `move_item` | enforces per-area hard gates | change | refs/plan/report/proof gates; error names the missing doc. |
| `create_item` / `create_items` | + `refs` / `docs_todo` / `commits` / `prs` / `deployment` | change | link governing PRD/FRD/ADR at creation (#13); traceability (#16). |
| `update_item` | + `refs`/`commits`/`prs`/`deployment`; − `due` | change | traceability; `due` removed. |
| `get_status` / `list_board` | surface doc types + gates + deployment-on | change | skills learn the doc model without a bespoke call. |
| — | **`get_doc_gates(id?)`** | new | self-check required docs + gated transitions before `move_item`. |
| — | **`link_doc(id, path, action)`** | new | ticket↔repo-`/docs/` link (distinct from item↔item `link_items`). |
| — | **`append_scratch(id, slug?, content)`** | new | free-form working notes (#3), gate-irrelevant → separate from `set_ticket_doc`; read back via `get_ticket_doc scratch-<slug>`. |
| — | **`migrate_board(dry_run?)`** | new | v1→v2 + 7-stage/docs backfill, previewable; agent-driven upgrades (kanmer-setup) need an MCP path; GUI `CH.migrate` repoints to the same core fn. |

`docs_todo` rides on existing tools (`create_item`/`update_item`); the backfill itself is the one `migrate_board` tool — no further surface bloat. **Tool count 20 → 24.**

## Q3 — Too many skills? Need more? **Not too many; net +1, rebalanced (12 → 13).**

12 isn't bloated — each maps to a distinct trigger. But two real issues: (1) **missing coverage** — the Verifying stage has no owner today and doc governance is scattered; (2) **overlap** — standup and retro read identical data. Fix: add `kanmer-verify` + `kanmer-docs`; merge standup+retro → `kanmer-report`.

| Before (12) | After (13) | Action |
|---|---|---|
| kanmer-tickets | kanmer-tickets | update |
| kanmer-research | kanmer-research | update |
| kanmer-plan | kanmer-plan | update |
| kanmer-execute | kanmer-execute | update |
| kanmer-review | kanmer-review | update |
| — | **kanmer-verify** | **new** |
| kanmer-closeout | kanmer-closeout | update |
| — | **kanmer-docs** | **new** |
| kanmer-setup | kanmer-setup | update |
| kanmer-auto | kanmer-auto | update |
| kanmer-standup + kanmer-retro | **kanmer-report** | **merge** |
| kanmer-groom | kanmer-groom | update |
| kanmer-import | kanmer-import | update |

Do **not** merge research/plan/execute/review/verify — each gates a different transition and loads different templates; merging would force one mega-skill to pull every template into context on every invocation.

## Q4 — Too many tools? Need more? **No; 20 is lean, grow to 24.**

The surface is already ≈1:1 with `KanmerStore` and every tool carries required annotations. The four additions are the minimum to support the doc/gate/scratch/migration model. Resist padding: no separate `get_doc_config` (fold into `list_board`), no separate scratch-read (`get_ticket_doc` reads `scratch-<slug>` via the core whitelist).

## Q5 — Do any need combining? **Skills: yes (standup+retro). Tools: no.**

| Candidate | Verdict | Why |
|---|---|---|
| standup + retro | **combine → kanmer-report** | same four read tools, differ only by time window. |
| research + plan | keep separate | the plan-gate lives between them; merging blurs a hard boundary. |
| review + verify | keep separate | different gates + outputs (PR-review docs pre-merge vs `proof.md` on merged main); review can loop work back, verify only advances. (If forced to 12, verify folds into review — not recommended.) |
| import (PR comments) + review | don't merge; reassign ownership | review owns PR-feedback→tickets; import keeps issue sync. |
| `create_item` + `create_items` | keep separate | bulk is a real atomicity/perf path. |
| `set_ticket_doc` + `append_scratch` | keep separate | docs are typed + gate-relevant; scratch is free-form + gate-irrelevant. |
| `link_items` + `link_doc` | keep separate | item↔item vs item↔repo-file; different validation. |
| `add/update/remove/reorder_column` | keep 4 | distinct verbs; only `remove_column` is `destructiveHint` — combining breaks the annotation split. |

## Per-area default doc-sets (mirrors Phase 1 `docs.default` / `docs.areas`)

| Area | Required docs | Optional | Gate note |
|---|---|---|---|
| **Generic** | governing FRD/ADR link, research, impact, open-questions, plan, checklist, post-implementation-report, proof | scratch | full 5-gate chain (refs → research+impact → plan+checklist → report → proof) |
| **Bugs** | governing FRD/ADR, research (root-cause), plan (fix), checklist, post-implementation-report, proof (regression output) | impact, open-questions | impact optional; regression evidence mandatory in proof |
| **PR review** | pr-changes-summary, pr-comments, pr-comment-disposition, pr-review | — | these *are* the deliverable; disposition complete before leaving Review |
| **UI** | governing FRD, mockups, plan, checklist, live-screenshots, verification-screenshots, post-implementation-report, proof | research, impact | verification screenshots mandatory as proof evidence (images in the ticket's `assets/` subfolder) |
| **Documentation** | target repo doc (PRD/FRD/ADR or `/docs/` page), outline/draft, doc-review | research | lighter chain — configured without report/proof gates (the engine has no conditional gates; a docs ticket that does change code belongs in a code area) |
