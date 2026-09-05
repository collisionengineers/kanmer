---
kind: review-attestation
pr: "326"
head_sha: "57a6e919ad1ad51aa52f10430e1ec9900094d722"
verdict: pass
reviewer: "independent-review-subagent"
independent: true
plan_hash: "8212119cbee8fe03"
ticket_updated: "2026-09-05T03:23:05.025Z"
board_sha: "bbc4d48e6579dc0a999717f96a1b52e932dc7c4f"
expected_reviewers:
  - "independent-review-subagent"
threads_snapshot: []
findings:
  - id: F-001
    severity: minor
    summary: "kanmer-gate was red on this head with exactly one failing check, STALE_REVIEW (\"review attestation head 2ab7262a… does not match PR head 57a6e919…\"), after two `gh pr update-branch` merges moved the head. On the previous head 2ab7262a the single failure was instead NO_REVIEW_RECORD."
    disposition: fixed
    reason: "Both are attestation-binding states, not defects in the change. This record is bound to head 57a6e919ad1ad51aa52f10430e1ec9900094d722 with a pushed board_sha, and kanmer-gate has since re-run green on this head (run 33942486457, job 101243591297): all nine checks pass, including STALE_REVIEW (\"review attestation head matches the PR head\", verdict pass) and SYNC_REQUIRED state `current`."
  - id: F-002
    severity: note
    summary: "The new AGENTS.md entry \"`goal.md` — historical owner brief, kept\" points at a path that no clone of this repository contains: goal.md is gitignored (.gitignore:74, under the comment \"Machine-local operator inputs, never source\") and is not tracked anywhere in the tree."
    disposition: accepted-risk
    reason: "The claim is truthful for the owner host (goal.md is present and unchanged at the repo root, 41547 bytes) and the ticket's 2026-09-02 Decision and 2026-09-05 Plan both explicitly required naming goal.md as kept-historical. The failure mode is a contributor grepping and finding nothing, which .gitignore already explains; no instruction is wrong. A short \"(machine-local, gitignored)\" qualifier would close it and can ride any later AGENTS.md edit."
  - id: F-003
    severity: note
    summary: "Heading order: the new `## 0.1 Operating index and historical documents` (line 100) is placed before `## 0. The operating rule` (line 116), so AGENTS.md's otherwise strictly ascending section numbering reads 0.1 → 0 → 1."
    disposition: accepted-risk
    reason: "Cosmetic ordering only. The plan specified this exact placement (\"right after the intro paragraph and before '## 0. The operating rule'\"), AGENTS.md has no table of contents to desynchronise, and check:manual/verify:docs are green at this head. No anchor or generated artefact depends on the order."
  - id: F-004
    severity: note
    summary: "AGENTS.md line 518 still reads \"from clean merged `main`\" for `npm run release -- <version> --publish`, the only \"merged main\" phrasing left outside the managed block after this PR's fix. Still line 518 after the two main merges."
    disposition: rejected-with-reason
    reason: "Reviewer-verified as accurate rather than stale: scripts/release.mjs:239 hard-codes the branch (`requireOrWarn(branch !== \"main\", `on branch \"${branch}\", not main`, ...)`), unlike the configurable delivery.integrationBranch the managed block now names. Rewording it to the integration-branch language would make the documentation wrong about the command's actual precondition. Correctly left alone per plan Required-changes item 5."
  - id: F-005
    severity: note
    summary: "On the previously attested head 2ab7262a the PR was BEHIND origin/main (base parent bd368549 vs origin/main 32aa54fc); gh reported mergeStateStatus BEHIND."
    disposition: fixed
    reason: "Resolved by two `gh pr update-branch` merges (32212cd8 bringing GUI-152 at 32aa54fc, 57a6e919 bringing CORE-140 at 94165031). The head's base SHA is now 941650317be4cad4f6a86c6ab16362ee5dd8dfdb == origin/main and gh now reports mergeStateStatus CLEAN, mergeable MERGEABLE. The update introduced no content delta — verified below."
  - id: F-006
    severity: minor
    summary: "The first `verify` run on this head failed (run 33942486457, job 101242491460, 8m06s): `packages/mcp-server/src/smoke.mjs` reported 383/384 checks passed with one failure, \"ready packet is read-only\" — the assertion that get_execution_packet mutates no sandbox file (content-hash tree snapshot plus the ticket file and activity.jsonl)."
    disposition: accepted-risk
    reason: "Established as a flake on unchanged content, not a regression, on three independent grounds. (1) This PR's entire diff is two documentation files; nothing in it can reach get_execution_packet. (2) Both `main` commits merged in passed `verify` on their own heads — CORE-140 #322 (run 33941835173, job 101242268453, 7m47s) whose base was already 32aa54fc, i.e. content equivalent to main@94165031, and GUI-152 #323 (run 33941260052, job 101240467022, 9m24s). (3) Decisively, the re-run of the identical head 57a6e919 passed: run 33942486457, job 101243591230, `verify` **pass** in 8m19s. Residual risk is a genuinely intermittent smoke assertion in the packet read-only check, worth a follow-up flake ticket for the lane that owns smoke.mjs; it is not caused by, and cannot be fixed within, this doc-only PR."
