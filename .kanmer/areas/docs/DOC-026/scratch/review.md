---
kind: review-attestation
pr: "326"
head_sha: "2ab7262af99c73e251c4bccacc124147be457a8c"
verdict: pass
reviewer: "independent-review-subagent"
independent: true
plan_hash: "8212119cbee8fe03"
ticket_updated: "2026-09-05T03:23:05.025Z"
board_sha: "5aa5b7c2697087d00ed90dc1fa1afcd9f1629aa2"
expected_reviewers:
  - "independent-review-subagent"
threads_snapshot: []
findings:
  - id: F-001
    severity: minor
    summary: "kanmer-gate is red on this head with exactly one failing check, NO_REVIEW_RECORD (\"no scratch/review.md review attestation was recorded\"); STALE_REVIEW skipped, SYNC_REQUIRED recorded state \"unrecorded\". The other eight checks pass."
    disposition: fixed
    reason: "Pre-attestation bootstrap state only. This record now exists and names the pushed board tip 5aa5b7c2697087d00ed90dc1fa1afcd9f1629aa2; the board must be pushed and kanmer-gate re-run green before any merge."
  - id: F-002
    severity: note
    summary: "The new AGENTS.md entry \"`goal.md` — historical owner brief, kept\" points at a path that no clone of this repository contains: goal.md is gitignored (.gitignore:74, under the comment \"Machine-local operator inputs, never source\") and is not tracked anywhere in the tree."
    disposition: accepted-risk
    reason: "The claim is truthful for the owner host (goal.md is present and unchanged at the repo root, 41547 bytes) and the ticket's 2026-09-02 Decision and 2026-09-05 Plan both explicitly required naming goal.md as kept-historical. The failure mode is a contributor grepping and finding nothing, which .gitignore already explains; no instruction is wrong. A one-word \"(machine-local, gitignored)\" qualifier would close it and can ride any later AGENTS.md edit."
  - id: F-003
    severity: note
    summary: "Heading order: the new `## 0.1 Operating index and historical documents` (line 100) is placed before `## 0. The operating rule` (line 116), so AGENTS.md's otherwise strictly ascending section numbering reads 0.1 → 0 → 1."
    disposition: accepted-risk
    reason: "Cosmetic ordering only. The plan specified this exact placement (\"right after the intro paragraph and before '## 0. The operating rule'\"), AGENTS.md has no table of contents to desynchronise, and check:manual/verify:docs are green. No anchor or generated artefact depends on the order."
  - id: F-004
    severity: note
    summary: "AGENTS.md line 518 still reads \"from clean merged `main`\" for `npm run release -- <version> --publish`, the only \"merged main\" phrasing left outside the managed block after this PR's fix."
    disposition: rejected-with-reason
    reason: "Reviewer-verified as accurate rather than stale: scripts/release.mjs:239 hard-codes the branch (`requireOrWarn(branch !== \"main\", `on branch \"${branch}\", not main`, ...)`), unlike the configurable delivery.integrationBranch the managed block now names. Rewording it to the integration-branch language would make the documentation wrong about the command's actual precondition. Correctly left alone per plan Required-changes item 5."
  - id: F-005
    severity: note
    summary: "The PR is BEHIND origin/main: base 2ab7262a's parent is bd36854967b0fa0b68489a4f3db592a59d451696 while origin/main has advanced to 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507 (other HZN-009 PRs merging); gh reports mergeStateStatus BEHIND, mergeable MERGEABLE."
    disposition: accepted-risk
    reason: "Merge physics, not a defect in the change. The diff is two documentation files with no overlap with the intervening merges. This attestation is authoritative only for head 2ab7262af99c73e251c4bccacc124147be457a8c; after `gh pr update-branch` the head SHA changes and a fresh re-bound attestation is owed before merge."
---

# Review — DOC-026, PR 326 @ `2ab7262af99c73e251c4bccacc124147be457a8c`

Round 0 consolidated review. Independent: the reviewer is not the author
(`claude-code`), wrote none of the diff, and has not merged, pushed the branch,
or moved the ticket.

## Contract read

- Ticket body **Decision 2026-09-02** (retire, don't rewrite; pointer to
  `apps/gui/release-notes.md` + the HZN-008 group closeout; mine and delete
  `local-closeout-plan-docs`) and **Plan 2026-09-05** (five numbered steps).
- `plan/plan.md` version `8212119cbee8fe03`;
  `post-implementation-report/post-implementation-report.md` version
  `c065510dd0ebf6ea`.
- `HZN-009 context.md` — lane B, R1-POL package, "Alex is the named heavy
  verifier and the only merger. Implementers run scoped checks only."
