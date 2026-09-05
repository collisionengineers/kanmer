---
kind: review-attestation
pr: "331"
head_sha: "415aeb692242547bd394af0e7376e5dbc94db111"
verdict: pass
reviewer: "independent-reviewer-core-141"
independent: true
plan_hash: "b5d971f65023c10d"
ticket_updated: "2026-09-05T16:06:24.628Z"
board_sha: "42d24bee2303848d524f117f972b79c5df20e314"
expected_reviewers:
  - "independent-reviewer-core-141"
threads_snapshot: []
findings:
  - id: "F-001"
    severity: minor
    summary: "The Runtime and security posture paragraph says \"CI now runs on Node 24\" without qualification. Verified at the reviewed head: .github/workflows/pr.yml pins node-version: 24 on both jobs (bumped inside this release window by CORE-140, 94165031), while .github/workflows/release.yml still pins node-version: 20. A reader can take \"CI\" to include the release workflow."
    disposition: accepted-risk
    reason: "No false statement is made: the notes never claim release.yml is on Node 24, and the release-workflow Node bump is a deliberate HZN-009 exclusion recorded in the group context.md (\"Electron runtime upgrade and release.yml Node bump (R2-DESKTOP)\"). The PR rail — the CI a contributor interacts with — genuinely runs on Node 24. Residual risk is imprecision in a public document, not a misrepresentation of what shipped; correcting it is a one-clause edit whenever the notes are next touched, and it is not worth returning a documentation-only PR whose full rail is green."
  - id: "F-002"
    severity: note
    summary: "\"a build-once stamp now refuses an already-built step whose inputs changed, so a stale artifact can never pass as current\" is an absolute mechanism claim in a release note."
    disposition: accepted-risk
    reason: "It describes the stamp's actual refusal behaviour, and the very next bullet honestly narrates the two bypasses that were found and closed (runner-script indirection and untracked directories, CORE-144), so the section as a whole does not present the guard as never having had a gap. It is not a performance or percentage guarantee, and there is no timing figure anywhere in the section (the 10m06s to 8m26s rail observation is absent). Residual risk: an absolute verb where \"is refused\" would be exact."
  - id: "F-003"
    severity: note
    summary: "`npm run release:notes` fails in a freshly created per-ticket worktree: node scripts/release-notes.mjs throws ERR_MODULE_NOT_FOUND for packages/core/dist/index.js because @kanmer/core has never been built there. Reproduced in .worktrees/CORE-141 at the reviewed head."
    disposition: rejected-with-reason
    reason: "Out of this PR's scope and not a regression from it: release-notes.mjs is a read-only drafting helper that prints to stdout, it is not invoked by scripts/release.mjs at any point in the cut sequence, and the failure is the ordinary unbuilt-workspace prerequisite (the same class of prerequisite CORE-145 fixed for the HTTP test path, which release.mjs's own rail satisfies by building core). The release-notes content this PR carries was authored from the board, not from that script, and every claim in it was independently re-derived from the board and the tree during this review."
  - id: "F-004"
    severity: note
    summary: "The notes say \"The live board stays on `report` policy for this release\" and \"this release leaves the live board in `report` policy\", but never say that a board created fresh by 0.4.2 starts in `strict`. defaultBoardConfig() in packages/core/src/board.ts writes proofValidation: { mode: \"strict\" }, while resolveProofValidation() maps an absent key to { mode: \"report\", source: \"default\" } — so existing boards resolve to report and new boards do not."
    disposition: accepted-risk
    reason: "Truthful as written for every reader with an existing board, which is the whole 0.4.1 upgrade audience the section addresses, and confirmed against the live board: .kanmer/data/board.yml declares no proofValidation key, so it resolves to report with source default, exactly as claimed. The omission is the fresh-board case, which no 0.4.1 upgrader hits on upgrade. Residual risk is a mild surprise for someone initialising a brand-new board on 0.4.2; worth one clause in a future note, not a blocker on a release-notes PR."
  - id: "F-005"
    severity: note
    summary: "scripts/release.mjs publishes with `gh release create --notes-file \"${notesPath}\"`, so the whole of apps/gui/release-notes.md — the maintenance header comment and every historical section back to 0.3.8 — becomes the 0.4.2 GitHub release body, not just the 0.4.2 section."
    disposition: rejected-with-reason
    reason: "Pre-existing publishing behaviour that applied identically to v0.4.1 and every prior release; nothing in this PR changes it. The PR does the correct thing under that behaviour: it places the new section at the top of the file, which is precisely the convention the file's own header documents (\"the top section names the version being released\"). Slicing the published body to one section is a change to release.mjs, outside this ticket's bounded scope of the notes text."
