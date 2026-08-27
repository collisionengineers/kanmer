# Checklist — CORE-121

- [x] [pre-review] Add `claim_expires_at`, `claim_controller`, `review_round`, `remediation_budget` to `ItemFrontmatterSchema`, `KEY_ORDER`, and `claimExpiryMinutes` (default 30) to the board config schema.
- [x] [pre-review] Implement `claimState` and set expiry/controller in `takeTicket`.
- [x] [pre-review] Implement `transferTicket` (`CLAIM_LIVE` refusal; expired or `operator:` reason; keeps branch/worktree/taken_at; records from/to in activity and `scratch/execution.md` Transitions).
- [x] [pre-review] Implement `renewTicket` (`CLAIM_NOT_OWNED` refusal; extends expiry).
- [x] [pre-review] Implement the backward-move rule in the store (reason required; Review → Implementing needs a `needs-changes` attestation or `operator:` reason; `review_round`/`remediation_budget`; Transitions append; raised before `computeOrder`).
- [x] [pre-review] Store tests for every case above plus legacy-fixture compatibility and key-order round trip.
- [x] [pre-review] `execution-packet.ts`: expired vs live refusal text, same-actor expired allowed, `claim` block in the ready packet.
- [x] [pre-review] `index.ts`: `take_ticket` actions `transfer|renew` + `reason`/`controller`; `move_item` `reason`; tool count stays 37.
- [x] [pre-review] Smoke assertions for transfer/renew/refusals/packet claim block; `tool-reference.md` updated; `npm run plugin:build` and `plugin:check` pass.
- [x] [pre-review] `npm run verify` in `.worktrees/core-121`: all rails green except the scripts rail (118/120), whose two failures reproduce identically on untouched `origin/main` in this shell — recorded INCONCLUSIVE locally, hosted `verify` authoritative; exact outputs in the post-implementation report.
- [x] [pre-review] Commit `a79f125c`, pushed, PR #287 with `Kanmer: CORE-121` footer; move `implementing → review`; stop.
- [ ] [post-merge] Verify at the exact merged SHA; the interim rule in HZN-008 context is replaced by the shipped contract.

## Progress notes

- 2026-08-27: core focused tests 113/113 (`claims.test.ts`, `store.test.ts`, `frontmatter.test.ts`); MCP smoke 252/252 after adding 12 CORE-121 checks. Design correction recorded in `scratch/execution.md`: the GUI store actor carries an implicit `operator:` reason on backward moves so v0.3.12 board drag behaviour is unchanged; MCP actors must pass `reason`. New core module `review-attestation.ts` and test file `claims.test.ts` (recorded deviation from the expected-files table).
- 2026-08-27: PR #287 opened at `a79f125c`.
