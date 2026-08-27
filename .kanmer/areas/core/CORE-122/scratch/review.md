---
kind: review-attestation
pr: "289"
head_sha: "7f8414276ca86f582d8a41d55c4d2d0ac94b6d20"
verdict: pass
reviewer: "claude-core122-independent-reviewer"
independent: true
plan_hash: "eb00094044d0a040"
ticket_updated: "2026-08-27T14:52:48.672Z"
board_sha: "7f4d1e07dafb4b41cd95eb437842a4f9b64a4261"
threads_snapshot: 0
findings:
  - id: F-001
    severity: blocker
    summary: "Required check kanmer-gate was red at 7f841427 (run 33084574539 job 98560597132) only because remote kanmer-board (origin 3935fdcc) was stale (CORE-122 backlog, CORE-121 blocker, no review record). Operator synced kanmer-board to 7f4d1e07 and re-ran the job (98585807593): kanmer-gate now passes at the same head."
    disposition: fixed
  - id: F-002
    severity: minor
    summary: "Merged Review + fail/pending required checks still recommends MOVE_TO_VERIFYING with REQUIRED_CHECKS_NOT_GREEN kept as a warning (packages/core/src/reconciliation.ts:88-106). Does not violate FRD-028 'never bypasses required checks': the recommendation is advisory (advisory: true, no apply surface, nothing in core or the server consumes it as authority), the PR is already merged so GitHub's required-check gate already ran, and RECORDED_COMMIT_UNREACHABLE / EVIDENCE_INCONCLUSIVE still block. Open-questions Q2 records the owner decision."
    disposition: accepted-risk
    reason: "Advisory-only output; GitHub merge already enforced required checks; any future apply surface (HZN-008 item 6) must re-evaluate this route before acting."
  - id: F-003
    severity: note
    summary: "git grep applyReconciliation is not literally empty: one attribution comment survives at packages/core/src/reconciliation.test.ts:5. No code, export, tool or store method exists; tools/list is 38 with reconcile_ticket only and smoke asserts apply_reconciliation is absent."
    disposition: rejected-with-reason
    reason: "Comment-only provenance note with no behaviour; the acceptance claim (no apply surface) holds."
  - id: F-004
    severity: note
    summary: "The ticket body's three '## Verification' checkboxes remain unticked although the checklist (16/16) and tests cover each of them."
    disposition: accepted-risk
    reason: "Cosmetic; the checklist document is the gated record. kanmer-verify can tick them on the merge SHA."
---

## Independent review of PR #289 at 7f8414276ca86f582d8a41d55c4d2d0ac94b6d20 (replacement attestation)

Replaces version 10913dd4b956c7ec after the F-001 remedy. Reviewer is a distinct agent role from the implementer (claude-code, lane 2). No source, PR, thread or branch mutation was made by the reviewer. Plan version `eb00094044d0a040`; ticket `updated` 2026-08-27T14:52:48.672Z (unchanged); board worktree HEAD 7f4d1e07 (= origin/kanmer-board); origin/main dc514375; head unchanged; zero PR review threads (GraphQL reviewThreads empty); `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`. One issue comment from chatgpt-codex-connector (usage limit, no review content) — not a finding.

## Changes reviewed against plan and FRD-028

Diff: 18 files, +1859/-403, exactly the plan's expected-files table; do-not-modify files (`store.ts`, `merge-gate.ts`, `check-pr.mjs`, `pr.yml`, `kanmerGit.ts`) are untouched (`git diff --quiet` confirms).

- Classifier `packages/core/src/reconciliation.ts`: hard refusals first (BOARD_WORKTREE_PROTECTED :53, RELEASE_EVIDENCE_PRESERVED :57, EVIDENCE_INCONCLUSIVE :61-70), then advisory warnings pushed without returning (:74-92), then Review routes (:94-109) with RECORDED_COMMIT_UNREACHABLE still blocking merged Review (:96-99), closed-unmerged → MOVE_TO_IMPLEMENTING (:103-106) — fixes CORE-113 F-016 / GH-3867261023 and the missing-worktree merged-recovery thread. Non-Review stages keep the warnings as stops (:112). Pure: input copied by `stableEvidence`. No hash/proposal id; every recommendation carries `advisory: true` (:29).
- Collector `packages/mcp-server/src/reconciliation.ts`: `gitOptions`/`ghOptions` (:49-55) put `timeout`/`maxBuffer` on every `run` call (sourceRepository :156, requiredChecksFor :166, pr view :196, git status :242, symbolic-ref :253, reachability :272-275); killed child → `unavailable` (:170). Identity via injected `resolveCommonDir` defaulting to exported `gitCommonDirectory` (physical realpath) and `sameWorktreePath` (:246-249) — CORE-113 F-007 preserved; cross-repo URL refs fail closed (:140-147). Claim block (:301-311) derives `claimState(item, now, board.claimExpiryMinutes ?? DEFAULT)` with `live → current`, `expiresAt`, `controller = claim_controller ?? assignee`, identical to `execution-packet.ts:503-506`. `release.state: not-applicable`; proof requires full metadata. No `applyReconciliation`, no store write, no activity entry.
- Registration `packages/mcp-server/src/index.ts:647-657`: `reconcile_ticket`, `readOnlyHint: true, openWorldHint: true`, input `id` only. Public API: `packages/core/src/index.ts` adds `export * from "./reconciliation.js"` keeping `review-attestation.js`; no Proposal/Action exports.
- Counts consistent at 38: AGENTS.md:404, docs/manual/connect.md:145, smoke.mjs, smoke-protocol.mjs:160, chapters.generated.ts, tool-reference.md:25; bundle `plugins/kanmer/mcp/kanmer-mcp.cjs` regenerated.
- Proof TOCTOU (CORE-113 F-015) is moot: no apply surface.

## Acceptance checks run independently (cwd .worktrees/core-122 at 7f841427)

- `npm test -w @kanmer/core -- reconciliation` — 30/30 pass.
- `node --test packages/mcp-server/src/reconciliation.test.mjs` — 8/8 pass (bounded options on every call; stalled gh → unavailable + EVIDENCE_INCONCLUSIVE; real linked worktree → matches-claim; foreign repo → foreign-repository; dry-run leaves item and activity unchanged).
- `node packages/mcp-server/src/smoke.mjs` — 257/257.
- `npm run plugin:check` — "38 tools match, bundle bytes match, isolated MCP handshake lists 38 tools".

## Required checks at head (branch protection requires `verify` and `kanmer-gate`)

- `verify` — pass (run 33084574539, job 98585809425).
- `kanmer-gate` — pass (run 33084574539, job 98585807593, re-run after board sync to 7f4d1e07).

## Verdict and residual risk

Independent pass: diff matches the bounded packet and report, FRD-028 dry-run obligations met, both required checks green at the reviewed head, no open blocker/major. Residual risk: F-002 route must be revisited before any apply surface exists (HZN-008 item 6).
