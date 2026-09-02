# Post-implementation report — SKILL-039

*Author claim, before merge.*

## Summary

Implemented the anti-churn amendment for stale review threads and the required independent-verification handoff. Review attestations now distinguish current-head actionable threads from explicitly disposed outdated-head threads, merge gating enforces that distinction, and the Kanmer operating skills consistently require disposition without reopening obsolete conversations.

## Changes

| File | Change | Why |
|---|---|---|
| `.gitignore` | Updated generated-worktree exclusions. | Keep ticket worktrees out of source changes. |
| `AGENTS.md` | Updated the managed operating rule for review findings. | Make disposition, rather than thread churn, the contributor contract. |
| `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md` | Defined stale-thread disposition and verification ownership. | Record the authoritative end-state behavior. |
| `packages/core/src/review-attestation.ts` | Added head-aware review-thread disposition semantics. | Make actionable-versus-outdated state explicit and enforceable. |
| `packages/core/src/review-attestation.test.ts` | Added unit coverage for stale/current thread outcomes. | Prove the attestation rules and failure cases. |
| `packages/core/src/merge-gate.test.ts` | Added merge-gate coverage for disposed outdated threads. | Prove merge eligibility follows the new attestation contract. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated the shipped MCP artifact. | Ship the implementation used by installed clients. |
| `plugins/kanmer/scripts/agents-block-body.mjs` | Updated the plugin-owned AGENTS block source. | Keep generated operating instructions aligned. |
| `scripts/agents-block-body.mjs` | Updated the repository AGENTS block source. | Keep the canonical generated instructions aligned. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Updated controller review/verification handoff wording. | Prevent automated review-thread churn. |
| `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | Required a recorded disposition at closeout. | Preserve traceability through completion. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Defined outdated-thread disposition and current-head requirements. | Give reviewers an executable, non-churning contract. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Updated generated instruction expectations. | Ensure new installations receive the amended rule. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Documented the review-attestation semantics. | Keep the operator reference accurate. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Clarified independent verification responsibilities. | Keep verification separate from review-thread cleanup. |
| `scripts/verify-skill-prose.mjs` | Added prose-contract checks for the amendment. | Detect drift in the coordinated skill wording. |
| `scripts/verify-skill-prose.test.mjs` | Added tests for the new prose checks. | Prove the guard catches missing or regressed pins. |

## Governing docs

FRD-034 was amended as authorized by HZN-008 and this ticket. The implementation also satisfies the independent-review constraints governed by FRD-028.

## Risks and follow-ups

- CORE-119 owns the broader golden-board scenarios A–G; they are not duplicated here.
- The reviewer must exercise the outdated-thread disposition on this PR. The corresponding post-merge checklist item intentionally remains open.
- The first `npm run verify` attempt was interrupted during the long GUI suite and remains recorded as a failed attempt. The identical command then passed at the unchanged commit `444f96052803be32012b26f42e2462e6d82b7ca7`.

## Verification hand-off

At the implementation commit:

- `npm run verify`: PASS (core 829, GUI 538, MCP/HTTP 236 with one Windows platform skip, scripts 168, smoke 383, protocol 54).
- Shipped-bundle `smoke.mjs`: PASS, 383/383.
- Shipped-bundle `smoke-protocol.mjs`: PASS, 54/54.
- `npm run plugin:build`: PASS; regenerated artifacts were already byte-identical.

After merge, verify the exact merged SHA on `main` with `npm run verify` and both shipped-bundle smoke commands.