- `HZN-008 closeout.md` — the successor record; it exists on the board branch
  and itself names DOC-026 as the retirement it succeeds.
- `DOC-028 scratch/review.md` — findings F-001 (dangling "operating index"
  pointer) and F-002 (stale `kanmer-verify/` comment), both left
  `accepted-risk` there with an explicit recommendation to fold them into
  DOC-026. Both are addressed by this PR.

## What changed

`git diff --stat bd368549..2ab7262a`: two files, +17/−119.

| File | Change |
|---|---|
| `CLOSEOUT_PLAN.md` | deleted, 117 lines, no tombstone |
| `AGENTS.md` | +19/−2: new `## 0.1` subsection; `kanmer-verify/` comment reworded; `kanmer-import/` row deleted |

Nothing else is touched. The worktree at the head SHA is clean
(`git status --porcelain` empty).

## Mechanical verification performed

**`CLOSEOUT_PLAN.md` is gone and referenced nowhere.** `grep -rn CLOSEOUT_PLAN`
over the whole merged tree (excluding `.git`, `node_modules`, `.worktrees`)
returns exactly one hit — `AGENTS.md:107`, the new retirement entry itself.
No source file, workflow, skill, `README.md`, `CLAUDE.md`, doc or script
references it.

**The managed block is byte-identical.** Markers sit at `AGENTS.md:1`
(`kanmer:instructions:start`) and `AGENTS.md:83` (`…:end`); the new subsection
begins at line 100, comfortably outside. Slicing the marker-to-marker region
out of `bd368549:AGENTS.md` and out of the head file and comparing:
`identical: true`, 8718 bytes on both sides. `node
scripts/verify-agents-block.mjs` independently agrees (35/35).

**The subsection resolves DOC-028 F-001 and is consistent with the block.**
The block's line 28 reads "Full rails, packaging and installer builds
serialize behind the named verifier recorded in the repo's operating index."
The new heading is literally "Operating index and historical documents" and
its first bullet says "Alex (the repository owner) is the named heavy
verification owner for this host; full `npm run verify` rails, packaging and
installer builds serialize behind that role; implementers run scoped checks
and let CI own the rail." Same three nouns (rails, packaging, installer
builds), same serialization verb, and it names the phrase it answers. This
matches HZN-009 `context.md`'s operating control word for word in substance.
The dangling pointer is now resolvable by grep from inside the repo.

**The historical-document map is accurate.**
`apps/gui/release-notes.md` exists at the stated path.
`.kanmer/groups/HZN-008/closeout.md` on the board branch exists — confirmed
directly with `git -C .worktrees/kanmer ls-tree --name-only
kanmer-board:.kanmer/groups/HZN-008/` → `HZN-008.md automation closeout.md
context.md`. The subsection correctly qualifies it as "on the board branch"
rather than presenting it as a working-tree path, which is the distinction
that would otherwise mislead a `main` reader. `MASTERPLAN.md` exists and its
own header records `2026-08-20`, matching the stated date. `goal.md` is the
one entry a clone cannot resolve — see F-002.

