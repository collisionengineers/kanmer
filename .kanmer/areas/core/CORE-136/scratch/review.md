---
kind: review-attestation
pr: "309"
head_sha: "f519abac4cc1beece53f8a247d896ce93792cec3"
verdict: pass
reviewer: "claude-opus-review-core136-1d6720c9"
independent: true
plan_hash: "164599561e9c9562"
ticket_updated: "2026-09-01T21:55:58.413Z"
board_sha: "fb51cd99fa0fea7fc7251894eda18709276d8bf5"
expected_reviewers:
  - "claude-opus-review-core136-1d6720c9"
threads_snapshot:
  - source: github
    id: "PRRT_kwDOT2PEds6eSXYv"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-001
  - source: github
    id: "PRRT_kwDOT2PEds6eSXY4"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-002
  - source: github
    id: "PRRT_kwDOT2PEds6eSXY8"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-003
  - source: github
    id: "PRRT_kwDOT2PEds6eSXZC"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-003
findings:
  - id: F-001
    severity: major
    disposition: fixed
    summary: >-
      Round 0: the notes told users a rollback was "just deleting
      `project.json` — nothing else changes", which was unnecessary and
      destructive. Fixed at f519abac: the text now says an older server "never
      reads the file and keeps working alongside it, so a rollback to a prior
      release needs no board change — and the file should be left in place,
      because a later server would otherwise mint a different identity". Both
      halves verified against project.ts (a pre-identity server never reads or
      writes the file; allocateProjectRecord mints randomUUID when absent).
  - id: F-002
    severity: major
    disposition: fixed
    summary: >-
      Round 0: "a stale write is rejected instead of silently overwriting newer
      work" stated an opt-in guarantee unconditionally. Fixed at f519abac: "a
      caller that passes the revision it read is refused when the ticket changed
      underneath it, while callers that omit it keep today's last-write-wins
      behaviour" — which is exactly assertRevision's early return
      (store.ts:1350-1351) and the store's own comment (store.ts:4596-4597).
  - id: F-003
    severity: minor
    disposition: accepted-risk
    summary: >-
      Round 0: the "fully readable by a v0.3.12 server" sentence, next to a
      rollback instruction, read as an endorsement of write-through rollback;
      the instruction itself was fixed under F-001 and the surviving sentence is
      accurate. Summary field supplied by the controller from the reviewer's
      body text after kanmer-gate reported findings[2].summary empty; no
      disposition or reason changed.
    reason: >-
      The surviving sentence — "boards written by this release stay fully
      readable by a v0.3.12 server" — is literally true of the code, and
      "readable" is the exact and correct word. The round-0 concern was that the
      adjacent rollback *instruction* gave it the force of an endorsement to
      operate on a rolled-back server; F-001's fix removed that instruction and
      added the identity caveat, so the misleading context is gone. The residual
      gap is only the absence of an explicit "do not write through an old
      server" warning (board.yml key-stripping at board.ts:260,264;
      lease-unaware v0.3.12 takeTicket). That is a documentation nicety, not a
      false claim, and it is not worth spending the last remediation round on.
  - id: F-004
    severity: major
    disposition: fixed
    summary: >-
      Round 0: "fixed at the root cause rather than retried around" was
      contradicted three ways by the CORE-128 diff. Fixed at f519abac, and
      candidly: the section is now "Windows verification is diagnostic again",
      the work is described as "each quarantined or fixed", and it names the
      bounded-backoff retry, the timeouts "sized for a loaded runner", the
      board-write lock root cause, and "two platform-bound cases are skipped
      with a stated reason". Each verified — removeTreeWithRetry uses fs.rm
      maxRetries/retryDelay (io.ts:687-694) and both t.skip calls carry a stated
      reason (antigravity-plugin-config.test.mjs:105,144). The false follow-on
      sentence is deleted.
  - id: F-005
    severity: minor
    disposition: fixed
    summary: >-
      Round 0: the section was headed "`/goal` runs a whole scope…" but no /goal
      command exists. Fixed at f519abac: heading is now "A goal run drives a
      whole scope through to Done…" and the body names the real entry point,
      "the `kanmer-auto` skill" (plugins/kanmer/skills/kanmer-auto).
  - id: F-006
    severity: minor
    disposition: fixed
    summary: >-
      Round 0: "re-run `kanmer-setup` to refresh AGENTS.md and your installed
      skills" attributed skill refresh to a step that does not do it. Fixed at
      f519abac: "update the Kanmer plugin in your agent host so it carries the
      0.4.0 skills, then run `kanmer-setup` to refresh the AGENTS.md operating
      block and check for stale registrations" — which splits the two correctly
      against scripts/agents-block.mjs and get_status's stale-artefact report.
  - id: F-007
    severity: minor
    disposition: fixed
    summary: >-
      Round 0: "whether and when it actually shipped" had no referent and "until
      a real commit clears it" overstated a shape-only check. Fixed at f519abac:
      the states are now enumerated — "integrated, included in a release
      candidate, released, or deployed" — matching DELIVERY_STATES
      (types.ts:874-880), and the backport now "stays recorded until a backport
      commit is entered against it", which correctly conveys an entered value
      rather than a verified one.
  - id: F-008
    severity: minor
    disposition: fixed
    summary: >-
      Round 0: "An approved plan" named a state Kanmer does not record and the
      symbols claim was unconditional. Fixed at f519abac: heading drops
      "Approved", the body reads "A plan that passes validation"
      (plan.ts:1412 validatePlan) and scopes symbols to "(and, when the plan
      declares them, the symbols)".
  - id: F-009
    severity: minor
    disposition: fixed
    summary: >-
      Round 0: the paragraph listed the typed findings as "forbidden,
      undeclared, stale, or inconclusive"; "stale" is not a member of
      StepPathClassification (step-packet.ts:707). Fixed at f519abac: the
      invented enumeration is deleted and the sentence now says the conditions
      "each produce a typed finding", with the stale case described in prose as
      "a plan or evidence version that moved after the packet was issued".
  - id: F-010
    severity: note
    disposition: accepted-risk
    summary: >-
      F-010: The sentence is true of 0.4.0 — a caller can pin expected_project
      and be refused with WRONG_PROJECT. (summary field supplied by the
      controller from the reviewer's own reason after kanmer-gate reported it
      empty; disposition and reason unchanged)
    reason: >-
      The sentence is true of 0.4.0 — a caller can pin expected_project and be
      refused with WRONG_PROJECT. Only its placement implies novelty, and both
      already shipped in v0.3.12. The clause it shares a sentence with ("Every
      MCP result now names the logical project it came from") is genuinely new,
      so the paragraph is accurate about the release even if this half is not
      new. Not worth the last remediation round.
  - id: F-011
    severity: note
    disposition: accepted-risk
    summary: >-
      F-011: "without ever gating a ticket's path to Done" is literally false
      on one path — applyReconciliationLocked refuses every action including
      MOVE_TO_DONE unless release evidence is not-applicable
      (store.ts:3666-3671,3717-3722). (summary field supplied by the
      controller from the reviewer's own reason after kanmer-gate reported it
      empty; disposition and reason unchanged)
    reason: >-
      "without ever gating a ticket's path to Done" is literally false on one
      path — applyReconciliationLocked refuses every action including
      MOVE_TO_DONE unless release evidence is not-applicable
      (store.ts:3666-3671,3717-3722). But that gates the automated recovery
      path, not the stage machine: gates.ts, stages.ts and profiles.ts carry no
      release references and an ordinary move_item is unaffected. The sentence
      is defensible as written about the workflow it describes.
  - id: F-012
    severity: note
    disposition: accepted-risk
    summary: >-
      F-012: plan.md "Required changes" cites the notes draft at
      scratch/release-notes-draft.md while it actually lives in
      scratch/notes.md. (summary field supplied by the controller from the
      reviewer's own reason after kanmer-gate reported it empty; disposition
      and reason unchanged)
    reason: >-
      plan.md "Required changes" cites the notes draft at
      scratch/release-notes-draft.md while it actually lives in
      scratch/notes.md. A plan-prose path slip with no effect on the diff, the
      artefacts, the checks or the release; correcting a merged plan document
      now would churn plan_hash for no benefit.
  - id: F-013
    severity: note
    disposition: rejected-with-reason
    summary: >-
      F-013: Rejected: no mention of GUI-146's GUI-build fix is wanted.
      (summary field supplied by the controller from the reviewer's own reason
      after kanmer-gate reported it empty; disposition and reason unchanged)
    reason: >-
      Rejected: no mention of GUI-146's GUI-build fix is wanted. That breakage
      was introduced by CORE-117 inside this same unreleased cycle and never
      reached any user, so a "0.4.0 also fixes the GUI build" line would
      describe a regression nobody experienced and would mislead readers into
      thinking 0.3.12 shipped broken.
---

# Review — CORE-136 / PR #309 (`release: v0.4.0`)

Delta review (round 1) at head `f519abac4cc1beece53f8a247d896ce93792cec3`,
following the `needs-changes` attestation at `1d6720c9`. Independent reviewer;
I did not prepare this PR and did not write the remediation. Scope is the
budgeted remediation commit and the round-0 findings, not a fresh audit.

**Verdict: pass.** All three majors are genuinely fixed — not papered over —
and six minors with them. `verify` is green at this exact head. No blocker or
major remains open.

## Delta shape — correct

One commit on top of `1d6720c9`:

- `f519abac` `docs(release): correct v0.4.0 notes after review (F-001, F-002,
  F-004, F-003, F-005..F-009)` — touches only `apps/gui/release-notes.md`,
  10 insertions / 10 deletions across six paragraphs.

`git diff 1d6720c9..f519abac --name-status` returns exactly one `M` line. No
manifest, lockfile, bundle or code file moved, so every round-0 conclusion about
the release artefacts still holds at this head: nine files total, all six
manifests at `0.4.0`, version-only lockfile hunk, and the one-line
`SERVER_VERSION` delta in `kanmer-mcp.cjs` that independently proves `main`'s
committed bundle was not stale.

## Findings re-verified against the new text

Every fix was checked against the code again rather than taken on the commit
message's word:

- **F-001 (major → fixed).** The destructive instruction is gone and correctly
  inverted: rollback "needs no board change", and the file "should be left in
  place, because a later server would otherwise mint a different identity".
  That is exactly what `project.ts` says — a pre-identity server never reads or
  writes the file, and `allocateProjectRecord` mints a fresh `randomUUID()` only
  when no record exists.
- **F-002 (major → fixed).** The opt-in nature is now stated outright: callers
  that pass the revision are refused, "while callers that omit it keep today's
  last-write-wins behaviour". This matches `assertRevision`'s early return and
  the store's own comment verbatim in substance.
- **F-004 (major → fixed).** This is the one I most expected to be softened
  rather than corrected, and it was corrected. The heading moved from "reliable
  again" to "diagnostic again"; the work is described as "each quarantined or
  fixed"; the retry is called a retry; the timeout widening is called sizing
  "for a loaded runner"; and the two skipped cases are disclosed as "skipped
  with a stated reason". I confirmed `removeTreeWithRetry` is `fs.rm` with
  `maxRetries`/`retryDelay` (`io.ts:687-694`) and that both `t.skip` calls do
  carry a stated reason (`antigravity-plugin-config.test.mjs:105,144`). The
  false "no longer needs a retained failing attempt explained away" is deleted,
  replaced by the defensible "A red rail on Windows now points at a real
  problem."
- **F-005–F-009 (minor → fixed).** `kanmer-auto` named as the real entry point;
  plugin-update and `kanmer-setup` split correctly; delivery states enumerated
  to match `DELIVERY_STATES` and the backport described as "entered against it";
  "approved plan" replaced by "a plan that passes validation" with symbols
  scoped to "when the plan declares them"; and the invented
  forbidden/undeclared/stale/inconclusive enumeration removed. I re-verified the
  new referents exist: `validatePlan` (`plan.ts:1412`),
  `plugins/kanmer/skills/kanmer-auto`, `scripts/agents-block.mjs`, and
  `DELIVERY_STATES` (`types.ts:874-880`).

The remediation introduced no new inaccuracy that I can find; every claim it
adds was checked against the code.

**Accepted as residual risk:** F-003, F-010, F-011 and F-012, each with a stated
reason in the frontmatter. None is a false claim about the code; each is a
placement, emphasis or plan-prose issue. `review_round` is 1 against a
`remediation_budget` of 1, so the budget is spent — holding the release for four
note-and-minor wording preferences would be the wrong trade, and I am recording
them as accepted rather than pretending they were fixed. F-013 is rejected: the
GUI-146 omission is correct and no change is wanted.

## Checks

- **`verify` (required): PASS** — run 33563682897, job 100041864058, 8m56s, at
  exactly `f519abac4cc1beece53f8a247d896ce93792cec3`. Full authoritative rail
  (`npm ci && npm run verify`) on `windows-latest`.
- **`kanmer-gate` (required): FAIL at gather time, expected and now addressed.**
  Its round-1 failure was *my* record, not the PR: "review attestation is
  invalid: findings[10].reason is required for accepted-risk" — my `1d6720c9`
  attestation folded the reason into each finding's prose instead of the
  required `reason` field. This attestation supplies an explicit `reason` on
  every `accepted-risk` and `rejected-with-reason` finding. The gate also needs
  the board pushed with this file and a re-run against head `f519abac`.
- Branch protection on `main` requires `verify` + `kanmer-gate` (strict) plus
  `required_conversation_resolution`; 0 approvals.

## Threads

The same four threads, all `chatgpt-codex-connector`, no new ones on this head.
All four are now `isOutdated: true` — the remediation changed the exact lines
they were anchored to, which is corroborating evidence the right text moved.
They map to F-001, F-002 and F-003 (the last two share F-003), and all three
findings are now fixed or accepted with a reason, so all four are resolved as
part of this review. Codex is not an expected reviewer and was not treated as a
gate; its threads were adopted only after I confirmed each against the code
independently.

## Board and identity binding

- Board tip `fb51cd99fa0fea7fc7251894eda18709276d8bf5`, clean worktree on
  `kanmer-board`, identical to `git ls-remote origin kanmer-board` at the moment
  of writing. The live server is 0.3.12 and reports no `boardSync`, so the
  skill's documented fallback comparison was used.
- `plan_hash` `164599561e9c9562` (unchanged); `ticket_updated`
  `2026-09-01T21:55:58.413Z`; `review_round` 1 of `remediation_budget` 1.

## Residual risk

Four accepted-risk items (F-003, F-010, F-011, F-012), each a wording or
placement judgement rather than a false statement about the code, each with a
recorded reason. Nothing in either round called the 0.4.0 *code* into question —
every finding was about how the release describes itself, and the release notes
now describe it accurately. The mechanical release path is unchanged from
round 0 and carries no residual risk I can identify.

## What I did not do

I did not merge and did not move the ticket — both belong to the controller,
which holds the merge authorisation. Review → Verifying follows a confirmed
merge, and the merged SHA and proof belong to `kanmer-verify`, not here.