---

# Review — DOC-026, PR 326 @ `57a6e919ad1ad51aa52f10430e1ec9900094d722`

Re-bind of the round-0 consolidated review after two `gh pr update-branch`
merges. This whole-file record **replaces** the attestation previously written
against head `2ab7262af99c73e251c4bccacc124147be457a8c` (board
`5aa5b7c2697087d00ed90dc1fa1afcd9f1629aa2`), which is superseded and no longer
authoritative. Verdict unchanged: the delta is merge-only.

Independent: the reviewer is not the author (`claude-code`), wrote none of the
diff, and has not merged, pushed the PR branch, or moved the ticket.

## The delta since the previously attested head is merges of main only

`git log --oneline 2ab7262a..57a6e919`:

```
57a6e919 Merge branch 'main' into DOC-026-retire-closeout-plan
94165031 Build each rail artifact once and refuse a stale already-built step (CORE-140) (#322)
32212cd8 Merge branch 'main' into DOC-026-retire-closeout-plan
32aa54fc Focus Board scopes, bounded columns and sidebar (GUI-152) (#323)
```

Four commits: two merge commits authored by the update-branch operation and
the two `main` commits they brought in (GUI-152 #323, CORE-140 #322). No new
ticket commit.

**The ticket's own change is unchanged and the merges added nothing.** Both
forms of the diff against the new base agree exactly:

```
git diff 941650317be4cad4f6a86c6ab16362ee5dd8dfdb...57a6e919 --stat
git diff 941650317be4cad4f6a86c6ab16362ee5dd8dfdb    57a6e919 --stat
  AGENTS.md        |  19 ++++++++-
  CLOSEOUT_PLAN.md | 117 ---------------------------------------------
  2 files changed, 17 insertions(+), 119 deletions(-)
```

Two-dot and three-dot producing identical stats is the property that proves
the merge commits carry no content of their own: still exactly the two DOC-026
files, still +17/−119, byte-for-byte the same two `AGENTS.md` hunks reviewed
at `2ab7262a` (the `## 0.1` subsection insertion and the skills-tree
comment/row edit) plus the 117-line `CLOSEOUT_PLAN.md` deletion.

**The managed block survived the merge byte-identically.** Slicing the
`kanmer:instructions:start` → `…:end` region out of `94165031:AGENTS.md` and
out of `57a6e919:AGENTS.md`: `identical: true`, 8718 bytes on both sides —
the same length attested at the previous head, so DOC-028's regenerated block
is intact and untouched by this PR.

**Both sides of the merge survived in `AGENTS.md`.** Programmatic checks
against `57a6e919:AGENTS.md`:

- `## 0.1 Operating index and historical documents` present — true
- `Named heavy verifier:** Alex` bullet present — true
- `` `CLOSEOUT_PLAN.md` — retired 2026-09-05 (DOC-026) `` present — true
- `validate at the exact merge SHA on the configured integration branch`
  present — true
- `kanmer-import/` absent — true
- `CLOSEOUT_PLAN.md` occurrences in `AGENTS.md` — exactly 1 (the retirement
  entry)

CORE-140's §6 rows survive by construction: since `git diff main head` shows
only the two DOC-026 hunks, every other line of `AGENTS.md` — including
CORE-140's rewritten `npm test`, `npm run verify` and `npm run mcpb:check`
rows describing `dist/verify-stamp.json` and the `:built` variants — is
identical to `main`'s. Confirmed by inspecting `git diff 32aa54fc 94165031 --
AGENTS.md` (three modified table rows at lines ~489–505) and observing none of
them appear in the head-vs-main diff.

**`CLOSEOUT_PLAN.md` is still gone and still referenced nowhere.** Re-grepped
the whole merged tree at `57a6e919` in a disposable detached worktree:
`grep -rn CLOSEOUT_PLAN` returns exactly one hit, `AGENTS.md:107`. The file is
absent from the root. `ls -d plugins/kanmer/skills/*/` is still 12, matching
the 12 rows in §2.

## Checks re-run at the new head

Run in a disposable detached worktree at `57a6e919` (the ticket's own worktree
was left read-only at `2ab7262a`; the disposable worktree was removed
afterwards), using the dependency-free `scripts/` entry points:

| Check | Result |
|---|---|
| `node scripts/verify-agents-block.mjs` | exit 0 — 35/35 checks passed |
| `node scripts/build-manual.mjs --check` (`check:manual`) | exit 0 — manual up to date (22 chapters) |
| `node scripts/verify-docs.mjs` (`verify:docs`) | exit 0 — PASS, document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current |
| `node scripts/verify-skill-prose.mjs` (`verify:skills`) | exit 0 — ALL CHECKS PASSED (21 checks) |

At the previous head `2ab7262a` the same four were green and, additionally,
`npm run build:core` (exit 0) and `npm run test:scripts` (exit 0 — 184 tests,
184 pass, 0 fail). `test:scripts` was not re-run at `57a6e919` because the
merge changes no `scripts/*.test.mjs` input for this PR's diff and CI's
`verify` job runs the full rail at this head. The full `npm run verify` is
reserved to the named heavy verifier per HZN-009 `context.md`.

## Findings carried forward

All five findings from the `2ab7262a` attestation carry forward with their
dispositions. F-005 (BEHIND) is now `fixed` by the update-branch merges;
F-001 is restated with its current gate manifestation (`STALE_REVIEW` rather
than `NO_REVIEW_RECORD`) and is `fixed` — the gate has since re-run green.
F-002, F-003 and F-004 are unchanged and re-verified against the merged head —
in particular `goal.md` is still untracked/gitignored, `## 0.1` still precedes
`## 0.`, and the "clean merged `main`" row is still at line 518.

One new finding, **F-006**, is raised with a written reason as the delta-review
rules require: it is new evidence that did not exist at the previous head — a
first-run `verify` failure on this head, established as a flake by a passing
re-run of the identical head.

## Evidence retained from the round-0 consolidated review

The substantive review at `2ab7262a` established, and re-verification at
`57a6e919` re-confirms, that:

- The contract is the ticket's **Decision 2026-09-02** (retire, don't rewrite;
  point at `apps/gui/release-notes.md` + the HZN-008 group closeout; mine and
  delete `local-closeout-plan-docs`) and **Plan 2026-09-05**. Both are met.
- The `## 0.1` subsection resolves DOC-028 review **F-001**: the managed
  block's line 28 says rails/packaging/installer builds "serialize behind the
  named verifier recorded in the repo's operating index", and the new
  subsection is literally titled "Operating index and historical documents"
  and names Alex with the same three nouns and the same serialization verb.
  It matches HZN-009 `context.md`'s operating control in substance. The
  dangling pointer is now resolvable by grep from inside the repo.
- The `kanmer-verify/` comment fix resolves DOC-028 review **F-002**.
- The historical-document map is accurate: `apps/gui/release-notes.md` exists;
  `.kanmer/groups/HZN-008/closeout.md` exists on the board branch (confirmed
  with `git -C .worktrees/kanmer ls-tree --name-only
  kanmer-board:.kanmer/groups/HZN-008/`) and is correctly qualified as a
  board-branch path rather than presented as a working-tree path;
  `MASTERPLAN.md` exists and its header records `2026-08-20` as stated.
- Nothing in the new prose is contradicted by `git tag` (v0.4.1, v0.4.0,
  v0.3.12, v0.3.11, v0.3.10), the release ledger (`main@1` terminal
  `released` at `v0.4.1`) or the board. No failed release is rewritten as a
  pass: the successor `HZN-008 closeout.md` preserves CORE-103, CORE-107,
  MCP-028 and MCP-051 as retired non-success with their non-PASS proofs.
- The mined branch is genuinely gone — `local-closeout-plan-docs` is absent
  from `git branch --list`, and the report's account of why nothing needed
  porting (both AGENTS.md hunks already byte-for-byte upstream after
  CORE-139/DOC-028) is corroborated by DOC-028's own independent finding that
  those two paragraphs are byte-identical between `main` and DOC-028's head.
  The 281-line rewrite was correctly discarded per the recorded Decision.

## CI

Workflow run `33942486457` on head `57a6e919`, first attempt then re-run:

| Job | First attempt | Re-run | Job ids |
|---|---|---|---|
| `verify` | **fail**, 8m06s | **pass**, 8m19s | 101242491460 → 101243591230 |
| `kanmer-gate` | **fail**, 55s | **pass**, 52s | 101242491669 → 101243591297 |
| `regate` | skipping | skipping | 101242492083 → 101243591797 |

**Current state: both required checks are green on this exact head**, and
`gh pr view` reports `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`.

`kanmer-gate` (`KANMER_GATE_STRICT: true`) passes all nine checks on the
re-run: `NO_TICKET` (DOC-026 resolved from the `Kanmer: DOC-026` footer),
`OPEN_QUESTIONS` (0 of 0), `WRONG_STAGE` (review), `DEPENDENCY_BLOCKED` (no
live blockers), `WRONG_TARGET` (targets integration branch "main"),
`NO_REVIEW_RECORD` ("review attestation is present"), `STALE_REVIEW` ("review
attestation head matches the PR head", attested `57a6e919…`, verdict pass),
`COMMITS_UNREACHABLE` (`2ab7262a` reachable — an ancestor of the merged head),
and `SYNC_REQUIRED` state `current` ("review attestation board
3b4025e68203d9644a44019ffaa8c9b25a47f207 is on the fetched board tip
16cb32b1aa76129493660662649349ded8e7900b").

The first-attempt failures were F-001 (`STALE_REVIEW`, before this record was
re-bound) and F-006 (a `verify` smoke flake). Neither is a defect in the
change; see those findings for the evidence.

For completeness, at the previous head `2ab7262a`, run `33941701422`:
`verify` **passed** (7m03s, job 101240297110), `kanmer-gate` failed on
`NO_REVIEW_RECORD` only (job 101240297299), `regate` skipping (job
101240297780).

## Review threads

The GraphQL `reviewThreads` surface returns zero nodes on this head, and
`gh pr view --json reviews,comments` returns empty arrays for both. No human
threads and no bot threads exist, so there is nothing to classify by root
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

F-002, F-003 and F-004: one doc pointer that a fresh clone cannot resolve, one
cosmetic heading order, and one correctly-retained phrase. F-006: an
intermittent `smoke.mjs` assertion ("ready packet is read-only") that is
outside this PR's scope and worth a separate flake ticket for the lane owning
`packages/mcp-server/src/smoke.mjs`. None of these changes what an agent or
contributor does. No finding of any severity is `open`.

## Merge preconditions (for the merger, not this reviewer)

1. `verify` and `kanmer-gate` are both green on this exact head as of this
   record — satisfied.
2. The board is pushed; this record names board tip
   `bbc4d48e6579dc0a999717f96a1b52e932dc7c4f`. Because the gate reads the
   **remote** board tip and does not re-run on a board push, re-run
   `kanmer-gate` once more after this record is pushed if a gate result older
   than the push is being relied on.
3. If the head moves again, this attestation stops being authoritative and a
   fresh re-bound record is owed.

This reviewer has not merged, has not pushed the PR branch, and has not moved
the ticket.