---

# Review — CORE-141 (Release v0.4.2 notes), PR 331

Independent review of PR 331 at head `415aeb692242547bd394af0e7376e5dbc94db111`,
reviewed against board tip `42d24bee2303848d524f117f972b79c5df20e314` (pushed;
`boardSync.ahead` 0). Consolidated round 0. **Verdict: pass** on content, with
the merge gate's own state recorded below.

## Scope of the change

The PR is exactly one file. Confirmed twice and by two routes:
`gh pr diff 331 --name-only` returns only `apps/gui/release-notes.md`, and at
the Git level `git diff --stat $(git merge-base FETCH_HEAD origin/main)
FETCH_HEAD` is `apps/gui/release-notes.md | 41 +++++`, one commit
(`415aeb69 Draft 0.4.2 release notes (Delivery Recovery) (CORE-141)`), 41
insertions, no deletions. No manifest bump, no tag, no publish — matching both
`plan/plan.md` ("This CORE-141 ticket's own PR (release notes only) carries no
version bump, tag, or publish") and the post-implementation report.

## The notes as a truthfulness document

**Roster.** All ten HZN-009 delivery tickets are `done` on the live board and
every `delivery_sha` matches the SHA the PR body's table cites, with the PR
number matching the recorded `prs[]` entry:

| Ticket | board status | delivery_sha (prefix) | cited | PR |
|---|---|---|---|---|
| DOC-028 | done | `bd36854967b0…` | `bd368549` | #321 |
| GUI-152 | done | `32aa54fc0c7f…` | `32aa54fc` | #323 |
| CORE-140 | done | `941650317be4…` | `94165031` | #322 |
| DOC-026 | done | `37b83b143560…` | `37b83b14` | #326 |
| MCP-057 | done | `e474f317eaf7…` | `e474f317` | #325 |
| CORE-138 | done | `9945b1f2a0a4…` | `9945b1f2` | #324 |
| CORE-144 | done | `de5bace9245f…` | `de5bace9` | #327 |
| CORE-145 | done | `58718455ffc2…` | `58718455` | #328 |
| CORE-129 | done | `410bfd22c2ad…` | `410bfd22` | #329 |
| CORE-147 | done | `4a1c3a235ccd…` | `4a1c3a23` | #330 |

Every one carries `delivery_state: integrated`. `get_group HZN-009` reports
10 of 11 members `done`, the eleventh being CORE-141 itself in Review. Each of
the ten maps onto exactly one bullet of the notes, and no bullet describes work
outside that roster.

**Runtime and security paragraph.** Confirmed against the reviewed tree:
`apps/gui/electron-builder.yml` pins `electronVersion: 31.7.7`, and
`apps/gui/src/main/index.ts:412-417` has `webPreferences: { preload, sandbox:
false, contextIsolation: true, nodeIntegration: false }` on the main window.
The paragraph states end-of-support and `sandbox: false` explicitly, states
that **no new runtime or security-posture claim** is made for the desktop
artifact, and scopes requalification to 0.5.0 — which matches HZN-009
`context.md`'s "deliberately excluded from R1" list (R2-DESKTOP). The Node
claim is F-001. The qualified new surface is stated as the MCP server, the
MCPB bundle and the plugin skills, "not the desktop shell" — which is the
route recorded in the ticket body and the group's binding statement.

**Operating changes.** The paragraph does separate the two CORE-138 mechanisms
rather than conflating them: draft-first handoff (gate advisory while draft,
hard on ready) is one sentence, and the `edited`-event concurrency carve-out
is introduced with "Separately, a PR description edit no longer cancels an
in-progress required `verify` run — a new push still supersedes the previous
run, as it always did." The Fixed bullet does the same with "Two separate
mechanisms". This is the distinction the plan's corrections asked for.

**Proof policy.** The claim that the live board stays on `report` is true and
was verified at the mechanism, not taken on trust: `.kanmer/data/board.yml`
declares no `proofValidation` key, and `resolveProofValidation` in
`packages/core/src/board.ts:233` maps an absent key to `{ mode: "report",
source: "default" }`. The notes also correctly present the strict cutover as a
deliberate later operator decision, matching the plan's decision rule. The
fresh-board asymmetry is F-004.

**Known issues.** The five listed ids all exist on the live board, all are
`backlog`, all are in HZN-010, and each description matches its ticket title:
CORE-142 (gate-only hosted check plus blocking current-head attestation, needs
repository administration), CORE-143 (heavy-verification permit, procedural in
0.4.2), CORE-146 (explicitly "scheduled for 0.5.0 (HZN-010)" — the plan's
correction that it must not be called unscheduled is honoured), GUI-153 (Focus
Board UI-C+D), MCP-058 ("Intermittent smoke failure: 'ready packet is
read-only' tree snapshot differs on a slow runner"). Nothing false, nothing
omitted from the set I was asked to check.

**No percentage or guarantee language.** Grepped the 0.4.2 section for `%`,
"guarantee", "faster", speed multipliers and `NmNNs` timing figures: none
present. The 10m06s to 8m26s rail figure does not appear at all, so the
labelling requirement is moot. The only absolute phrasing is F-002.

**Corrections from the plan.** The receipt-rejection demonstration is credited
only to MCP-057's bullet and is not attributed to CORE-138/144/145; DOC-026's
retirement claim is true (`CLOSEOUT_PLAN.md` is absent from the tree and
AGENTS.md §0.1 "Operating index and historical documents" records it as retired
2026-09-05, superseded by the release notes and the HZN-008 closeout — so
"nothing still points at it as current instruction" holds); "Boards need no
migration" is true (`CURRENT_FORMAT = 3` unchanged, live board format 3).

## Release-script requirements on the notes

`scripts/release.mjs` places exactly two requirements on this file
(lines 289-298): it must exist, and `readFileSync(notesPath).includes(version)`
must be true. `## 0.4.2` satisfies the second. The file's documented convention
— new section at the top — is followed, and the section's heading structure
(`## <version>` with `###` subsections) matches every prior release back to
0.3.8. `guiPkg.version` is still `0.4.1`, below the `0.4.2` target, so
release.mjs's ordering guard is satisfiable after this merges. F-005 records
the whole-file publish behaviour as pre-existing.

`scripts/release-notes.mjs` is read-only by construction ("**Read-only.** It
prints to stdout and writes nothing"). I ran `npm run release:notes` in
`.worktrees/CORE-141`; it fails on an unbuilt `@kanmer/core` — F-003.

## Acceptance checks run

- `npm run verify:docs` in `.worktrees/CORE-141` — PASS ("verify-docs: PASS —
  document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/
  provider boundaries, generated manual current").
- `npm run check:manual` in `.worktrees/CORE-141` — PASS ("manual: up to date
  (22 chapters)").
- Full `npm run verify` deliberately not run locally; CI owns the rail, per the
  horizon's operating controls.

## Checks and threads

- `verify` — **success**, 7m54s, run `33976822764`, job `101336009320`.
- `kanmer-gate` — the earlier attempt (job `101334889137`) failed at "Run the
  phase-2 merge gate"; the current attempt (job `101336008592`) is pending.
  This is the expected pre-attestation state: `KANMER_GATE_STRICT` is true and
  `check-pr.mjs` reads the fetched board, on which no current-head
  `scratch/review.md` existed. This record is written to satisfy it; the
  merge authority must confirm `kanmer-gate` is green on the regated run before
  merging, and must not treat a gate result predating this board push as
  current.
- `regate` — skipped (it only fires on `workflow_dispatch` or a push to main).
- Review threads on the head: **none**. `reviewThreads`, `reviews` and
  `comments` are all empty at gather time, re-checked immediately before this
  record was written. `threads_snapshot` is therefore empty as a truthful
  value. No bot thread exists; none is a gate.
- Expected reviewers: this reviewer only, settled on this exact head.

## Residual risk

Five findings, all dispositioned, none open, none blocker or major. The
residual risk is confined to wording precision in a public document (F-001,
F-002, F-004) and two pre-existing, out-of-scope tooling behaviours (F-003,
F-005). None of them changes what 0.4.2 actually ships, and none of them
misstates the runtime or security posture, the roster, or the proof policy.

## Not done here

The ticket is deliberately **not** moved and the PR is **not** merged: the
brief for this review withheld merge authority, and the cut sequence's later
steps (version bump, tag, publish, host install, rollback drill) belong to the
operator running `scripts/release.mjs`, not to review.