**No statement contradicted by `git tag`, the releases page or the board.**
The subsection makes exactly three factual assertions beyond the pointer:
`CLOSEOUT_PLAN.md` retired 2026-09-05 (this PR's date), MASTERPLAN.md dated
2026-08-20 (matches its header), goal.md historical (true). `git tag` shows
v0.4.1, v0.4.0, v0.3.12, v0.3.11, v0.3.10; the release ledger's `main@1` is
terminal `released` at `v0.4.1`. Nothing in the new prose makes a release
claim at all, so there is nothing to contradict — and, importantly, the
deleted file's failed-release history is not rewritten as success anywhere:
the successor `HZN-008 closeout.md` preserves CORE-103, CORE-107, MCP-028 and
MCP-051 as retired non-success with their non-PASS proofs intact.

**The skills tree now matches disk.** `ls -d plugins/kanmer/skills/*/` → 12
directories: auto, closeout, docs, execute, groom, plan, report, research,
review, setup, tickets, verify. The tree in `AGENTS.md` §2 lists exactly those
12 rows and no others; the phantom `kanmer-import/` row is gone.

**The `kanmer-verify/` comment is fixed** to "validate at the exact merge SHA
on the configured integration branch, write proof.md → Done", which is what
`kanmer-verify/SKILL.md` actually does and is consistent with the regenerated
block's no-hardcoded-branch language.

**"merged main" sweep.** One hit remains outside the block, line 518. Verified
correct rather than missed — see F-004.

**The mined branch is genuinely gone.** `git branch --list` no longer contains
`local-closeout-plan-docs`; the remaining local branches are the six live
ticket branches plus `kanmer-board`, `main` and the pre-existing
`updater-implementation`. The report's account of why nothing needed porting
(both AGENTS.md hunks already present byte-for-byte in the current managed
block after CORE-139/DOC-028) is consistent with the DOC-028 review's own
independent finding that those two paragraphs are byte-identical between
`main` and DOC-028's head — i.e. they were already upstream. The 281-line
`CLOSEOUT_PLAN.md` rewrite was correctly discarded, since the recorded
Decision retires the file rather than rewriting it. The account is truthful.

## Acceptance checks

Every plan acceptance check re-run by the reviewer in the ticket worktree at
the head SHA, not taken from the report:

| Check | Result |
|---|---|
| `npm run verify:docs` | exit 0 — PASS, manual up to date (22 chapters), 26 doctor ids, links/fences/canary/provider boundaries |
| `npm run check:manual` | exit 0 — manual up to date (22 chapters) |
| `node scripts/verify-agents-block.mjs` | exit 0 — 35/35 checks passed |
| `npm run verify:skills` | exit 0 — ALL CHECKS PASSED (21 checks) |
| `npm run build:core` | exit 0 (environment step; fresh worktree needs `packages/core/dist`) |
| `npm run test:scripts` | exit 0 — 184 tests, 184 pass, 0 fail |
| `CLOSEOUT_PLAN.md` absent at root | yes |
| subsection outside the block, ≤15 lines | yes — 13 content lines + heading |
| managed block byte-identical | yes — 8718 bytes, `===` true |
| `local-closeout-plan-docs` deleted | yes |

The full `npm run verify` was not run (outside the reviewer's remit and
reserved to the named heavy verifier per HZN-009 `context.md`); CI ran it.

## CI

Workflow run `33941701422` on this head:

| Job | Result | Run / job |
|---|---|---|
| `verify` | **pass**, 7m03s | 33941701422 / 101240297110 |
| `kanmer-gate` | **fail**, 59s | 33941701422 / 101240297299 |
| `regate` | skipping | 33941701422 / 101240297780 |

`kanmer-gate`'s only failing check is `NO_REVIEW_RECORD` (F-001). Its eight
other checks pass on the reviewed head: `NO_TICKET` (DOC-026 resolved from the
`Kanmer: DOC-026` footer), `OPEN_QUESTIONS` (0 of 0), `WRONG_STAGE` (review),
`DEPENDENCY_BLOCKED` (no live blockers), `WRONG_TARGET` (targets integration
branch "main"), `COMMITS_UNREACHABLE` (`2ab7262a` reachable), and
`SYNC_REQUIRED` which passed only in its degraded "attestation records no
board_sha; board sync was not verified" form at board `1b8fd8a8`.
`STALE_REVIEW` was skipped for the same bootstrap reason. `KANMER_GATE_STRICT`
was `true` for that run.

## Review threads

The GraphQL `reviewThreads` surface returns zero nodes on this head, and
`gh pr view --json reviews,comments` returns empty arrays for both. There are
no human threads and no bot threads, so there is nothing to classify by root
cause and `threads_snapshot` is truthfully empty. No expected reviewer other
than this one was named; it has settled on this exact head.

## Doc gates

`get_doc_gates DOC-026` reports profile `chore`, area `docs`,
`docs_todo: false`, and exactly two boundaries: `leave-preparing` (plan +
questions-resolved, both satisfied, passable) and `enter-done` (proof, not yet
written — correctly owned by `kanmer-verify`). No `leave-backlog` gate is
listed for this profile, so none was owed and clearing `docs_todo` is
truthful. The governing record for this chore is the board closeout
(`HZN-008 closeout.md`) plus the ticket's own recorded Decision; no PRD/FRD/ADR
governs it, and the plan says so explicitly.

## Residual risk

F-002 through F-005: one un-resolvable-from-a-clone doc pointer, one cosmetic
heading order, one correctly-retained phrase, and the BEHIND base. None
changes what an agent or contributor does. No finding of any severity is
`open`.

## Merge preconditions (for the merger, not this reviewer)

1. The board must be pushed past this attestation and `kanmer-gate` re-run
   green with `SYNC_REQUIRED` satisfied against the pushed board — the gate
   reads the remote board tip and does not re-run on a board push.
2. The PR is `BEHIND` `origin/main` (`32aa54fc…`). After `gh pr
   update-branch` the head SHA changes, this attestation is no longer bound to
   the head, and a fresh re-bound attestation is owed before merge.

This reviewer has not merged, has not pushed the PR branch, and has not moved
the ticket.
