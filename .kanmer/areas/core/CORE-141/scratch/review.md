---
kind: review-attestation
pr: "332"
head_sha: "bc97f5799f7d794c1db9f380fad00cce4b0a9fa4"
verdict: pass
reviewer: "independent-reviewer-core-141"
independent: true
plan_hash: "b5d971f65023c10d"
ticket_updated: "2026-09-05T17:45:35.431Z"
board_sha: "79aaae9ca96197e0eebf90294b097a3b45149d60"
expected_reviewers:
  - "independent-reviewer-core-141"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: blocker
    summary: "kanmer-gate failed COMMITS_UNREACHABLE on run 33981616211: the ticket recorded commits[] = [415aeb692242547bd394af0e7376e5dbc94db111], the pre-squash branch head of PR #331. That commit is not an ancestor of PR #332's head (GitHub squash-merged #331 as 8c515c4afbeba2a3ddf09f40d7d2c6fbe15656f5), so collectCommitReachability classifies it unreachable and the strict gate fails. Recording the #331 merge SHA instead does not help either: git-reachability.mjs marks any commit that is an ancestor of the PR base as unreachable with \"commit is reachable from the PR base and is outside the base..head range\". The only value that is both truthful for this PR and inside base..head is the release commit itself."
    disposition: fixed
    reason: "commits[] set to bc97f5799f7d794c1db9f380fad00cce4b0a9fa4, the release commit this PR carries. This matches what kanmer-execute records for an open PR (the branch commit) and is the same shape the gate accepted for the v0.4.1 cut; kanmer-verify/kanmer-closeout replace it with the squash merge SHA after merge, exactly as CORE-137 ended at 4e94ad806d5f74dbfdc9b0789190624addf4cbdd."
  - id: "F-002"
    severity: major
    summary: "kanmer-gate failed STALE_REVIEW on run 33981616211: scratch/review.md was the round-0 attestation for PR #331 at head 415aeb692242547bd394af0e7376e5dbc94db111, not for this PR head. Under KANMER_GATE_STRICT=true that is a blocking error."
    disposition: fixed
    reason: "This whole-file record replaces it and binds PR 332 to head bc97f5799f7d794c1db9f380fad00cce4b0a9fa4 with board 79aaae9ca96197e0eebf90294b097a3b45149d60 (pushed to origin/kanmer-board before the gate was re-run)."
  - id: "F-003"
    severity: note
    summary: "scratch/cut-log.md records step 3 as \"20/20 scenarios passed\". The retained transcript dist/golden/golden-core141-standalone.json records 20 scenarios with result PASS x19 and SIMULATED x1 — GB-16 (\"Provider-derived reconciliation routes, driven from injected evidence and recorded as simulated\") runs in mode \"simulated\" by design. coverageGaps is empty and no scenario failed."
    disposition: accepted-risk
    reason: "The wording is the runner's own summary line, and the underlying evidence is stronger than the summary is precise: no scenario failed, GB-16's simulated mode is the scenario's declared design (FRD-028 AC3 / FRD-035 edge case 1), and elapsed 17343 ms is well inside the 300000 ms budget. Residual risk is a reader taking \"20/20 passed\" to mean 20 live executions."
  - id: "F-004"
    severity: note
    summary: "The root checkout at C:\\Users\\Alex\\Documents\\GitHub\\kanmer is left on branch release/v0.4.2 at bc97f579 with the 0.4.2 manifests in the working tree (that is where scripts/release.mjs prepared the cut). scripts/release.mjs refuses any run whose branch is not main, and --publish additionally asserts every manifest already reports the target version and that --release-commit is an ancestor of local main."
    disposition: accepted-risk
    reason: "Not a defect in the PR; it is a post-merge operator precondition. Before the publish phase the operator must `git checkout main && git pull` so local main carries the merged release commit, then run `node scripts/release.mjs 0.4.2 --publish --release-commit <post-merge SHA>` with GH_TOKEN set. Named here so the precondition is not discovered as a refusal."
  - id: "F-005"
    severity: note
    summary: "Several cut-log assertions rest on artefacts that no longer exist or were never retained: the four verify-attempt logs and the passing attempt-4 log live in an ephemeral /tmp, and the census board copy was deleted after the run. The 'live board untouched' assertions around golden:promotion are stated, not evidenced by a retained transcript."
    disposition: accepted-risk
    reason: "The two load-bearing claims were independently reproduced during this review rather than taken on trust. dist/verify-stamp.json reads head 8c515c4afbeba2a3ddf09f40d7d2c6fbe15656f5, dirty false, node v24.15.0, matching the attempt-4 claim. Re-running auditProofRecords against a fresh copy of the live board reproduced the census exactly: valid 2 / legacy 319 / invalid 2 / absent 105 / total 428, invalid ids GUI-133 and GUI-135, digest proof-census-v1:59830aa1862824e92b79e670dd81b8fd21be11ad7573e99b3dd4028ac5afe818, parserVersion proof-record/2#1, problems []. dist/golden/promotion-core141-0.4.2.json records candidate 0.4.2, dryRun false, verdict INCOMPLETE with all ten required steps UNAVAILABLE as \"operator action, not automated (ADR-0021)\", and recordedInstances [\"0.4.0\"] still evaluating PASS. The board worktree is clean and its only commits in the window are ordinary autosync syncs and other tickets' own closeout writes. Residual risk is limited to the unretained verify-attempt narrative, which the green hosted verify job on this exact head supersedes."
  - id: "F-006"
    severity: note
    summary: "Root-cause class behind F-001: a ticket that ships through two PRs can never hold a commits[] value that satisfies the merge gate for the currently open PR and also records its already-merged history. Anything merged is an ancestor of the base and is therefore reported unreachable; only an in-range, not-yet-merged commit passes. The same mechanism is why reconciliation cannot recommend Done after a squash merge until commits[] holds the merge SHA."
    disposition: deferred-to-ticket
    ticket: CORE-146
    reason: "CORE-146 (group HZN-010, package R2-EVIDENCE) already owns exactly this mechanism per HZN-009's closeout draft. One remedy for the whole class, not a patch per occurrence; nothing in the 0.4.2 diff causes or worsens it."
  - id: "F-007"
    severity: note
    summary: "The ticket still records the PR #331 implementation claim: taken_at 2026-09-05T14:48:07.489Z with claim_expires_at 15:18:07.489Z (long expired), lease_phase implementing, and worktree .worktrees/CORE-141 on the already-merged branch CORE-141-release-0.4.2 at 415aeb69."
    disposition: accepted-risk
    reason: "Ordinary post-merge residue owned by kanmer-closeout, not by this release PR. `git worktree list` and `ls .worktrees` agree exactly (CORE-141, kanmer), so there is no unregistered worktree residue, and the board worktree is on kanmer-board with a clean tree."
