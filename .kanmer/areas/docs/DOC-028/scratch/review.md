---
kind: review-attestation
pr: "321"
head_sha: "657e016137a38fe7c7fe0a8ae4b893ff0562c727"
verdict: pass
reviewer: "independent-review-subagent"
independent: true
plan_hash: "269f94549b31a2d9"
ticket_updated: "2026-09-05T02:23:55.833Z"
board_sha: "15eb74edf31d7a3d7641bc501ffd1824b9bccf86"
expected_reviewers:
  - "independent-review-subagent"
threads_snapshot: []
findings:
  - id: F-001
    severity: minor
    summary: "\"the named verifier recorded in the repo's operating index\" names an artefact that does not exist in this repo or in any shipped skill, so a consuming-repo agent cannot resolve it."
    disposition: accepted-risk
    reason: "The sentence is the ticket's literal required wording. Its failure mode is a dangling pointer that degrades to \"no named verifier\", not a wrong instruction; the next sentence still gives the safe behaviour (wait or reuse CI). Recommend a follow-up lane-B ticket to either define an operating index or reword to \"the verifier named in this repo's AGENTS.md\"."
  - id: F-002
    severity: minor
    summary: "AGENTS.md line 228 (skills tree, outside the managed block) still reads \"kanmer-verify/ # Verifying stage: validate on merged main\", now contradicting the regenerated block's \"never hardcode a branch name\" in the same file."
    disposition: accepted-risk
    reason: "Pre-existing line on origin/main, outside the managed block and outside the plan's edit scope; the plan's Step 7 was conditional on verify:docs / check:manual demanding it and both passed. One-word fix, non-behavioural, safe to fold into DOC-026 or the next lane-B ticket."
  - id: F-003
    severity: note
    summary: "Garbled comment above checks 10-13 in scripts/verify-agents-block.mjs: \"...string-presence checks on the one canonical BLOCK_BODY, same as checks 10/11/12/13 are meant to be lightweight tripwires...\" is two half-sentences spliced together."
    disposition: accepted-risk
    reason: "Source comment only; no assertion, artefact or shipped prose is affected."
  - id: F-004
    severity: note
    summary: "The post-implementation report states \"Resulting bullet order (12 bullets total, up from 10)\"; the actual managed block has 14 bullets, up from 12."
    disposition: accepted-risk
    reason: "The enumerated list immediately following the count is correct and matches the shipped block exactly; only the parenthetical tally is wrong, in a ticket document rather than in shipped prose."
  - id: F-005
    severity: note
    summary: "\"producing an isolated artifact is direct work: no ticket, no branch, no worktree\" could be read as licence to commit a standalone file without a board record, which conduct rule 4 (\"The ticket precedes the branch. No board record, no PR.\") forbids."
    disposition: accepted-risk
    reason: "Not an actual contradiction: rule 4 constrains PRs, and direct work by definition opens none. The very next sentence bounds it — \"Track work when it changes this repo's shipped behaviour or when the owner asks\" — so an artifact that lands in the repo is tracked work. Residual ambiguity is small and the wording is the ticket's literal specification."
  - id: F-006
    severity: note
    summary: "kanmer-gate is red on this head with a single finding, NO_REVIEW_RECORD (\"no scratch/review.md review attestation was recorded\"); STALE_REVIEW skipped, SYNC_REQUIRED unrecorded. All eight other gate checks pass."
    disposition: fixed
    reason: "The gate was red only because this attestation did not yet exist. It is written now; the board must be pushed and kanmer-gate re-run green before any merge."
---

# Review — DOC-028, PR 321 @ `657e016137a38fe7c7fe0a8ae4b893ff0562c727`

Round 0 consolidated review. Independent: the reviewer is not the author
(`claude-code`), wrote none of the diff, and did not merge, push, or move the
ticket.

## What changed

Six files, +98/-12, exactly the plan's "Expected files" set and nothing else:

