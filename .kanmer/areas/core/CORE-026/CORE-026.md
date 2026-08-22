---
id: CORE-026
type: ticket
title: 'Sources: let a project declare which MCPs, plugins and llms.txt to prefer'
status: review
area: core
assignee: core026-executor
profile: feature
stageEntered:
  preparing: '2026-08-20T20:30:12.790Z'
  review: '2026-08-22T08:51:37.124Z'
taken_at: '2026-08-22T08:32:18.405Z'
branch: core-026-project-declared-sources
worktree: .worktrees/core-026
labels: []
groups:
  - HZN-006
  - HZN-007
links: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - fab7b4994b5b0c4f2eaf07a919cf6b6e06e7e763
  - e0a046be0e488d8ed3adeb5c0278341052a2c945
  - 8eff8482926d29f7c80211b768fcffbb22d399d5
  - b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477
  - e794cbf742f6103cee015d11ef51b867915445a1
prs:
  - '163'
  - '165'
archived: false
created: '2026-08-16T18:26:15.208Z'
updated: '2026-08-22T16:52:34.040Z'
---

## What

A **sources** system: a project declares the external references it trusts —
an MCP server, an installed plugin, a docs site's `llms.txt` — and Kanmer's
skills give those preferential treatment when researching and planning.

## Why

An agent working an Azure ticket in a repo where the Azure MCP and Microsoft
Learn are already connected has no reason to reach for a general web search
first — but nothing tells it that. The connections exist; the *preference* does
not. So the best available source is used only when the agent happens to think
of it, which is not a mechanism.

Sources are inherently per-project: the right ones for an Azure repo are wrong
for a React one. That is what makes this configuration rather than something
baked into a skill.

## Approach

- **The data model first.** Where sources live (`board.yml` is the existing
  project-config home), what a source is (kind, identifier, when it applies),
  and how a skill asks "what should I consult for this?"
- **Consumption is research and planning, not implementation.** The user's
  framing is worth keeping literally: for a skill about writing an API, you
  invoke it and use its guidance to *write the plan* — you do not re-invoke it
  while typing each function. Sources shape `research` and `plan`; they should
  not become a per-edit ceremony.
- **`llms.txt` needs its own answer.** It is a file, not a tool: something must
  fetch it, decide how deep to follow its links, and cache the result. Crawling
  guidance is part of the deliverable, not an afterthought — an unbounded crawl
  is the obvious failure mode.
- **Discovery vs declaration.** Kanmer can see the MCP servers a provider config
  registers. Proposing them and letting the user confirm beats asking them to
  hand-write a list.
- Respect ADR-0009: this is a *tool/config* surface that skills consult, not a
  set of rules restated in prose. `get_status` or a dedicated call, not a
  paragraph in every skill.

## Verification

- [ ] A project can declare sources, and they survive setup reconciliation.
- [ ] A research run in a repo with a declared source demonstrably consults it
      before falling back to general search.
- [ ] An `llms.txt` source is fetched with a documented, bounded crawl depth.
- [ ] Removing a source stops it being consulted — no stale preference.
- [ ] Needs a governing doc: this is a new capability with no FRD.

## Outcome
