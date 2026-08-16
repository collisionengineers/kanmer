# Proof

Branch at `3144b04`.

- `DISPATCH_TASKS` exports the six FRD-010 R1 tasks with stable ids, and
  `dispatchTaskById` resolves them.
- `prompts.test.ts` still passes: the take-ticket text names the ticket id and
  directs the agent to the gate self-check.
- Both consumers compile against it — the MCP `take-ticket` prompt and
  `dispatch.ts` — which is the drift this ticket exists to prevent.
- Full rail: 116 core / 112 GUI, typecheck, smoke 117/117.

**Not proven here:** the GUI task picker rendering these, which is GUI-016.
