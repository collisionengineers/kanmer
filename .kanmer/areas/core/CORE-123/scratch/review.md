---
kind: review-attestation
pr: "288"
head_sha: "8989669316befc635a6a85f6a3271873779ad93d"
verdict: needs-changes
reviewer: "claude-core123-independent-reviewer"
independent: true
plan_hash: "10bbf738251ae5f8"
ticket_updated: "2026-08-27T15:01:13.080Z"
board_sha: "a894217fad1effb5151338d3d2af69d860f7ef12"
threads_snapshot: []
findings:
  - id: F-001
    severity: major
    summary: "regate job can never fire on a kanmer-board push: push-event workflows run from the pushed ref, and origin/kanmer-board contains only .gitignore and .kanmer (no .github/workflows/pr.yml). The ticket's 'pushing kanmer-board triggers a gate run' deliverable is non-functional; only workflow_dispatch (from main) works. Plan failure rule ('regate needs a separate workflow file') applies - route back through execute."
    disposition: open
  - id: F-002
    severity: major
    summary: "syncBoard autostash path commits conflict markers: git rebase --autostash exits 0 when the stash re-apply conflicts ('Applying autostash resulted in conflicts'), leaving UU entries; the second stage() pass then git-adds and commits the marker-laden file and pushes it. Reproduced empirically with plain git. Before this PR the same scenario paused safely; now it corrupts the remote board. Must detect unmerged paths / leftover autostash after rebase and pause (classifySyncFailure never sees this text because the command succeeds)."
    disposition: open
  - id: F-003
    severity: major
    summary: "PR is CONFLICTING against current origin/main a8318ea6 (CORE-122 merged): plugins/kanmer/mcp/kanmer-mcp.cjs bundle conflicts; index.ts/smoke.mjs auto-merge but bundle must be regenerated and tool-count assertions (37->38) rechecked after rebase. Reviewer does not rebase."
    disposition: open
  - id: F-004
    severity: minor
    summary: "settings.ts: plan step 6 says absent/invalid gitSyncMinutes -> 5, but implementation (and test) map an invalid value (e.g. 'soon') to 0 and only an absent key to 5. Consistent with the plan's Constraints section and the report; plan wording was ambiguous."
    disposition: accepted-risk
    reason: "Constraint text ('only an absent key defaults to 5') is the tighter rule and is what was implemented and tested; behaviour is safe (off)."
  - id: F-005
    severity: note
    summary: "GUI kanmerGit.test.ts: 64/65 pass locally; the single failure is the pre-existing host-only 'serializes concurrent orphan cleanup' test recorded in research F9, untouched by this PR."
    disposition: accepted-risk
    reason: "Known host quirk; hosted verify is green at this head."
  - id: F-006
    severity: note
    summary: "regate re-runs the gate job even for PRs already green and skips runs older than 30 days or in progress (logged). Not a loop: re-run jobs are pull_request runs, and a kanmer-board push skips verify/kanmer-gate via their if: guards. Token permissions block (actions: write, contents: read, pull-requests: read) is correct at job level."
    disposition: accepted-risk
    reason: "Behaviour is documented in open-questions; harmless extra gate reruns."
---

# Review — CORE-123 / PR #288 (head 89896693)

Independent reviewer (not the author `claude-code`). Verdict: **needs-changes**. Not merged.

## What was reviewed
Full diff `origin/main(dc514375)..89896693` (23 files), packet (plan 10bbf738251ae5f8, research, files, checklist, open-questions, post-implementation report, scratch/execute, scratch/research), FRD-034/FRD-035, ADR-0011/0016 amendments, PR #288 checks/reviews/threads. Review threads: none (GraphQL reviewThreads empty); the only PR comment is the Codex usage-limit notice (no content to disposition).

## Independent verification (cwd .worktrees/core-123)
- `npx vitest run src/merge-gate.test.ts src/review-attestation.test.ts --root packages/core` → exit 0, 19/19.
- `node --test packages/mcp-server/src/check-pr.test.mjs` → exit 0, 8/8 (incl. needs-changes / missing / stale board_sha / strict off fixtures).
- `node --test scripts/pr-workflow.test.mjs` → exit 0, 1/1.
- `npm run plugin:check` → exit 0 (37 tools, bundle bytes match at this head).
- `npx vitest run src/main/kanmerGit.test.ts src/main/settings.test.ts` (apps/gui) → 64 passed / 1 failed in 563 s; failure is the known host-only orphan-cleanup test (F-005). New race/transient/conflict/no-remote/settings tests passed.
- Hosted run 33083697546 after re-run: `verify` pass, `kanmer-gate` pass (re-run after the board sync), `regate` skipped (correct for a pull_request event). Both required checks (`verify`, `kanmer-gate`) green at 89896693.
- `gh pr view 288 --json mergeable` → `CONFLICTING` / `DIRTY` against origin/main a8318ea6 (F-003).

## Assessment against plan / governing docs
- merge-gate.ts SYNC_REQUIRED semantics match the plan: current/unrecorded pass, stale/unknown fail, skipped without evidence; level follows `strict`; default output unchanged apart from additive keys. Attestation without `board_sha` is `unrecorded` → pass. OK.
- check-pr.mjs uses core `parseReviewAttestation`; the duplicate validator and `gray-matter` import are gone; `parseReviewEvidence` remains a wrapper. OK.
- classifySyncFailure: dirty-tree refusal, network and non-fast-forward → transient; CONFLICT/could not apply/autostash conflict → conflict. The regex is adequate for thrown errors, but the dangerous case (F-002) never throws, so the classifier is bypassed.
- pr.yml: PR-only gate, main-only verify, regate guards and permissions correct; no loop. But the board-push trigger cannot fire (F-001) because the board branch does not carry the workflow file — the plan's own "reviewer to confirm" hosted acceptance check fails.
- GUI status `sync`, MCP `get_status.boardSync`, smoke assertion, Settings hint, ipc type: as planned.
- ADR-0011/0016 edits are the one-sentence amendments the plan's Governing docs section explicitly authorises ("Modifies wording only"); AGENTS.md change is a documented small deviation consistent with that section's own rule. Bundle regenerated at this head.
- FRD-034 AC2 / FRD-035 AC5: partially met — the re-judge-on-board-push half of FRD-035 AC5 is not delivered (F-001).

## Required changes
1. F-001: make the board push actually trigger a re-gate (e.g. a workflow file that lives on the board branch, `repository_dispatch` from the pusher, or a scheduled poll); update pr-workflow test and AGENTS.md accordingly.
2. F-002: after `rebase --autostash`, detect unmerged entries (`git diff --name-only --diff-filter=U`) or a surviving `autostash` stash entry, restore local work safely and return `paused: true` with a conflict error; add a real-git test for the autostash-conflict path.
3. F-003: rebase onto origin/main a8318ea6, regenerate the bundle, re-run `plugin:check` and the smoke tool-count assertions.

## Residual risk
None beyond the open findings; default (non-strict) gate behaviour is unchanged.
