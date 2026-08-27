# Plan — CORE-121: bootstrap ownership and backward-move contract

## Objective

On the stable v0.3.12 line, make a stuck ticket recoverable without `force`: claims expire, an expired (or operator-authorised) claim can be transferred while keeping its branch/worktree, an owner can renew, and Review → Implementing is a sanctioned, audited move bound to a `needs-changes` attestation with a per-ticket remediation budget — with `get_execution_packet` resuming that work on the same worktree.

## Starting state

- Claims: `taken_at`/`branch`/`worktree`/`assignee`, no expiry (`packages/core/src/store.ts:862-926`); `force` is the only override and deletes `worktree`.
- Backward moves: `boundariesCrossed` returns `[]` for `to <= from` (`gates.ts:166-172`); `assertMoveAllowed` (`store.ts:775-791`) checks only existence/CAS/stage; no reason, no owner, no audit beyond best-effort activity.
- Packet: refuses `taken_at && status !== "implementing"` and foreign `assignee` unless exact `resume{branch,worktree}` (`execution-packet.ts:462-501`); live and dead owners are indistinguishable.
- Frontmatter is `.passthrough()` with `KEY_ORDER` (`types.ts:378-428`, `frontmatter.ts:5-58`): new optional keys survive on the installed GUI.
- Attestation schema validated only in `check-pr.mjs:51-88`.
- MCP: `take_ticket` `action: take|release`; `move_item` has `expected_updated`, no `reason`; 37 tools.

## Governing docs

- FRD-030 — **Meets** (partial, bootstrap): expiry is explicit configuration (`claimExpiryMinutes`, default 30); a live competing controller cannot transfer or renew (`CLAIM_LIVE`/`CLAIM_NOT_OWNED`); transfer records old/new controller and never deletes dirty work or the worktree pointer; legacy `taken_at` claims get one migration path (expire by `taken_at + window`). Lease ids, heartbeat and batch mode are deliberately left to CORE-115.
- FRD-034 — **Meets** AC3/AC5 at the contract level: an in-scope correction returns the same ticket/PR to Implementing only via a `needs-changes` attestation; `review_round`/`remediation_budget` refuse a second unauthorised loop. Skill-level conduct is SKILL-037.
- No ADR: no architectural boundary changes (no new tool, stage, format, or engine).

## Required changes

1. `types.ts`: optional frontmatter `claim_expires_at` (timestamp), `claim_controller` (string), `review_round` (non-negative int), `remediation_budget` (positive int); board config optional `claimExpiryMinutes` (positive int, default 30); `TakeTicketInput` unchanged for `take`; new `TransferTicketInput { assignee; controller?; reason? }`, `RenewTicketInput { actor }`; `MoveOptions.reason?`.
2. `frontmatter.ts`: add the four keys to `KEY_ORDER` after `worktree`.
3. `store.ts`:
   - `claimState(item, now, minutes)` → `"unclaimed" | "live" | "expired"` using `claim_expires_at`, else `taken_at + minutes`.
   - `takeTicket`: set `claim_expires_at`, `claim_controller = input.controller ?? input.assignee`; unchanged otherwise.
   - `transferTicket(id, input)`: refuse `CLAIM_LIVE: …` unless `claimState === "expired"` or `reason` starts with `operator:`; keep `taken_at`, `branch`, `worktree`; set `assignee`, `claim_controller`, new `claim_expires_at`, `updated`; activity `take` with `field: "controller", from, to`; append `## Transitions` entry to `scratch/execution.md` (`setDoc` append) naming from/to/reason/expiry.
   - `renewTicket(id, actor)`: refuse `CLAIM_NOT_OWNED: …` unless `assignee === actor` or `claim_controller === actor`; extend expiry; activity update `claim_expires_at`.
   - `assertMoveAllowed`/`updateItem` backward rule for tickets when `stageIndex(to) < stageIndex(from)`: require `reason` (`BACKWARD_MOVE_NEEDS_REASON`); for `review → implementing`: require a valid `scratch/review.md` (same field validation as check-pr) with `verdict: needs-changes` and `pr ∈ item.prs`, or `reason` starting with `operator:` (`REVIEW_RETURN_NEEDS_ATTESTATION`); refuse `REMEDIATION_BUDGET_EXHAUSTED` when `review_round >= remediation_budget` (default 1) unless operator override, which increments `remediation_budget`; on success increment `review_round`. Every backward move appends a `## Transitions` entry and an activity row carrying `reason`. Raise all of this before `computeOrder`.
