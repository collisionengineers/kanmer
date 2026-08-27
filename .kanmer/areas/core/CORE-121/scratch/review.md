---
kind: review-attestation
pr: "287"
head_sha: "a79f125c95cad5e1d93ac393a84bb89a7ac5ccc3"
verdict: pass
reviewer: "claude-core121-independent-reviewer"
independent: true
plan_hash: "db3f451125275a35"
ticket_updated: "2026-08-27T11:00:54.345Z"
board_sha: "f0e899a738e39ff1a0da818b02b6021ead48b5cb"
threads_snapshot: 0
findings:
  - id: F-001
    severity: blocker
    summary: "Required check kanmer-gate was FAILURE at a79f125c because check-pr.mjs read a stale kanmer-board (9a2e0648) showing the ticket in backlog. Board branch synced/pushed (202c3b91 and later); the job was re-run at the same head and kanmer-gate = success, verify = success."
    disposition: fixed
  - id: F-002
    severity: minor
    summary: "Implicit operator reason is keyed on store actor === \"gui\" (store.ts:815). The MCP server sets the actor from client-declared clientInfo/_meta names (index.ts:178-186, 398), so any MCP client naming itself \"gui\" gets attestation-free Review -> Implementing. Equivalent in power to passing reason \"operator: ...\", which the plan already accepts as a conduct rule (SKILL-037)."
    disposition: accepted-risk
    reason: "v0.3.12 has no operator identity; the plan (Required changes 3) and open-questions explicitly accept a string-prefix operator override policed by skill conduct. The gui-actor path adds no new bypass beyond that. Durable identities are CORE-115/SKILL-036."
  - id: F-003
    severity: minor
    summary: "renew/transfer ownership checks trust a caller-supplied assignee: take_ticket action renew passes assignee ?? actorName (index.ts:1233), so a client can renew or receive a foreign claim by naming the owner. Smoke relies on this (smoke.mjs renews as ctl-a from client smoke)."
    disposition: accepted-risk
    reason: "Same self-declared-identity trust model as existing take_ticket assignee and the packet's assignee === actor check on origin/main; hardening belongs with durable run identities (CORE-115/SKILL-036)."
  - id: F-004
    severity: note
    summary: "Legacy claims become transferable once taken_at + claimExpiryMinutes has passed, so on merge every currently taken ticket (including CORE-121 itself, taken 10:15Z) is immediately transferable by any other client. Intended per open-questions (FRD-030 one-migration-path) but operators should know."
    disposition: accepted-risk
    reason: "Explicit design decision recorded in open-questions; expiry never mutates state and transfer is audited."
  - id: F-005
    severity: note
    summary: "Local scripts rail (antigravity-plugin-config.test.mjs, 2 failures) reproduces on untouched origin/main in this Git-Bash shell; hosted required check verify is SUCCESS, which is the authoritative result."
    disposition: rejected-with-reason
    reason: "Environment-only failure per author and hosted CI; not attributable to this PR."
---

# Review — CORE-121 / PR #287 @ a79f125c

Independent review; reviewer did not author this work. This replaces the earlier `needs-changes` attestation (version 05c20e41d04f34c6) at the same head after F-001 was resolved.

## Verified independently (cwd .worktrees/core-121 at a79f125c)

- `npm test -w @kanmer/core -- claims`: 24/24 passed.
- `node packages/mcp-server/src/smoke.mjs`: 252/252 checks passed.
- `npm run plugin:check`: 37 tools match, bundle bytes match.
- Re-gather before this attestation: `gh pr view 287` state OPEN, `mergeable: MERGEABLE`, `headRefOid` a79f125c95cad5e1d93ac393a84bb89a7ac5ccc3; `gh pr checks 287`: **kanmer-gate = pass**, **verify = pass** (run 33065438808, re-run jobs 98506660292 / 98506661971); review threads: 0; reviews: none; one Codex usage-limit bot comment (not part of the workflow).
- Required contexts on `main` are exactly `verify` and `kanmer-gate`; both green.

## Diff vs plan and governing docs

- Scope matches the packet: 11 files, no `gates.ts`, `check-pr.mjs`, workflow, dependency or format change; tool count 37; existing smoke strings are additions only.
- `claimState` (types.ts): `claim_expires_at` else `taken_at + minutes`; unparseable timestamps stay live; `expiresAt < now` is expired. Correct, tested.
- `transferTicket` (store.ts): `CLAIM_NOT_TAKEN`, `CLAIM_LIVE` unless expired or substantive `operator:` reason; preserves `taken_at`/`branch`/`worktree`; activity `take/controller from->to` plus `## Transitions` line. Tested including file-untouched-on-refusal.
- `renewTicket`: `CLAIM_NOT_OWNED` unless assignee or controller. Tested.
- Backward-move rule lives in `backwardMoveEffects`, invoked from both `updateItem` (before any write) and `assertMoveAllowed` (before `computeOrder`); test asserts siblings' `order`/`updated` untouched on refusal. Review -> Implementing: attestation must be valid, `needs-changes`, and `pr` equal to an entry in `prs` or a URL suffix `/<pr>` (`"/1286".endsWith("/286")` is false, so no prefix confusion). Budget: `round >= budget` refuses non-operator; operator override sets `review_round = round+1` and, only when exhausted, `remediation_budget = round+1`. Arithmetic checked against the test (round 2 / budget 2).
- Execution packet: refusal order unchanged (non-ticket, legacy, spike, leave-preparing, questions, taken-but-not-implementing, `unsafeTakenWorktree`, then occupancy); expired foreign claim gets the transfer remedy, live keeps the byte-identical existing message; `claim_controller === actor` may resume; `claim` block added to the ready packet.
- `KEY_ORDER` inserts the four keys after `worktree`; round-trip test asserts order.
- tool-reference.md accurately describes the new actions, `reason`, error codes and fields.
- Governing docs: FRD-030 bootstrap subset (explicit expiry config, no transfer of live claim, old/new controller recorded, worktree pointer never deleted, one legacy migration path) met; FRD-034 AC3/AC5 contract-level (same-PR return only via needs-changes attestation; budgeted loops) met.

## Findings and dispositions

See frontmatter. F-001 fixed by board sync and gate re-run at the same head; no code change was required. No open blocker or major finding remains.

## Residual risk

Self-declared actor identity (F-002/F-003) and immediate expiry of legacy claims (F-004) are known, recorded trade-offs of the bootstrap contract pending CORE-115/SKILL-036/SKILL-037. Merge authorised by the operator for this run; merge SHA is recorded by kanmer-verify.
