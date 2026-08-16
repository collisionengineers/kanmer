# 2.3 Prompt SSOT

- Extract the `take-ticket` prompt text (`index.ts:797-821`) into a shared `takeTicketPromptText(id)` in `@kanmer/core`, imported by both the MCP prompt and Phase 7's `dispatch.ts`, so the two never drift.