| File | Change |
|---|---|
| `scripts/agents-block-body.mjs` | the five `BLOCK_BODY` bullet edits |
| `plugins/kanmer/scripts/agents-block-body.mjs` | build mirror, byte-identical to the canonical file |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | fenced copy hand-synced |
| `AGENTS.md` | managed block regenerated |
| `scripts/verify-agents-block.mjs` | checks 10-13 added after check 9 |
| `scripts/agents-block-routing.test.mjs` | new `node:test` fixture (4 tests) |

`plugins/kanmer/mcp/kanmer-mcp.cjs` is absent from the diff — byte-unchanged
vs `origin/main` (`c088be13`), as the plan required.

## Mechanical verification performed

**Wording.** All five bullets were byte-compared (`grep -Fxq` on whole lines)
against the literal text in `plan/plan.md` §"Required changes": five exact
matches, no drift in punctuation, em dashes, backtick escaping or the `→`
arrows.

**Nothing else moved.** `diff origin/main head` on `scripts/agents-block-body.mjs`
is one hunk: 3 removed lines, 5 added lines, all bullets. Mechanically:
`BLOCK_BODY.slice(indexOf("## Agent conduct"))` is byte-identical between
`main` and head, so the 24 numbered rules and the `**Scope**` / `**Build**` /
`**Prove**` / `**Conduct**` headings (each present exactly once) are untouched.
Both board-branch paragraphs — the `KANMER_BOARD_BRANCH` / `kanmer-board`
paragraph above the list and the local-MCP-convention paragraph below it — are
byte-identical.

**Mirrors.** Programmatically, importing head's `BLOCK_BODY` and slicing each
marker region:
- `kanmer-setup/SKILL.md` fenced region `=== BLOCK_BODY + "\n"` → true
- `AGENTS.md` block region `=== BLOCK_BODY + "\n"` → true
- `plugins/kanmer/scripts/agents-block-body.mjs` `cmp`-identical to
  `scripts/agents-block-body.mjs` → true (identical on `main` too)

**Bullet order** in the regenerated `AGENTS.md` is exactly the plan's stated
order: resolve-request-first, session-start, doc-gates, stages, gates-constrain,
open-questions, read-what-the-step-needs, branch/worktree, set_ticket_doc,
proof-on-integration-branch, one-heavy-verifier, archive-not-delete,
skills-order, each-skill-names-next.

**`delivery.integrationBranch` is real.** `packages/mcp-server/src/index.ts:777`
spreads `resolveDelivery(board)` into `get_status.delivery`;
`packages/core/src/board.ts:230` sets `integrationBranch` from
`board.delivery?.integrationBranch ?? DEFAULT_INTEGRATION_BRANCH`. The live
`get_status` on this board returns `delivery.integrationBranch: "main"`, and
the default-`main` parenthetical in the new bullet is accurate.

## Do the new checks assert what they claim?

Checks 10-13 are four `check(...)` string-presence assertions in the existing
harness: absence of `Proof is written on merged`, presence of
`delivery.integrationBranch`, presence of both
`Resolve the request before starting a workflow` and
`One heavy verification owner per host`, presence of
`Deployment belongs to a release`. Each matches its stated purpose.

The routing test uses an exact-literal `split(needle).length - 1` occurrence
count — not a global regex — so it catches duplicates as well as deletions, as
the plan specified.

**Mutation-tested in a temp copy** (`/tmp/doc028mut`, never the worktree; the
worktree is clean at the head SHA and was not written to):
- deleting a sentence (`Ordinary Done means integrated and accepted there.` →
  `...here.`) → `AssertionError: expected exactly one occurrence of "Ordinary
  Done means integrated and accepted there."`
