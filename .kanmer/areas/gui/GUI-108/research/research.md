# Research — GUI-108

## Question

Why does a GUI board move that is rejected by a document gate leave the user with an agent-facing error, and what is the smallest safe way to make the next action obvious?

## Findings

- The board already calls the main-process `CH.getGateStatus` path to tint/describe gated columns. The renderer must continue consuming that authoritative result rather than importing or reimplementing core gate rules.
- The shared move path in `App.tsx` optimistically moves a card and, on rejection, currently leaves only the generic error banner. The failed drop already has a pointer location in the board event, so the feedback can be anchored without a new IPC channel.
- Current core-shaped rejection text identifies the target boundary and missing requirements (including `questions-resolved`), but it is not actionable for a GUI user. A renderer-only parser can translate that stable shape into a target stage, boundary, and document action while passing unrelated failures through unchanged.
- `Editor.tsx` already owns the ticket document inventory and the existing create-document affordance. Selecting the missing document there reuses the established full-container editor and avoids a parallel document-creation path.
- The safe implementation surface is `Board.tsx`, `App.tsx`, `Editor.tsx`, renderer styles, and focused renderer tests. No core gate logic, IPC contract, or MCP tool needs to change.
- Related history: GUI-009 established the readiness/getGateStatus path; GUI-023 specified anchored human recovery copy and an Open-missing-document action; GUI-087 corrected wording-only formatting but did not implement the anchored interaction. This ticket closes that remaining interaction gap.

## Scope decision

Implement a small pure gate-feedback mapper, forward the existing drop anchor, show an anchored actionable popover only for parsed gate failures, and open the selected missing document through the existing editor. Preserve the existing generic error path for non-gate or unrecognised errors. Real Electron drag/drop visual inspection is not available in this run and remains INCONCLUSIVE.
