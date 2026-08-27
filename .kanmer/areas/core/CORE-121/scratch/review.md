---
kind: review-attestation
pr: "287"
head_sha: "a79f125c95cad5e1d93ac393a84bb89a7ac5ccc3"
verdict: needs-changes
reviewer: "claude-core121-independent-reviewer"
independent: true
plan_hash: "db3f451125275a35"
ticket_updated: "2026-08-27T11:00:54.345Z"
board_sha: "9a2e06481d92b7116390a10a64a328f9dc48ab52"
threads_snapshot: 0
findings:
  - id: F-001
    severity: blocker
    summary: "Required check kanmer-gate is FAILURE at a79f125c: check-pr.mjs read board branch kanmer-board at 9a2e0648 (synced 10:09Z, before the ticket left backlog) and reports WRONG_STAGE (backlog, expected review) plus NO_REVIEW_RECORD. Not a code defect in the diff; the board branch must be synced/pushed with the ticket in Review and this attestation, then the gate re-run and green before merge."
    disposition: open
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

Independent review; reviewer did not author this work.

## Verified independently (cwd .worktrees/core-121 at a79f125c)

- `npm test -w @kanmer/core -- claims`: 24/24 passed.
- `node packages/mcp-server/src/smoke.mjs`: 252/252 checks passed.
- `npm run plugin:check`: 37 tools match, bundle bytes match.
- `gh pr view 287`: state OPEN, mergeable MERGEABLE, no reviews, no review threads (0 unresolved), one bot comment (Codex usage-limit notice, ignored per workflow).
- Required checks (branch protection contexts: verify, kanmer-gate): **verify = SUCCESS**, **kanmer-gate = FAILURE** (see F-001).

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

See frontmatter. F-001 is the only open item and it is procedural: the hosted kanmer-gate evaluated a stale board branch. Once the kanmer-board branch is synced with the ticket in Review and this attestation, the gate must be re-run; if it goes green, a replacement attestation with verdict `pass` at the same head is warranted, since no code change is required.

## Residual risk

Self-declared actor identity (F-002/F-003) and immediate expiry of legacy claims (F-004) are known, recorded trade-offs of the bootstrap contract pending CORE-115/SKILL-036/SKILL-037. Merge authorization was not granted in this run; no merge or move performed.
