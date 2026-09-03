---
kind: review-attestation
pr: "314"
head_sha: "35f5f2f246259302069787e1986a03fa835fa0bc"
verdict: pass
reviewer: "core139-consolidated-reviewer"
independent: true
plan_hash: "6e24f54eaf07575a"
ticket_updated: "2026-09-03T19:20:27.331Z"
board_sha: "3b3bc0d388e89006b534c1dca17030edc7ebd1bd"
expected_reviewers:
  - "core139-consolidated-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: minor
    summary: "The pr.yml concurrency group treats every pull_request action alike, so an 'edited' event cancels an in-progress verify rail while its own run reports verify as skipped"
    disposition: accepted-risk
    reason: "Narrow window (a title, body or base edit during the ~9-minute rail; nothing in the documented agent flow runs gh pr edit and a comment does not fire 'edited'), fully recoverable by re-running the rail, and this workflow gates on a reviewer observing a green verify at the exact head rather than on branch protection's last-writer-wins status, which the pre-existing edited-skip design already makes unreliable. The remedy is one line for the 0.4.2 CI work this ticket already scopes out: cancel-in-progress: ${{ github.event_name != 'push' && github.event.action != 'edited' }}, pinned in pr-workflow.test.mjs."
  - id: F-002
    severity: note
    summary: "verify-skill-prose.mjs check 21 is a line-based inline-link scan: reference-style link definitions and raw <a href> targets are not seen, and fenced code blocks are not excluded"
    disposition: accepted-risk
    reason: "Measured on the head: zero reference-style definitions and zero <a href> occurrences under plugins/kanmer/skills, and check 21 reports 0 hits on the shipped tree. The check's own comment states the deliberate stricter-now, relax-later stance, and adding a Markdown parser is a dependency decision larger than this fix ticket carries."
  - id: F-003
    severity: note
    summary: "The negative verify.if assertion is narrower than its comment implies: it only evaluates once the folded if: form matched, and a rewrite to github.ref_name == 'main' would evade the lookbehind"
    disposition: accepted-risk
    reason: "The positive assertion already pins the exact two-line folded condition, so the negative assertion's real coverage is an additional unqualified clause appended to it, which is the realistic regression shape and which it does catch; any other rewrite fails the positive assertion first."
  - id: F-004
    severity: note
    summary: "The AGENTS.md section 6 edit leaves ragged mid-paragraph wrapping around 'The gate reads the / remote board tip, so a / board push should also'"
    disposition: accepted-risk
    reason: "Cosmetic only: the paragraph renders as one flowed paragraph, verify-agents-block.mjs is green at 31/31, and pr-workflow.test.mjs matches those sentences with whitespace-tolerant patterns, so no consumer is affected."
---
# Independent consolidated review — CORE-139

Reviewed PR #314 at exact head `35f5f2f246259302069787e1986a03fa835fa0bc` (base `main` at
`cd5b6b6b874a5ce9d3274f9660347b6e54253be4`) against plan version `6e24f54eaf07575a`, ticket update
`2026-09-03T19:20:27.331Z` and pushed board `3b3bc0d388e89006b534c1dca17030edc7ebd1bd`. Round 0:
the consolidated review of the whole PR — diff, packet (files, plan, checklist, post-implementation
report), governing refs FRD-023 and FRD-013, required checks and threads.

I am not the author. The author's worktree `.worktrees/core-139` was never opened; the diff was read
from `origin/CORE-139-ci-storm-shipped-artefacts` and the focused checks ran in a throwaway detached
worktree at the exact head, removed afterwards.

## What the diff does

Nine files, +184/-39. `.github/workflows/pr.yml`: `verify.if` becomes
`(github.event_name == 'pull_request' && github.event.action != 'edited') || (github.event_name == 'push' && github.ref == 'refs/heads/main')`,
plus a workflow-level `concurrency` group keyed by workflow, event name and PR number or ref with
`cancel-in-progress` true for every event except `push`. `.github/workflows/board-regate.yml`: its
own `board-regate-<ref>` group with `cancel-in-progress: true`, `pull-requests: read`, and an
open-PR guard before `gh workflow run`. `scripts/pr-workflow.test.mjs` pins the new condition
positively and negatively, both concurrency blocks, the upstream guard and three new AGENTS.md
sentences. `plugins/kanmer/skills/kanmer-setup/SKILL.md` drops the monorepo-relative
`../../../../docs/manual/greenfield.md` link for an unlinked reference and loses the dangling
`Native`, mirrored in `scripts/agents-block-body.mjs`, the packaged
`plugins/kanmer/scripts/agents-block-body.mjs` and this repo's `AGENTS.md`.
`scripts/verify-skill-prose.mjs` gains check 21 and `scripts/verify-skill-prose.test.mjs` gains the
`spawnValidator` helper (19 spawn sites, including `runOn`) plus a check-21 mutation case.

