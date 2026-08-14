# Kanmer v2 — upgrade roadmap

The successor roadmap to `docs/plans/kanmer-upgrades/` (phases 1–8, shipped). Where that roadmap built the format-2 store, the MCP surface, the Windows app, and the first skills, **v2 turns the document pipeline into a configurable, governed system** and hardens the surfaces around it: a real document hierarchy with hard gates, repo-level PRD/FRD/ADR governance, a popped-out ticket UI, multi-project tabs, more agent providers, background dispatch, and a rationalised skill/tool set.

## The one idea

**The ticket is still the governing unit — but its *documents* now have structure, requirements, and provenance.** Today every ticket has the same five docs and one hard gate (proof before the last stage). v2 makes the doc set **per-area configurable**, gives docs a **hierarchy** (`research`+`impact` → `plan`+`checklist` → `post-implementation-report` → `proof`), enforces **per-area hard gates** between stages, links tickets to **repo `/docs/` governance** (PRD/FRD/ADR) and to their **commits/PRs/deployment**, and lets agents keep **scratch notes** as they work. Everything else in v2 follows from making that model real and usable.

## Locked decisions

| Decision | Choice |
|---|---|
| Where PRD/FRD/ADR live | The repo's own **`/docs/`** tree (version-controlled). Tickets reference them by path (`refs:`). The per-ticket pipeline stays in `.kanmer/areas/<area>/<id>/`. |
| Gating | **Configurable hard gates in core** (generalize the single proof gate), per area — and the whole doc model (types, hierarchy, gates) is **fully user-customizable** via `board.docs` + the Phase 4 editor; the defaults below are only a starting point. Default late gates: **`post-implementation-report` before Review** (the reviewers' brief), **`proof` before Done** (verification evidence on merged main — preserves today's proof-before-final-stage boundary exactly). |
| PRD/FRD/ADR gate | **Standard, on by default:** leaving Backlog requires a governing-doc link (`refs`) **or** the `docs_todo` "new doc to be created" flag. `kanmer-setup` can disable it for repos that decline a `/docs/` tree. |
| Stages | **7-stage default:** Backlog → Researching → Planning → Implementing → Review → Verifying → Done, with an **additive backfill migration** for existing boards. **Merge point:** Review pass → merge → Verifying (verification runs on merged main). |
| `due` field | **Removed** entirely (added in kanmer-upgrades Phase 6; reversed here). |
| Traceability | Tickets gain **`commits`/`prs`** and a **board-gated `deployment` status** (off for non-cloud projects). `deployment` is a **flat string**: `n/a` \| `not-deployed` \| `<env-id>`. |
| Doc-model source of truth | `board.yml` (`board.docs`). `docs/contributing/doc-structure.md` is a generated/descriptive mirror, never authoritative. |

## Phases

| Phase | Title | Package | Requests |
|---|---|---|---|
| 0 | [Baseline](phase-0-baseline/current-architecture.md) — document today's undocumented architecture | docs | — |
| 1 | [Core doc model](phase-1-core-doc-model/plan.md) — doc types, hierarchy, hard gates, stages, refs, scratch, traceability, remove `due` | `@kanmer/core` | 2,3,4,5,6,11,13,16 |
| 2 | [MCP tools](phase-2-mcp-tools/plan.md) — tool delta (+4), dynamic docs, gate enforcement | `@kanmer/mcp-server` | 2,3,5,13,16 |
| 3 | [GUI containers](phase-3-gui-containers/plan.md) — ticket popout, document full-container, add-ticket dialog | `@kanmer/gui` | 1,15,16 |
| 4 | [GUI settings](phase-4-gui-settings/plan.md) — tabbed fixed-size settings + Documents/gates editor | `@kanmer/gui` | 9,16 |
| 5 | [Multi-project tabs](phase-5-gui-multi-project/plan.md) — per-project contexts + tab strip | `@kanmer/gui` | 8 |
| 6 | [Agents: connect](phase-6-agents-connect/plan.md) — opencode/grok/antigravity + install plugin/skills | `@kanmer/gui` (main) | 7,12 |
| 7 | [Agents: dispatch](phase-7-agents-dispatch/plan.md) — background ticket dispatch | `@kanmer/gui` (main) | 10 |
| 8 | [Skills & onboarding](phase-8-skills-onboarding/plan.md) — 13-skill roster, PRD/FRD/ADR onboarding, [rationalization](phase-8-skills-onboarding/rationalization.md), [`/docs/` template](phase-8-skills-onboarding/docs-template.md) | `plugins/kanmer` | 2,5,13,14 |

## Request → phase map (all 16)

| # | Request | Phase(s) |
|---|---|---|
| 1 | Ticket popout window (click-behind closes) + document full container | 3 |
| 2 | Built-in areas + per-area customizable doc types + hierarchy | 1, 8 |
| 3 | Per-ticket scratch folder | 1, 2 |
| 4 | Doc hierarchy + required-before gating + `planning` stage | 1 |
| 5 | `open-questions` + `post-implementation-report` docs | 1, 8 |
| 6 | Remove `due` field | 1 |
| 7 | opencode / grok / antigravity connect support | 6 |
| 8 | Multiple projects with tabs | 5 |
| 9 | Settings redesign (tabs, fixed size, fix squish, more) | 4 |
| 10 | Dispatch a ticket to a background agent | 7 |
| 11 | Better board stages | 1 |
| 12 | Connect installs plugin + skills, not just the MCP server | 6 |
| 13 | Tickets link PRD/FRD/ADR (or create them) | 1, 8 |
| 14 | Greenfield full-repo onboarding + `/docs/` template | 8 |
| 15 | Full add-ticket dialog | 3 |
| 16 | Ticket commits/PRs + board-gated deployment status | 1, 3, 4, 8 |

## Sequencing

```
1 ──► 2 ──►┬─► 3 ─┐
           ├─► 4 ─┼─► 5 ─────────► (features wrapped in multi-project)
           └─► 6 ─┴─► 7
2 ─────────────────────────────► 8   (skills freeze after tool signatures stable)
```

**Phase 1 is the keystone** — the `board.docs` schema, frontmatter fields, and gate engine that Phases 2/4/8 all consume. Build it first and freeze its signatures. GUI features (3, 4) are built single-project against a `ProjectClient` facade, then Phase 5 wraps them in multi-project with minimal component churn. Connect (6) precedes dispatch (7). Skills (8) rewrite only after the Phase 1/2 tool surface is stable. **Each phase is an independently shippable PR** and carries its own `## Verification` per AGENTS.md §10.

## Conventions

- Each `plan.md` follows the `kanmer-upgrades/phase-*/plan.md` house style: **Goal**, **Depends/Feeds**, sized **Items** (S/M/L), **Release rail** (the tool-reference + bundle-rebuild + `plugin:check` obligations from AGENTS.md §7), and **Verification**.
- The `board.docs` schema is **defined once in Phase 1** and referenced (never redefined) elsewhere.
- Field-name canon: `refs` (repo-doc paths), `docs_todo` (link-or-create deferred), `commits`, `prs`, `deployment`. Frontmatter keys are additive/optional and omitted-when-unset, so existing files gain zero noise on rewrite (AGENTS.md §4).