4. `execution-packet.ts`: compute `claimState`; foreign **live** claim keeps the existing refusal text; foreign **expired** claim refuses with `… claim expired at <iso>; transfer it with take_ticket action "transfer" or resume with the exact recorded branch/worktree.`; same-actor expired claim is allowed; ready packet gains `claim: { state, expiresAt, controller, reviewRound, remediationBudget }`.
5. `index.ts`: `take_ticket` `action: take|release|transfer|renew`, optional `reason`, `controller`; `move_item` optional `reason`. Tool count stays 37.
6. Smoke, tool-reference, plugin bundle.

## Expected files

| Action | Path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/types.ts` | schema + input types |
| Modify | `packages/core/src/frontmatter.ts` | KEY_ORDER |
| Modify | `packages/core/src/board.ts` (or wherever `BoardConfigSchema` lives — confirm by grep before editing) | `claimExpiryMinutes` |
| Modify | `packages/core/src/store.ts` | claim state, transfer, renew, backward-move rule, transitions append |
| Modify | `packages/core/src/store.test.ts` | new cases listed in files.md |
| Modify | `packages/mcp-server/src/execution-packet.ts` | expired vs live refusal; `claim` block |
| Modify | `packages/mcp-server/src/index.ts` | schemas/actions |
| Modify | `packages/mcp-server/src/smoke.mjs` | new assertions |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | document actions/reason |
| Generated | `plugins/kanmer/mcp/kanmer-mcp.cjs` | `npm run plugin:build` |
| Inspect | `AGENTS.md` | only if the managed block script requires regeneration; tool count unchanged |

## Do not modify

`packages/core/src/gates.ts` boundary semantics; `conflictError` wording; `stageEntered` first-entry behaviour; `.worktrees/kanmer`; governing docs; GUI code; `merge-gate.ts`/`check-pr.mjs`/workflows (CORE-123); skills' SKILL.md text (SKILL-037); package dependencies; board format version.

## Constraints

- v0.3.12 boards with none of the new fields must behave identically (prove with a fixture test).
- No new MCP tool; refusal strings for the existing live-claim and double-take cases stay byte-identical (smoke asserts them).
- All refusals are thrown `Error`s with a stable code prefix; no new error class.
- Expiry never mutates state on its own; only `transfer` changes ownership.
- Windows-safe: no path or shell work is added.

## Ordered steps

1. `types.ts` + `frontmatter.ts` + board config: add fields/KEY_ORDER/`claimExpiryMinutes`; `npm test -w @kanmer/core -- frontmatter` green.
2. `store.ts` `claimState`, `takeTicket` expiry, `transferTicket`, `renewTicket` with tests (live refused; expired transfer keeps branch/worktree, records from/to, appends Transitions; legacy `taken_at` expiry; renew owner-only).
3. `store.ts` backward-move rule with tests (no reason refused; needs-changes attestation return increments `review_round`; budget exhausted refused; `operator:` override increments budget; forward moves unaffected; refusal raised before `computeOrder` — extend the existing "rejected positioned move leaves siblings untouched" pattern).
4. Compatibility tests: fixture without new fields; serialise/parse round trip key order.
5. `execution-packet.ts` expired/live refusal and `claim` block; `index.ts` schemas; smoke assertions (`take_ticket transfer` refused on live, succeeds on expired via a fixture with an old `taken_at`; packet refusal text; `claim` block present; 37 tools).
6. `tool-reference.md`; `npm run plugin:build`; `npm run plugin:check`.
7. `npm run verify` in the ticket worktree; post-implementation report; checklist ticks; commit `feat(core): add bootstrap claim expiry, transfer and audited backward moves (CORE-121)`; push; open PR with `Kanmer: CORE-121` footer.

## Acceptance checks

- Production callers: `take_ticket` (transfer/renew) and `move_item` (reason) registrations in `index.ts`; `getExecutionPacket` consumes `claimState`.
- Tests prove each Verification box in the ticket body without weakened assertions.
- `npm run plugin:check` proves the bundle matches source; tool count 37.
- `npm run verify` exit 0 recorded in the post-implementation report.

## Commands

- Focused: `npm test -w @kanmer/core -- store`, `npm test -w @kanmer/core -- frontmatter`, `node packages/mcp-server/src/smoke.mjs`
- Rail: `npm run build && npm run plugin:build && npm run verify` (cwd: `.worktrees/core-121`)
- Post-merge (verify phase): `npm run verify` at the exact merged SHA in a detached worktree.

## Failure and deviation rules

Stop and report on: any existing smoke/test string that would need changing beyond the additions listed; a need to touch `gates.ts` semantics; any dependency addition; a board config schema that cannot take an optional key without a format bump. Deviations are recorded in `scratch/execution.md`, not silently redesigned.

## Stop condition

The PR is open at the final head with the post-implementation report written and the ticket moved `implementing → review`. Do not merge, do not start CORE-122/123/SKILL-037.
