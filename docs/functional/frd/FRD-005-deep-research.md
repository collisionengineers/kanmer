---
status: draft
covers: v2 research phase (shipped, codebase-centric) + source-agnostic & deep mode (v3)
---

# FRD-005 — Deep research

## Overview

Research is **building whatever relevant material makes the plan good** — wherever the answer lives. The shipped skill was codebase-centric; this FRD widens it and adds a **deep mode** emulating deep-research products: plan the questions, fan out across source classes, synthesize with sources.

## Source classes

- S1. **Pure research** — web search; vendor documentation MCPs (Microsoft Learn, Azure, context7, …).
- S2. **Codebase research** — architecture and behaviour understanding (distinct from `files/`, which is the change map).
- S3. **Live estate research** — what the deployment actually has, what the logs actually say: via connected MCPs **or read-only CLIs** (`az`, `kubectl`, `gh`, …). Read-only is a hard constraint.
- S4. **Reference files** (FRD-004) and linked tickets' prior research.

## Requirements

- R1. Two depths: **quick** (default — answer the ticket's question, record findings with sources) and **deep** (triggered by request or by the skill judging the question broad). Deep mode: (a) write the research questions first; (b) fan out per question/source class — parallel subagents where the host supports them; (c) one doc per topic under `research/` subfolders; (d) finish with `research/summary.md` — the synthesis, every finding carrying its source, the single entry point planning reads.
- R2. Every finding cites its source (file, URL, command, MCP call). Unsourced claims are not findings.
- R3. Questions only the user can answer surface **now** (FRD-009), not at planning time; headless runs record them in `open-questions` content and stop at the deliverable.
- R4. Research remains read-only: no branch, no worktree, no writes outside the ticket folder.
- R5. A `spike`-profile ticket's Done gate is satisfied by this output (FRD-002).

## Acceptance criteria

1. A deep run on a multi-topic ticket produces ≥2 subfolder docs + `research/summary.md`; every finding in the summary has a source.
2. A ticket about Azure behaviour shows Learn/Azure-MCP (or `az`) sourced findings, not speculation.
3. A live-estate question produces only read commands (verified by the recorded command list).
4. kanmer-plan's first act is reading `research/summary.md` when present.

## Related
D42 · FRD-003 · FRD-004 · FRD-009 · FRD-002 (spike).
