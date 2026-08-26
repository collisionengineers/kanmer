# Files

- `packages/mcp-server/src/execution-packet.ts` — distinguish a deliberate resume from competing occupancy.
- `packages/mcp-server/src/index.ts` — expose only the bounded resume input needed by the packet endpoint.
- `packages/mcp-server/src/smoke.mjs` — prove exact-worktree resume and competing-agent refusal.
- `plugins/kanmer/skills/kanmer-execute/SKILL.md` — separate reuse of a resumed worktree from a fresh ticket take.
- `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` — document the bounded resume parameter.
- `scripts/verify-skill-prose.mjs` and `scripts/verify-skill-prose.test.mjs` — enforce the executable resume-skill contract.
- `scripts/agents-block-body.mjs`, `AGENTS.md`, and `plugins/kanmer/skills/kanmer-setup/SKILL.md` — keep the managed contributor convention and shipped mirror aligned.