---

# Review — CORE-141 release PR #332 (`release: v0.4.2`)

Round 0 consolidated review of the whole PR, bound to head
`bc97f5799f7d794c1db9f380fad00cce4b0a9fa4` on `release/v0.4.2`, base `main` at
`8c515c4afbeba2a3ddf09f40d7d2c6fbe15656f5`. This is a second, separate
attestation on CORE-141: the earlier record attested PR #331 (release notes),
which is merged. Reviewed from `git fetch origin release/v0.4.2` and
`git diff origin/main..origin/release/v0.4.2`; no worktree was created for this
branch and nothing was rebuilt.

## What the PR carries

Exactly the eight files `scripts/release.mjs` produces in its preparation
phase, 10 insertions and 10 deletions, all of them a `0.4.1` → `0.4.2` version
string:

- `package.json`, `apps/gui/package.json`
- `mcpb/manifest.json`
- `plugins/kanmer/plugin.json`, `plugins/kanmer/.claude-plugin/plugin.json`,
  `plugins/kanmer/.codex-plugin/plugin.json`
- `package-lock.json` (three version fields)
- `plugins/kanmer/mcp/kanmer-mcp.cjs` — one line,
  `var SERVER_VERSION = true ? "0.4.1" : null;` →
  `... "0.4.2" ...`, the compiled version define

That is the same file set as the v0.4.1 cut (PR #319), less
`apps/gui/release-notes.md`, which shipped separately in PR #331 and is
byte-identical between `origin/main` and this branch (`## 0.4.2` is already the
top section on main). No source file, no test, no workflow and no `engines`
block is touched: `.github/workflows/release.yml` keeps its Node 20 pin, which
is a deliberate HZN-009 exclusion (R2-DESKTOP), and the diff contains no
`.github/` path at all. After the bump no JSON manifest in the tree still reads
`0.4.1` (the single remaining match in `package-lock.json` is the unrelated
third-party `pe-library@0.4.1`).

The commit is `release: v0.4.2`, a single commit on the branch. The PR body is
the standalone footer `Kanmer: CORE-141` that `gh pr create` is given verbatim
by `release.mjs`; the gate resolved the ticket from it (`source: "footer"`).
Base is `main`, the PR is open and not a draft. The tag `v0.4.2` does not exist
locally or on origin, so publication is still entirely ahead of the merge.

## Acceptance checks

- Diff is exactly the release script's output and nothing else — met.
- Bundle carries the new version — met: the committed bundle's define reads
  `0.4.2`, and the locally retained `dist/mcpb/kanmer-0.4.2.mcpb` (1,796,819
  bytes) embeds a `manifest.json` at version `0.4.2`. No 0.4.2 Windows
  installer exists yet, which is correct: `electron-builder` runs only in
  `--publish` mode.
- Release notes precondition for `release.mjs` — met on main.
- Cut evidence chain (plan v4 steps 1-8) — met; see F-005 for what was
  re-derived rather than trusted. The promotion rehearsal's all-UNAVAILABLE
  INCOMPLETE verdict is the ADR-0021-correct outcome while no candidate is
  packaged, and the census outcome (2 valid / 319 legacy / 2 invalid / 105
  absent) supports the recorded decision to leave the live board in `report`
  proof policy for this release.

## Checks

- `verify` (required, windows-latest, run 33981616211 job 101347732586):
  **success** at this exact head.
- `kanmer-gate` (required, run 33981616211 job 101347732516): **failure** at
  gather time, with exactly two error findings, `STALE_REVIEW` and
  `COMMITS_UNREACHABLE` — F-002 and F-001. Every other gate check passed,
  including `WRONG_TARGET` (base `main`), `WRONG_STAGE` (review),
  `DEPENDENCY_BLOCKED`, `OPEN_QUESTIONS` and `SYNC_REQUIRED`. Both failures are
  board-record staleness, not a property of the diff; both are fixed above and
  the job is re-run against the pushed board.
- `regate`: skipped, as designed for a `pull_request` event.

## Threads

No review threads, no review comments and no reviews exist on this PR
(GraphQL `reviewThreads`, `comments` and `reviews` are all empty), so
`threads_snapshot` is empty. No bot thread was posted on this head.

## Residual risk

`kanmer-gate` is a board-state gate: it must be re-run after this record and
the corrected `commits[]` reach `origin/kanmer-board`, because a board push
does not itself re-trigger it. Publication remains an operator action from a
clean `main` after merge (F-004). The two invalid legacy proof records
(GUI-133, GUI-135) stay unrepaired and the live board stays in `report` policy;
a strict cutover remains a deliberate, separately censused operator step.
