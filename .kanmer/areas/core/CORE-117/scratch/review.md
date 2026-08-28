---
kind: review-attestation
pr: "298"
head_sha: "cbd05ca5dd925989c5d556aa00b2b60a0e2b0a98"
verdict: pass
reviewer: "claude-core117-independent-reviewer"
independent: true
plan_hash: "ed75df35b26e959a"
ticket_updated: "2026-08-28T02:20:16.444Z"
board_sha: "aed6fc35750ec6c21ca35458023cba5f79df824d"
expected_reviewers:
  - "claude-core117-independent-reviewer"
threads_snapshot:
  - id: "PRRT_kwDOT2PEds6dCozD"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 2071
    finding: "F-001"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCozH"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 691
    finding: "F-002"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCozL"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/execution-packet.ts"
    line: 506
    finding: "F-003"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCozQ"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/profiles.ts"
    line: 168
    finding: "F-004"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCozS"
    author: "chatgpt-codex-connector"
    path: "apps/gui/src/renderer/src/lib/standup.ts"
    line: 96
    finding: "F-005"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCozW"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 2123
    finding: "F-006"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCozY"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 2130
    finding: "F-007"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCozb"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    line: 691
    finding: "F-008"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dCoze"
    author: "chatgpt-codex-connector"
    path: "apps/gui/src/renderer/src/components/Editor.tsx"
    line: 26
    finding: "F-009"
    resolved: true
