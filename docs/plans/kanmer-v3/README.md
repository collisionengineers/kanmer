# Kanmer v3 roadmap — right-sized workflow, groups, standardized board

Master overview. Governance docs: `docs/product/prd/PRD-001` + `docs/architecture/adr/ADR-0001…0010` + `docs/functional/frd/FRD-001…024` (land in Phase 0). Decision trail: the [shaping record](shaping.md) (47 decisions, 8 rounds).

| Phase | Title | Package(s) | Size | Depends |
|---|---|---|---|---|
| 0 | [Governance docs & verification](phase-0-governance/plan.md) | docs | S–M | — |
| 1 | [Connect rework](phase-1-connect/plan.md) — codex project scoping + universal project skills | gui (main) | M | — |
| 2 | [Core format 3](phase-2-core-format3/plan.md) — **keystone**: fixed stages, profiles, folder docs, proof types, priority removal, migration | core | L | 0 |
| 3 | [Groups + MCP surface v3](phase-3-groups-mcp/plan.md) | core, mcp-server | M–L | 2 |
| 4 | [GUI: the new board model](phase-4-gui-board/plan.md) — migration prompt, fixed columns, profiles UI, gate feedback, reference files, **themed context menus** | gui | M–L | 2 |
| 5 | [GUI: groups, backlog, dispatch, manual](phase-5-gui-groups-backlog-help/plan.md) | gui | L | 3, 4 |
| 6 | [Skills, templates & setup](phase-6-skills-setup/plan.md) — skills freeze only after tool signatures stabilize | plugins/kanmer | L | 3 |
| 7 | [Self-adoption](phase-7-self-adoption/plan.md) — this repo's board migrates to format 3 (7.1 runs at the Phase-4 release, ahead of the rest), history backfilled, labels → epic groups | repo | M | 4 (7.1), 6 (rest) |

Adopting **any other** repo (existing board or fresh) is the repo-agnostic [adoption playbook](adoption-playbook.md) — no project-specific instructions exist anywhere in this roadmap.

## FRD → phase map

| FRD | Phase(s) |
|---|---|
| 002 profiles, 003 documents, 006 proof, 007 stages, 008 priority | 2 (core), 3 (tools), 4 (GUI), 6 (skills) |
| 001 groups | 3 (core+tools), 5 (GUI), 6 (groom migration) |
| 004 reference files | 2 (storage), 3 (tools), 4 (GUI) |
| 005 deep research, 009 questioning, 013 setup, 014 guidance, 023 roster | 6 |
| 010 dispatch, 011 backlog, 024 manual, 019 R6 context menus | 4/5 |
| 012 connect | 1 |
| 015–023 backfill | 0 (verify), then living docs |

## Operating mode — dogfooding starts at Phase 0, on v2

Kanmer's repo already has a working v2 board, gates, and the 12-skill roster. **This roadmap is built on it.** Phase 0 seeds the roadmap onto the existing board (item 0.4); from then on, every phase item is worked as a ticket through the shipped v2 pipeline — research.md + impact.md → plan.md + checklist.md → proof.md, gates enforced by the current release. The phase plans below are therefore **briefs that spawn tickets**, deliberately not per-file implementation specs: each ticket's depth comes from its own research/impact/plan documents, produced by the existing skills against the current tree. Phase labels (`v3-phase-2` etc.) stand in for groups until Phase 7 converts them to epic groups on format 3.

## Sequencing

```
0 ──► 2 ──►┬─► 3 ──►┬─► 5 ─┐
1 ─────────┘        │      ├─► 7 (self-adoption; 7.1 at the Phase-4 release) ──► steady state on v3
           └─► 4 ───┴──────┘
2,3 ───────────────────► 6 ─┘
```

Phase 1 is independent and hurts daily — ship first or in parallel with 0. Phase 2 is the keystone; freeze its signatures before 3. Skills (6) rewrite last, per the standing convention. **Each phase is an independently shippable PR** with its own Verification per AGENTS.md §10.

## Conventions

House style per phase plan: **Goal**, **Depends/Feeds**, sized **Items** (S/M/L) with file anchors, **Release rail** (tool-reference + `plugin:build` + `plugin:check` + `verify-agents-block` obligations, AGENTS.md §7), **Verification**. Field canon additions: `groups`, `profile`, `requires`; removals: `priority`, `due` (already gone). The profiles/board schema is defined once in Phase 2 and referenced elsewhere.