## Expression semantics, verified

- `github.event.action` is `opened`, `synchronize`, `reopened` or `ready_for_review` on the
  triggering types, none of which equal `'edited'`, so the rail still runs for every code-bearing PR
  event and still skips a metadata edit. On `workflow_dispatch` both disjuncts are false, so the
  rail is skipped — the bug the ticket names. `kanmer-gate` stays `github.event_name ==
  'pull_request'` and `regate` stays dispatch-or-push-to-main, so AGENTS.md's new claim that a
  dispatch runs only `regate` is exactly true.
- `cancel-in-progress` accepts an expression, and `github.event_name != 'push'` evaluates to a
  boolean, so a push to `main` is never cancelled and its `verify` remains the post-merge receipt.
- On `workflow_dispatch`, `github.event.pull_request.number` is empty, so `||` falls through to
  `github.ref` and the group is `<workflow>-workflow_dispatch-refs/heads/main`. That key can contain
  only other dispatches of the same workflow — never a PR run, never a push run.
- Cancelling a superseded dispatch cannot strand a consumer: the run that cancels it is a newer
  dispatch whose `regate` re-lists every open PR into `main` and re-runs each one's `kanmer-gate`
  against a board tip at least as new, so the cancelled run's work is a strict subset of the
  survivor's. `board-regate.yml`'s own group has the same property — GitHub cancels the older
  member, so the newest board push always reaches a dispatch.
- The negative regex is applied to the folded block captured by a pattern that terminates correctly
  at the 4-space `runs-on:` line, and `.gitattributes` pins `eol=lf`, so its literal newline holds on
  the Windows runner. See F-003 for its real strength.
- Check 21 resolves each inline target against the file's directory and rejects it when the path
  relative to the skill folder escapes: `assets/...`, `references/...`, an in-skill `../SKILL.md`
  from an asset subfolder, `#anchors`, absolute paths and `scheme:` URLs all pass; `file.md#anchor`
  is split before resolution; cross-skill links are deliberately flagged. Every skill file sits one
  directory under `plugins/kanmer/skills`, so the skill-folder derivation has no loose file to
  misclassify. See F-002 for its blind spots.
- `spawnValidator` cannot reject a legitimate run: the validator prints its first section header
  before any assertion, every fixture in the file is a copied skills tree the validator already
  tolerates, and no test expects a crash with empty output. Its failure message carries `status`,
  `signal` and `stderr` — exactly the GUI-149 misread it exists to prevent.

## Acceptance checks (detached checkout at 35f5f2f2, exit codes)

| Check | Exit | Result |
|---|---|---|
| `node --test scripts/pr-workflow.test.mjs` | 0 | 1/1 pass, negative assertion present |
| `node scripts/verify-skill-prose.mjs` | 0 | ALL CHECKS PASSED; `PASS  no shipped skill link escapes its skill folder — 0 hits` |
| `node scripts/verify-agents-block.mjs` | 0 | 31/31, including check 7's byte-pin of the SKILL.md fenced block |
| `git diff --stat cd5b6b6b <head> -- plugins/kanmer/mcp/kanmer-mcp.cjs` | 0 | empty — the MCP bundle is byte-identical to main |
| `git grep -n "launcher. Native"` at head | — | no hits in any of the four copies |
| `grep` for reference-style definitions and `<a href>` under the skills tree | — | no hits (bounds F-002) |

Every sentence `verify-skill-prose.mjs` pins still exists in the edited SKILL.md — the validator's
own exit 0 across all 21 checks is that proof — and the `greenfield playbook stays linked from
setup` test still matches, because the new prose keeps the literal `docs/manual/greenfield.md` as a
code span. `npm run verify` and the skill-prose test file were deliberately not run locally; the
hosted rail is the authority for both.

