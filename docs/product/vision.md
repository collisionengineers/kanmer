---
status: draft
---

# Kanmer — vision

**Kanmer is a kanban where AI agents and a human share one dataset.** Agents work through a local MCP server; the human reviews and steers through a desktop GUI; both operate on a `.kanmer/` folder of Markdown files inside the project — the single source of truth, synced by watching the disk. Neither side talks to the other; the files are the conversation.

## Principles

1. **Evidence over assertion.** Done means verified. Every ticket that changes something ends with proof gathered on merged `main`. A board where "done" means "the agent says so" is worse than no board.
2. **Right-sized ceremony.** Requirements scale with the nature of the work (profiles). A feature earns the full pipeline; a chore earns a plan and a screenshot; a spike's research *is* the deliverable. Ceremony that outweighs the work teaches agents to produce junk documents.
3. **Structure over prose rules.** Wherever a rule can live in the system (a gate, a folder, a tool description), it does not live in words an agent can drift on. Folder containment defines document type; the server enforces gates; skills derive rules from tools instead of restating them.
4. **The board reflects reality — including the past.** Setup reconciles whatever exists (issues, plan documents, history) into the board, and completed work is documented as if it had always been governed (backfilled done tickets; backfilled FRDs/ADRs). Future features depend on accurate pre-existing documentation.
5. **The human decides; agents execute.** Genuine uncertainty on a decision the user owns is never silently resolved — agents ask, batched, with recommendations. Headless agents record assumptions and stop at safe boundaries.
6. **Local-first, host-agnostic.** Everything works offline in a folder; any MCP-capable agent host is a first-class citizen; contract layers degrade gracefully by host capability.

## What Kanmer is not

Not a SaaS, not multi-tenant, not a time-boxing/ceremony tool (no sprints as shipped semantics), not a replacement for git or GitHub — it closes issues it ingests precisely because it refuses to be a second source of truth.
