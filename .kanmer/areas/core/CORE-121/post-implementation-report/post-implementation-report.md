# Post-implementation report — CORE-121

## Delivered

The bootstrap ownership and backward-move contract on the stable v0.3.12 line, with no new tool (37), no board format bump, no dependency change and `gates.ts` untouched.

| File | Why |
| --- | --- |
| `packages/core/src/types.ts` | Optional frontmatter `claim_expires_at`, `claim_controller`, `review_round`, `remediation_budget`; board `claimExpiryMinutes`; `TakeTicketInput.controller`; `TransferTicketInput`; `UpdateItemPatch.reason`; pure `claimState()` and `isOperatorReason()` with `DEFAULT_CLAIM_EXPIRY_MINUTES = 30`. |
| `packages/core/src/frontmatter.ts` | The four claim keys in `KEY_ORDER` after `worktree`. |
| `packages/core/src/review-attestation.ts` (new) | `parseReviewAttestation()` mirroring `check-pr.mjs` field validation so CI and the store accept the same `scratch/review.md`. Exported from `index.ts`. |
| `packages/core/src/store.ts` | `takeTicket` stamps expiry/controller; `releaseTicket` clears them; new `transferTicket` (`CLAIM_LIVE`/`CLAIM_NOT_TAKEN`; keeps branch/worktree/taken_at; audit + Transitions) and `renewTicket` (`CLAIM_NOT_OWNED`); `backwardMoveEffects` applied in both `updateItem` and `assertMoveAllowed` (before `computeOrder`): reason required, Review → Implementing bound to a needs-changes attestation for a PR in `prs` or an `operator:` reason, `review_round`/`remediation_budget` enforcement, `status-reason` activity row and `## Transitions` append via `setDoc(append)`. |
| `packages/core/src/claims.test.ts` (new) | 22 cases: state classification, attestation parsing, take/transfer/renew/legacy/compat, backward-move refusals and budget, GUI-actor behaviour, frontmatter key order round trip. |
| `packages/mcp-server/src/execution-packet.ts` | `claim` block on the ready packet; expired foreign claim refuses with a `transfer` remedy; the recorded controller may resume. Live-claim refusal text unchanged. |
| `packages/mcp-server/src/index.ts` | `take_ticket` actions `take\|release\|transfer\|renew` with `controller`/`reason`; `move_item` `reason`. |
| `packages/mcp-server/src/smoke.mjs` | 12 new checks (claim block, expiry stamp, live/expired transfer, renew, expired packet refusal, resumed packet after transfer, backward move with/without reason, Transitions record). |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Documents the new actions, `reason`, and the claim/budget fields. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated bundle (`npm run plugin:build`; `plugin:check` green). |

## Governing docs

- **FRD-030 — Meets (bootstrap subset):** explicit testable expiry configuration; a live competing controller cannot transfer or renew; transfer records old/new controller and never touches dirty work or the worktree pointer; legacy `taken_at` claims get one migration path (expire from `taken_at`). Lease ids, heartbeat and batch mode remain CORE-115.
- **FRD-034 — Meets AC3/AC5 at contract level:** an in-scope correction returns the same ticket/PR to Implementing only via a needs-changes attestation; `review_round`/`remediation_budget` refuse an unauthorised second loop; an operator override is explicit and recorded. Skill conduct is SKILL-037.
- No ADR: no architectural boundary changed.

## Deviations (recorded in `scratch/execution.md`)

1. Attestation parsing lives in a new core module rather than inside `store.ts`; tests live in a new `claims.test.ts`.
2. The plan's "every backward move needs a reason" broke two existing store tests that move backwards without one — exactly what the Electron GUI does on a drag. The GUI constructs the store with the default actor `"gui"`; that actor is the human at the board, so its backward moves carry the implicit reason `operator: moved on the board`. Every MCP actor must pass `reason`. This preserves the v0.3.12 compatibility constraint without weakening the agent-side rule.

## Verification (cwd `.worktrees/core-121`)

- `npx vitest run src/claims.test.ts src/store.test.ts src/frontmatter.test.ts` — **113 passed**, exit 0. First run: 5 failed (the two GUI-style backward moves, one test creating a standalone plan item, two enter-review gate misses in my tests); all fixed in code/tests, retained in scratch.
- `node packages/mcp-server/src/smoke.mjs` — **252/252**, exit 0.
- `npm run plugin:build && npm run plugin:check` — **plugin-sync OK — 37 tools match, bundle bytes match**, exit 0.
- `git diff --check` — clean.
- `npm run verify` attempt 1 — exit 1: everything green except MCP `test:http` `src/http.test.mjs:65` with `spawnSync node.exe ETIMEDOUT` (2 s child spawn under load). Retained.
- `npm run verify` attempt 2 — exit 1: core **347/347**, GUI **486/486**, MCP HTTP **107/107**, smoke/protocol/docs/plugin rails green; scripts **118/120** — `scripts/antigravity-plugin-config.test.mjs` "quote-free launcher…" and "shipped installer shim…" fail with `EBUSY rmdir …\Kanmer Test Space\Kanmer\bin` / immediate `cmd.exe` spawn failure. `node --test scripts/antigravity-plugin-config.test.mjs` on the **untouched `origin/main` checkout (`ea8a6408`) fails the same two tests** in this Git-Bash session, so this rail is **INCONCLUSIVE locally**, not a regression. The hosted `verify` job (windows-latest, native shell) is the authoritative run for it.

## Risks and follow-ups

- Expiry is wall-clock based; a controller that runs a long command without renewing can be transferred out from under it after 30 minutes. FRD-030's running-command protection is CORE-115. SKILL-037 should make execute renew on resume and before long commands.
- `claim_controller` defaults to the MCP client name; durable run identities arrive with SKILL-036/CORE-115.
- `check-pr.mjs` still carries its own copy of the attestation validation; CORE-123 should import `parseReviewAttestation` from core.

## For kanmer-verify (on the merged SHA)

- `npm run verify` on the merged target (hosted or a native Windows shell) — the scripts rail must be green there.
- `node packages/mcp-server/src/smoke.mjs` — 252/252.
- Manually: on a copied board, take a ticket, edit `claim_expires_at` into the past, call `get_execution_packet` from another client name → refusal names `transfer`; `take_ticket action: "transfer"` succeeds and keeps branch/worktree; `move_item` review → implementing without an attestation is refused, with a needs-changes attestation succeeds and sets `review_round: 1`.