findings:
  - id: "F-001"
    severity: minor
    summary: "A bare `update_item {profile: <non-capture>}` promotes a capture with no recorded disposition, actor or timestamp; the ticket then moves freely."
    disposition: accepted-risk
    reason: "Reproduced against the built core (`profile=chore disposition=NONE`, then a clean move to Preparing). FRD-032 locks delivery — take, move, execution packet — not the `profile` field, and a bare profile edit is an explicit deliberate act, never the autonomous selection the FRD guarantees against. It is also currently the only correction path for a mis-recorded terminal disposition that `CAPTURE_ALREADY_DISPOSED` otherwise freezes. Recommended for one follow-up ticket with F-006 and F-007."
  - id: "F-002"
    severity: minor
    summary: "`create_item` accepts `profile: capture` with any `status`, so a capture can be born outside Backlog (verified in `implementing` and `done`)."
    disposition: accepted-risk
    reason: "Creation is ungated by explicit pre-existing design (the D6 comment at store.ts:709-712 — imports and backfills). Probed: such a capture is inert — `take_ticket` and every forward `move_item` return CAPTURE_NOT_PROMOTED, only the backward move to Backlog is allowed, and group progress and the GUI standup exclude it regardless of stage. Cosmetic placement, not a delivery escape."
  - id: "F-003"
    severity: minor
    summary: "`dispatch_task` (mcp-server/src/index.ts:966-972) checks archived, taken and taskFeasibility but not the capture profile, so a background agent can be dispatched at an unpromoted capture."
    disposition: accepted-risk
    reason: "MCP dispatch is disabled by default behind an explicit operator allowlist and approval; GUI dispatch is a per-card human action. FRD-032 names goal selection, the roster and readiness metrics as the exclusions, not the dispatch surface, and plan/plan.md's bounded packet does not include it. Worst reachable outcome is a research document on a capture a human explicitly pointed an agent at. Recommended as a follow-up."
  - id: "F-004"
    severity: minor
    summary: "`capture` is now offered in the GUI Settings area-default selector (Settings.tsx:943-945 enumerates resolved profiles); choosing it freezes every profile-less ticket in that area in Backlog while none of the capture exclusions apply, and the refusal's suggested remedy is itself refused."
    disposition: accepted-risk
    reason: "Reproduced (ZZ-001 frozen with CAPTURE_NOT_PROMOTED, then CAPTURE_DISPOSITION_INVALID: not a capture, profile \"unset\"). This is a recorded decision, not an oversight: plan/plan.md Constraints states an area or board `defaultProfile: capture` is unsupported and out of scope, and docs/manual/profiles.md tells the user so. Recoverable by changing the area default. The dead-end error text should name the area default as the cause; folded into the follow-up."
  - id: "F-005"
    severity: minor
    summary: "`standup.ts` drops captures from Flags and Up next without adding the \"N captures awaiting a decision\" line the updated kanmer-report prose describes, so a Backlog of only captures shows no Up next section at all."
    disposition: accepted-risk
    reason: "That prose governs the agent-written standup, not the GUI report, so no shipped contract is contradicted. A first-class GUI capture affordance (composer, evidence control, captures filter) is already parked in this ticket's open-questions with a recommendation to file it as a separate GUI ticket in HZN-008."
  - id: "F-006"
    severity: minor
    summary: "A superseding disposition that omits `capture_result` keeps the previous decision's result, so the frontmatter records a new disposition beside a stale result."
    disposition: accepted-risk
    reason: "Reproduced: `retained` + result STALE-RESULT-123, superseded by `promoted`, yields `disposition=promoted result=STALE-RESULT-123`. A genuine audit-integrity defect in new code, but narrow — `retained` requires no result, so the stale value exists only when a caller volunteered one on a decision that did not need it. Recorded for the follow-up rather than held as a merge blocker."
  - id: "F-007"
    severity: minor
    summary: "`capture_disposition: duplicate` accepts the capture's own id as `capture_result`, linking the ticket to itself and archiving it as its own duplicate."
    disposition: accepted-risk
    reason: "Reproduced (`links=[\"TICK-002\"]` on TICK-002, `archived: true`). Reachable by a typo, but self-evident on the ticket and recoverable by unarchiving. Recorded for the follow-up with F-001 and F-006."
  - id: "F-008"
    severity: note
    summary: "On a legacy format-1 board a non-ticket type (`plan`/`research`) may carry `profile: capture`, and the capture stage refusal never runs there."
    disposition: accepted-risk
    reason: "Unreachable on a format-2 board — `create_item {type: \"plan\", profile: \"capture\"}` is refused outright. On a format-1 board *every* document gate is already skipped, not just this one, because updateItem and assertMoveAllowed both guard assertDocGate behind `loc.kind === \"v2\"`. Pre-existing structural limitation, not introduced here."
  - id: "F-009"
    severity: note
    summary: "The `capture` entry is appended to two duplicated `PROFILE_IDS` arrays (Editor.tsx:26, TicketCreate.tsx:5) rather than derived from core's profile set."
    disposition: rejected-with-reason
    reason: "Both arrays predate this PR; it appends `capture` to each consistently and introduces no new divergence. Centralising them on core's effective profile set is a worthwhile GUI cleanup but lies outside this ticket's bounded packet, and review does not silently widen scope into an unauthorised refactor."
  - id: "F-010"
    severity: note
    summary: "Checklist items 30 and 31 are left unticked although both are complete (the PR is open with its footer, the report is written, and the ticket stopped in Review)."
    disposition: accepted-risk
    reason: "Bookkeeping only. Checklist completion is not a gate — `questions-resolved` reads open-questions, not the checklist, and every open question is ticked or explicitly parked. The board record understates the work rather than overstating it."
  - id: "F-011"
    severity: note
    summary: "The installed v0.3.12 server carries none of the capture refusals, so an older binary can still move or take a capture on a board that contains one."
    disposition: accepted-risk
    reason: "Verified: requirementsFor (profiles.ts:249) resolves an unknown profile id to `{}`, so v0.3.12 reads a capture as zero-requirement and preserves the six `capture_*` keys through `.passthrough()`; assertProfileAgainstBoard (store.ts:2502-2512) refuses to *set* `profile: capture` there because its resolveProfiles lacks the injection. Reading and editing are therefore safe and the board stays fully readable, which is what the plan's live-board compatibility constraint required. Enforcement being a property of the serving binary is inherent to any behavioural addition and was recorded deliberately rather than worked around."
  - id: "F-012"
    severity: note
    summary: "Local `npm test -w @kanmer/gui` failed in apps/gui/src/main/kanmerGit.test.ts on this host — 519/524 then, on rerun at the same SHA, 522/524 with a *different* failing pair."
    disposition: accepted-risk
    reason: "Host flake in the CORE-128 family, not a change effect. Both kanmerGit.ts and kanmerGit.test.ts are byte-identical to origin/main at 0f4a21fe; the failures are `Hook timed out in 10000ms` on git-worktree setup and are non-deterministic across two runs at the same SHA; individual passing cases in the same file took 3-30 s for sub-second git work on a host running 34 node processes and the live Kanmer GUI. The hosted `verify` job at cbd05ca5 — which runs the full suite on a clean runner — is green, and it is the authority."
---

# Review — CORE-117 (independent)

