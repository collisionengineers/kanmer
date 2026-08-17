---
id: SKILL-019
type: ticket
title: Stop Codex loading duplicate repo-local and plugin Kanmer skills
status: preparing
area: skills
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-17T02:16:05.204Z'
labels:
  - codex
  - plugins
  - skill-discovery
  - install
links: []
refs:
  - docs/functional/frd/FRD-023-agent-skills-system.md
  - docs/functional/frd/FRD-012-connect.md
archived: false
created: '2026-08-17T02:15:59.805Z'
updated: '2026-08-17T02:16:05.204Z'
---

## Problem

Codex exposes both unqualified Kanmer skills from the repository-local `.agents/skills/` tree and plugin-qualified `kanmer:` skills from the installed plugin cache. The same workflow is therefore duplicated, can drift between copies, and an unqualified invocation may execute different prose from the installed plugin.

## Desired outcome

Codex has one intentional Kanmer skill surface per connected repository, with explicit ownership and no duplicate workflow names. Reconciliation and Connect preserve that invariant without breaking other supported agents.

## Verification

In a connected Kanmer repository, enumerate the skills available to Codex and confirm each Kanmer workflow is exposed once from the intended source. Confirm Claude and other supported-provider installation paths still receive the files they require.

## Outcome