## Governing docs

- **FRD-023 R5** (`plugin:build` + `plugin:check` + `verify-agents-block` gate every skills change):
  met. The packaged `agents-block-body.mjs` moved with the canonical one, `plugin:check` is exit 0 in
  the report and inside the hosted rail, and `verify-agents-block.mjs` is 31/31 here. Check 21
  extends R5's "prose verified against the code it describes" to link portability.
- **FRD-013** (setup as reconciliation): met. The block-body change is exactly the reconcilable drift
  R1 describes — consuming repos report `agents-block: behind` until `kanmer-setup` runs — and R5's
  greenfield brief interview keeps its manual pointer without a link that resolves only inside this
  monorepo.
- Conduct rule 21 (delete a gate that gates nothing) is the ticket's thesis; rule 24 is satisfied by
  the AGENTS.md section 6 update in the same PR; rule 14 holds, because check 21 runs inside
  `npm run verify:skills`, which the rail executes.
- Scope: the diff matches the plan's Expected files exactly, touches nothing under `packages/**`,
  leaves `check-pr.mjs`, `kanmer-gate` and the `regate` body alone, and does not touch the board
  branch. The two declared deviations (whitespace-tolerant AGENTS.md assertions; the board-regate
  staleness row deferred to 0.4.2) are accurate and immaterial.

## Findings and dispositions

- **F-001 — minor, accepted-risk.** Because the group key carries the event name and the PR number,
  every `pull_request` action for one PR shares a group with `cancel-in-progress: true`. An `edited`
  event therefore cancels an in-progress `verify` while its own run skips `verify` — the one action
  the workflow deliberately treats as a no-op is the one that can destroy the rail result, which is
  broader than the stated intent that "a newer head cancels the superseded run". Accepted rather than
  returned: the window is narrow, nothing in the documented agent flow edits a PR body, the loss is a
  re-run rather than a wrong result, and the merge decision here requires a reviewer to see `verify`
  green at the exact head, which this review did.
- **F-002 — note, accepted-risk.** Check 21 sees only inline `](target)` links, so a reference-style
  definition or a raw `<a href>` would be missed and an escaping link quoted inside a fenced example
  would be falsely flagged. Bounded by measurement: none of those constructs exist in the shipped
  skills today and the check reports 0 hits.
- **F-003 — note, accepted-risk.** The negative assertion is genuine but narrower than its comment
  reads; its real coverage is an extra unqualified clause appended to the pinned condition.
- **F-004 — note, accepted-risk.** Cosmetic ragged wrapping in the edited AGENTS.md section 6
  paragraph.

F-002 and F-003 are separate mechanisms, not one class; F-001 is the only finding arising from the
new concurrency block and it has one remedy. No finding is `open`, and none is blocker or major.

## Threads and reviewers

`threads_snapshot` is empty and truthful: the GraphQL `reviewThreads` query returns an empty list and
`gh pr view` reports no reviews and no comments on this head. The `chatgpt-codex-connector` bot has
posted nothing here; it is never an expected reviewer or a gate and no wait was taken on it. The
expected-reviewer set is this single dispatched reviewer, settled on this exact head by this record.

## CI evidence

Run `33795809753` (event `pull_request`, head `35f5f2f2`): `verify` **pass** in 9m01s (job
`100786443706`); `regate` **skipping**, correct because this is neither a dispatch nor a push to
`main`; `kanmer-gate` **fail** in 58s (job `100786441981`) with the single finding
`NO_REVIEW_RECORD - no scratch/review.md review attestation was recorded` against board
`3b3bc0d388e89006b534c1dca17030edc7ebd1bd`, while every other gate check passed (ticket resolved, no
open questions, stage `review`, no blockers, base `main`, commit `35f5f2f2...` reachable). That
failure is this record's absence and is re-judged after this attestation is pushed.

## Residual risk

F-001 through F-004, all dispositioned above. Two operational consequences are by design and worth
restating: every Kanmer-managed repository reports `agents-block: behind` until `kanmer-setup` runs,
and the `board-regate.yml` copy on `kanmer-board` keeps dispatching unconditionally until an operator
re-copies it — with this change merged those dispatches are already cheap, because `verify` no longer
runs on them. No security, data-loss or destructive risk was found.