Reviewed PR [#298](https://github.com/collisionengineers/kanmer/pull/298) at head
`cbd05ca5dd925989c5d556aa00b2b60a0e2b0a98` against
`docs/functional/frd/FRD-032-quick-capture-and-promotion.md`, the ticket's plan
(`ed75df35b26e959a`), its checklist, open questions, files map and
post-implementation report. I am not the author (`claude-code` implemented it);
`independent: true` is truthful.

## What shipped

A capture is an ordinary ticket carrying a new `capture` profile whose
requirement map is empty (`packages/core/src/profiles.ts:160`), injected at read
time by `injectCaptureProfile` (`packages/core/src/board.ts:105-110`, applied in
`resolveProfiles` at `board.ts:172-174`) so boards that already carry their own
`profiles:` block — including the live one — gain it without a migration. The
observation is the ticket body; six optional additive `capture_*` frontmatter
fields carry evidence, actor and the one promotion decision
(`types.ts:494-513`, `frontmatter.ts:42-47`). No new MCP tool: `registerTool`
count is 39 before and after.

## Verdict on each area I was asked to break

**1. The enforcement choke point — holds, with one cosmetic hole.**
`assertDocGate` (`store.ts:2189-2201`) is genuinely the single path every stage
change takes: `updateItem:863`, `assertMoveAllowed:1063` (used by `moveItem`)
and `takeTicket:1404` all call it, and the GUI reaches core only through the
same three verbs (`apps/gui/src/main/index.ts:1234-1249`), so drag-and-drop is
gated identically. `applyReconciliation` is not a threat: `reconciliation.ts` is
a pure advisory classifier that never mutates a board, and `reconcile_ticket` is
read-only. `create_items` routes through `store.createItem`
(`mcp-server/src/index.ts:1379`), so bulk creation inherits every check.

I tried to break it with a live probe against the built core rather than by
reading. A capture created directly into `implementing` or `done` succeeds
(F-002) — creation is ungated by explicit pre-existing design — but it is inert
there: `take_ticket` returns `CAPTURE_NOT_PROMOTED`
(`store.ts:1352-1360`, deliberately placed *before* `assertDocGate` because a
take naming the current stage never reaches the gate), every forward `move_item`
returns `CAPTURE_NOT_PROMOTED`, and only the backward move to Backlog is
allowed. The one genuine escape is a bare `profile` change with no disposition
(F-001), which is an explicit act rather than autonomous selection.

**2. `injectCaptureProfile` vs ADR-0011 — the argument holds.**
ADR-0011's two limits govern *requirement* injection: limit 1 forbids gating
`leave-backlog`, limit 2 forbids adding a gated boundary a profile does not
already declare, because `collapsesPipeline` counts gated boundaries. This
injection adds neither: it adds a profile whose map is `{}`, so no existing
profile's boundary count moves and the `questions-resolved` pass is a no-op on
it (it only visits boundaries a profile already declares). ADR-0011's stricter
clause — "any future requirement proposing to read inside a document must clear
the three properties and amend this ADR" — is not engaged, because no
requirement is added. The claimed test exists and is real:
`capture.test.ts:80-87` asserts `resolveProfiles(legacyBoard())` deep-equals
`resolveProfiles(declared)` where `declared` sets `capture: {}` itself, which
pins the absence of collateral rather than just the presence of the key. The
non-regression side is independently confirmed by
`profile-matrix.test.ts` passing with an unchanged snapshot; its `PROFILES`
list is hardcoded at line 62, so the PIR's stated deviation from the plan's
"regenerate the snapshot" step is accurate rather than a skipped step.

**3. `captureDecisionEffects` — table correct, write genuinely atomic.**
The six-row table at `store.ts:2103-2159` matches `plan/plan.md:127-135` row for
row and FRD-032's six outcomes: `duplicate` links and archives, `already-fixed`
and `not-required` archive, `batch` requires a batch id and a non-capture
profile, `promoted` requires the profile, `retained` stays a capture and is
refused a smuggled profile change. Requiring a profile on `batch` is not in
FRD-032's prose but is necessary and was planned: without it a batched capture
could never be taken.

`retained` being the only supersedable decision is the right call and is
correctly implemented (`store.ts:2123-2131`) — after `promoted` the ticket is no
longer a capture so the earlier `isCaptureItem` refusal fires first, and after
the three archiving outcomes `CAPTURE_ALREADY_DISPOSED` fires. Its cost is that
a mis-recorded terminal disposition cannot be corrected through the API at all,
which is the other face of F-001.

Atomicity confirmed by reading, not asserted: `captureDecisionEffects` is
awaited at `store.ts:840` inside the `withLeaseLock` critical section CORE-125
introduced (`store.ts:822-825`), its result is merged into the same `pruned`
object as every other field, and the whole promotion lands in the one
`writeFileAtomic` at `store.ts:919`. Nothing writes a ticket file twice.

Two defects found here: F-006 (a superseding disposition keeps the previous
`capture_result`) and F-007 (`duplicate` accepts the capture's own id). Both
reproduced, both narrow, both recorded.

**4. FRD-032 acceptance 2 — met, and the implementer's claim is true.**
I verified the claim myself rather than accepting it. `packages/core/src/staleness.ts`
contains zero references to `Item`; its `StalenessInput` (`staleness.ts:81-100`)
takes paths, board, board source, format and the bundled skills dir — it is
repo-*artefact* staleness (skills tree, AGENTS block, board.yml, MCP
registration), and the ticket's original design guidance pointing at it was
simply wrong. The real stalled-ticket logic is
`apps/gui/src/renderer/src/lib/standup.ts`, which now derives `deliverable` at
line 96 and uses it for the Flags loop (line 173) and Up next (line 198), with
four new cases in `standup.capture.test.ts` including one asserting a *promoted*
capture returns to Up next.

Ruling: acceptance 2 is **met, not merely argued** — and met more strongly than
by exclusion. The readiness half is mechanical in core: `deriveMembers`
(`group-members.ts:13-19`) still lists captures but drops them from
`progress`/`total`/`complete`, so a capture can no longer hold a group below
100%. The roster half is prose in `kanmer-auto/SKILL.md:55-61`, but its
enforcement is not: even a roster that failed to exclude a capture cannot
deliver one, because take, move and packet all refuse. Prose describing an
enforced rule is the correct ordering, and the summary now carries
`capture: true` (`mcp-server/src/index.ts:399-401`) plus a `profile` filter on
`list_items`/`search_items` so the roster has a mechanical field to filter on.
The gap I record separately (F-003) is dispatch, which FRD-032 does not name.

**5. Required/optional fields — correct.**
`assertCaptureObservation` (`store.ts:2531-2543`) refuses a blank title or a
blank body with `CAPTURE_OBSERVATION_REQUIRED` at create
(`store.ts:689-691`), and `assertCaptureObservationRetained`
(`store.ts:2546-2552`) applies the same rule on update — including a patch that
tries to blank an existing capture's body, and one that sets
`profile: capture` on a ticket with no body. Empty or absent `capture_evidence`
is valid and `[]` clears the field (`store.ts:860`). Covered by
`capture.test.ts:147-183` and by two of the eight new smoke checks.

**6. v0.3.12 compatibility — confirmed true and harmless.**
The stable server cannot set `profile: capture`: `assertProfileAgainstBoard`
(`store.ts:2502-2512`) resolves profiles through its own `resolveProfiles`,
which lacks the injection, so the write is refused with "Unknown profile". It
*can* read and edit one: `requirementsFor` (`profiles.ts:249`) falls back to
`{}` for an unknown profile id rather than throwing, so a capture reads as
zero-requirement, and the six `capture_*` keys survive through the schema's
`.passthrough()` and `KEY_ORDER`. A board carrying captures therefore stays
fully readable and editable by the installed server. Recorded as F-011 that the
older binary also lacks the refusals.

**7. Existing-file edits — both necessary, neither weakened; no CORE-128 overlap.**
`board.test.ts:64-72` had to change because it asserts `toEqual` on the exact
sorted key list of `defaultBoardConfig().profiles`; the change adds `"capture"`
to that list and retitles the case. Still an exact-equality assertion, not a
subset — not weakened. `smoke.mjs:1092-1096` had to change because `summarise`
now emits `capture` and `capture_disposition`; the change adds exactly those two
ids to the exact `summaryKeys` array that is joined and compared. Also not
weakened, and it is joined by 88 lines of genuinely new capture assertions.
`git diff --name-only 0f4a21fe...cbd05ca5` confirms none of CORE-128's five
files (`io.test.ts`, `docs.test.ts`, `migrate.test.ts`, `store.test.ts`,
`scripts/antigravity-plugin-config.test.mjs`) appears in the diff.

**8. Roster and bundle.** `grep -c "^server.registerTool("` is 39 on both
`0f4a21fe` and `cbd05ca5`. The `plugins/kanmer/mcp/kanmer-mcp.cjs` diff contains
only capture-related lines — no unrelated drift — and `npm run plugin:check` in
the worktree reports `39 tools match, bundle bytes match`, which is the proof
the committed artifact was rebuilt from this diff.

## Independent verification (run in `.worktrees/core-117`)

| Command | Result |
|---|---|
| `npm test -w @kanmer/core` | **501/501 pass**, 22 files, exit 0 |
| `npm test -w @kanmer/gui` | **519/524**, 5 failed in `src/main/kanmerGit.test.ts` — host flake, see F-012 |
| `npx vitest run src/main/kanmerGit.test.ts` (rerun, same SHA) | **522/524**, a *different* pair failed with `Hook timed out in 10000ms` |
| `npm run typecheck` | exit 0 |
| `node packages/mcp-server/src/smoke.mjs` | **328/328 checks passed**, exit 0 |
| `npm run smoke:protocol` | **50/50 checks passed**, exit 0 |
| `npm run verify:skills` | `ALL CHECKS PASSED`, exit 0 |
| `npm run plugin:check` | `39 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 39 tools`, exit 0 |

Host quirks recorded exactly, per CORE-128: the GUI `kanmerGit.test.ts`
`Hook timed out in 10000ms` failures above are non-deterministic across two runs
at the same SHA on a file byte-identical to `origin/main`, on a host running 34
node processes and the live Kanmer GUI; individual passing cases in that file
took 3-30 s for sub-second git work. `plugin:check` ran in the worktree rather
than refusing (AGENTS.md §8 gotcha 8) because the implementer deliberately
installed real `node_modules` there, so workspace resolution no longer escapes
the checkout — and the repo-root checkout is on `main` and would have certified
the wrong bundle. The `http.test.mjs` `spawnSync ETIMEDOUT` baseline the
implementer reproduced on unmodified `main` was accepted rather than repeated;
`test:http` is outside the commands assigned to this review and the hosted
`verify` job is the authority.

Adversarial probes were run against the built core in a throwaway board, not
inferred: capture-in-a-working-stage, take/move refusals, bare profile change,
terminal-disposition correction, stale `capture_result`, self-duplicate, and the
area `defaultProfile: capture` case. Their outputs are quoted in the findings.

## Checks at `cbd05ca5`

Required contexts are `verify` and `kanmer-gate`; conversation resolution is
required; zero approving reviews are required.

- `verify` — **success** (run 33135597542, 02:20:07→02:24:57Z).
- `kanmer-gate` — failed on its first evaluation for one reason only:
  `WRONG_STAGE`, "CORE-117 is in stage \"preparing\"; expected review stage
  \"review\"", read against board tip `5ca37c9e`. Every other check in that run
  passed (`NO_TICKET`, `OPEN_QUESTIONS`, `DEPENDENCY_BLOCKED`,
  `COMMITS_UNREACHABLE`, `SYNC_REQUIRED`), with `NO_REVIEW_RECORD` a
  compatibility-period warning. The pushed board now carries CORE-117 in
  `review` (`origin/kanmer-board` at `aed6fc35`), so the job was rerun.
- `regate` — skipped by design.

## Review threads

Nine threads, all from `chatgpt-codex-connector`, none from a human. GitHub bots
are not a gate; every thread was still read on its merits, mapped to an F-id
(F-001…F-009 in `threads_snapshot`), reproduced or refuted with a live probe,
dispositioned, replied to with the reasoning, and resolved. Two of them
(F-001, F-002) reproduce findings I had already reached independently before
reading the threads; F-006 and F-007 are real defects I had not found; F-009 is
rejected as a pre-existing duplication outside the bounded packet. Unresolved
count is now zero.

## Residual risk

Nothing blocking. The load-bearing promise — a capture cannot be taken, cannot
move forward out of Backlog, and cannot be issued an execution packet — holds
under every probe I could construct. What remains is a cluster of narrow
robustness gaps around the promotion record itself (F-001, F-006, F-007), one
uncovered autonomy entry point (F-003), one documented-but-unrefused
configuration footgun (F-004), and one GUI reporting gap (F-005). I recommend
the controller file a single follow-up ticket in HZN-008 covering F-001, F-003,
F-004, F-006 and F-007, and a separate GUI ticket for F-005 alongside the
capture affordance already parked in this ticket's open questions.