- duplicating `One heavy verification owner per host.` → same assertion fails
- breaking rule 24's numbering (`24. **` → `24 **`) → `AssertionError:
  expected 24 numbered rules, found 23`

The assertions bite in both directions. They are not vacuous.

## Reading the block as a consuming-repo agent

The five edits are internally consistent and consistent with Kanmer's actual
behaviour. Specific checks:

- **Rule 4, "The ticket precedes the branch. No board record, no PR."** No
  contradiction. Rule 4 governs PRs; direct work opens none, and the new
  bullet bounds itself with "Track work when it changes this repo's shipped
  behaviour or when the owner asks." Residual ambiguity recorded as F-005.
- **"Never bypass a gate through late-stage creation or an empty `custom`
  profile"** complements rather than contradicts the existing "creation in any
  stage is ungated" bullet: one states the mechanism, the other forbids
  exploiting it. `custom` is a real effective profile on this board.
- **"Ordinary Done means integrated and accepted there"** matches the engine —
  `kanmer-verify` validates at the merge SHA on the integration branch, and
  `deploymentTracking` is a separate, non-gating concern (`get_status` reports
  it as `false` here).
- **Scoped loading** ("pull older attempts only when a claim or a failure
  investigation needs them") weakens no gate: `get_doc_gates` still decides
  what must exist, and the sentence governs reading, not writing.
- The only unresolvable reference is "the repo's operating index" (F-001), and
  the only surviving contradiction is a pre-existing non-block AGENTS.md
  comment (F-002). Neither changes what an agent does.

## Acceptance checks

Every acceptance check in the plan was re-run independently by the reviewer,
not taken from the report:

| Check | Result |
|---|---|
| `node scripts/verify-agents-block.mjs` | 35/35 PASS, including all four new checks |
| `node --test scripts/agents-block-routing.test.mjs` | 4/4 pass |
| `npm run test:scripts` | 184 tests, 184 pass, 0 fail (new file auto-discovered) |
| `npm run verify:skills` | ALL CHECKS PASSED (21 checks; FRD-023 R1 and CORE-139's no-escaping-link check both green) |
| `npm run verify:docs` | PASS — manual up to date, 22 chapters |
| `npm run check:manual` | manual up to date, 22 chapters |

Docs and the manual needed no regeneration, which is why the plan's
conditional Step 7 was correctly skipped: no command or convention outside the
managed block changed. The full `npm run verify` was not run (out of the
reviewer's remit); CI ran it — see below.

The ticket's four acceptance assertions each land in shipped prose and are
pinned by the routing test: read-only discussion → direct work, no ticket;
ordinary revert → "Direct work runs none of them" plus the profile-by-
consequence clause; a two-line authorization change → "still owes its
profile's evidence"; a non-`main` integration branch → the
`delivery.integrationBranch` bullet.

## CI

Workflow run `33938959062` on this head:

| Job | Result | Run/job |
|---|---|---|
| `verify` | pass, 9m25s | 33938959062 / 101235479811 |
| `kanmer-gate` | fail, 57s | 33938959062 / 101235477055 |
| `regate` | skipping | 33938959062 / 101235477884 |

`kanmer-gate`'s only failing check is `NO_REVIEW_RECORD` — the pre-attestation
bootstrap state (F-006). Its other eight checks pass, including
`WRONG_TARGET` ("pull request targets the integration branch \"main\"",
integrationBranch `main`), `WRONG_STAGE` (review), `OPEN_QUESTIONS` (0 of 0),
and `DEPENDENCY_BLOCKED` (no live blockers). `STALE_REVIEW` was skipped and
`SYNC_REQUIRED` recorded `unrecorded` for the same reason.

## Review threads

The GraphQL `reviewThreads` surface returns zero nodes on this head — no human
threads and no bot threads, so there is nothing to classify by root cause and
`threads_snapshot` is truthfully empty. No expected reviewer other than this
one was named; it has settled on this exact head.

## Residual risk and merge preconditions

Residual risk is F-001 through F-005: two minor prose/consistency items and
three notes, none of which changes agent behaviour, all dispositioned. No
finding of any severity is `open`.

The verdict is `pass`, but the merger must still, in this order: push the
board (this attestation advances it past `15eb74ed`), re-run `kanmer-gate`,
and confirm it is green with `SYNC_REQUIRED` satisfied against the pushed
board. `mergeStateStatus` is currently `BLOCKED` for exactly that reason. This
reviewer has not merged, has not pushed, and has not moved the ticket.
