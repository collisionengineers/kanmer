---
kind: review-attestation
pr: "299"
head_sha: "5926adea745a73381dc8b1ee41521644c3b45ecd"
verdict: pass
reviewer: "claude-opus-5-independent-reviewer"
independent: true
plan_hash: "410a4b9856e3c356"
ticket_updated: "2026-08-28T04:07:47.728Z"
board_sha: "0d026e7e384c88a0f1a1aa2c0f7576b29c9e2114"
expected_reviewers: []
threads_snapshot:
  - thread: 1
    author: "chatgpt-codex-connector"
    path: "packages/core/src/types.ts"
    claimed_severity: "P1"
    resolved: false
    finding: "F-007"
  - thread: 2
    author: "chatgpt-codex-connector"
    path: "plugins/kanmer/skills/kanmer-execute/SKILL.md"
    claimed_severity: "P1"
    resolved: false
    finding: "F-002"
  - thread: 3
    author: "chatgpt-codex-connector"
    path: "packages/core/src/board.ts"
    claimed_severity: "P2"
    resolved: false
    finding: "F-003"
  - thread: 4
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/index.ts"
    claimed_severity: "P1"
    resolved: false
    finding: "F-001"
  - thread: 5
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/index.ts"
    claimed_severity: "P2"
    resolved: false
    finding: "F-004"
  - thread: 6
    author: "chatgpt-codex-connector"
    path: "packages/core/src/board.ts"
    claimed_severity: "P2"
    resolved: false
    finding: "F-005"
  - thread: 7
    author: "chatgpt-codex-connector"
    path: "packages/core/src/store.ts"
    claimed_severity: "P2"
    resolved: false
    finding: "F-006"
findings:
  - id: "F-001"
    severity: "minor"
    summary: "dispatch_task's verify prompt computes its verification target as resolveDelivery(board).integrationBranch (index.ts) instead of deliveryTargets(policy, item).verificationTarget, so a ticket whose recorded delivery_branch is the release branch is told to verify the integration branch. This is the one place the claimed single shared hotfix/target rule is not literally used."
    disposition: "accepted-risk"
    reason: "Wrong only for a recorded hotfix on a project whose release branch differs from its integration branch; identical to the correct value in every other case, including every case on this repository (main-only). No FRD-031 acceptance criterion depends on it: AC1/AC2 exercise non-hotfix flows where integrationBranch == verificationTarget, and AC5 is a store-side backport derivation that does not read the prompt. The execution packet, which the verifier also holds, carries the correct verificationTarget. Recorded as residual risk per FRD-034 rather than filed, to avoid converting an accepted risk into horizon growth."
  - id: "F-002"
    severity: "minor"
    summary: "kanmer-execute SKILL.md instructs `git fetch origin` and then `git worktree add ... origin/<delivery.baseBranch>`, while telling the worker to record the packet's delivery.baseSha. The packet resolves baseSha before that fetch, so if origin/<baseBranch> advances between packet and fetch the recorded base SHA is not the commit the worktree started from."
    disposition: "accepted-risk"
    reason: "baseSha is advisory execution material, not proof; FRD-031's AC1 binds verification to the exact *merged* SHA, which is read post-merge and is unaffected. The window is the seconds between get_execution_packet and git fetch. The fix is a one-line SKILL.md change (create the worktree at delivery.baseSha when baseShaState is resolved) and belongs with SKILL-036, which already owns the skill-prose lane for delivery targets."
  - id: "F-003"
    severity: "minor"
    summary: "DELIVERY_BRANCH_RE in board.ts rejects only whitespace, `..` and leading/trailing `/`. It is not Git's ref-format rule, so a policy such as integrationBranch: \"dev~1\" is accepted at board write time and only surfaces later as baseShaState: \"unavailable\" plus a failing worktree command."
    disposition: "accepted-risk"
    reason: "Operator-authored configuration, not caller input; the failure is immediate, loud and local to the project that declared it, and no data is corrupted. Kanmer core is deliberately git-free (plan Constraints), so a true check-ref-format validation cannot live in board.ts without spawning git there."
  - id: "F-004"
    severity: "minor"
    summary: "The list_items summary in index.ts emits the delivery block only when delivery_state or delivery_branch is present. The store permits a partial record (for example delivery_release_tag or delivery_candidate alone), so such a ticket carries delivery_recorded_at on disk while list_items reports no delivery record."
    disposition: "accepted-risk"
    reason: "Display-only; get_item and the ticket file are both complete and authoritative. The affected states are transient partial records that no documented workflow produces — every workflow path writes delivery_state, delivery_branch or both."
  - id: "F-005"
    severity: "minor"
    summary: "Changing the board delivery policy (renaming the integration branch, or setting hotfixBackport: false) does not re-derive delivery_backport_required on existing tickets, so a ticket can keep reporting an obsolete backport obligation. Re-sending an unchanged delivery patch returns through the no-op path before applyDeliveryEffects runs."
    disposition: "accepted-risk"
    reason: "A delivery policy change is a rare, deliberate operator act, and the stale value is a visible over-obligation (fails safe: it claims a backport is owed, never that one is not). Reconciling every ticket on a board write would make a config save an unbounded item-scan, which ADR-0021 and the plan's compatibility constraints both push against."
  - id: "F-006"
    severity: "minor"
    summary: "assertDeliveryAgainstBoard distinguishes only undefined from a supplied string for delivery_release_branch/delivery_release_tag, so a whitespace-only tag satisfies the released/deployed/production-verified evidence requirement."
    disposition: "accepted-risk"
    reason: "Requires a caller to deliberately write \"   \" as a tag; the empty string is already the documented clear sentinel, so the only way in is intentional garbage, and delivery state is non-gating (ADR-0005) so no gate can be passed by it. Same latitude the existing deployment field has."
  - id: "F-007"
    severity: "minor"
    summary: "Nine new delivery_* ticket frontmatter fields land with no GUI surface. AGENTS.md section 9's 'Add a new item frontmatter field' recipe step (4) says to surface a new field in Editor.tsx, and this PR does the MCP half only."
    disposition: "accepted-risk"
    reason: "The approved plan explicitly lists `apps/gui/**` under 'Do not modify', so this was scoped out before implementation, not skipped. Repository precedent supports it: capture_evidence, capture_disposition, lease_batch, lease_phase and claim_expires_at all landed with zero references anywhere under apps/gui/src/renderer. The recipe step is applied in practice to operator-editable fields (deployment, docs_todo) and not to agent-managed or derived ones, which is what delivery_* are (delivery_backport_required and delivery_recorded_at are derived and must never be operator-editable). The ticket's open-questions already park the GUI Settings half for the GUI lane."
  - id: "F-008"
    severity: "note"
    summary: "AGENTS.md gotcha 20 and open-questions Q2 both justify keeping the policy in board.yml partly because 'the merge gate's WRONG_TARGET check fails the very next PR that starts targeting the wrong branch'. WRONG_TARGET is in SOFT_CODES, so by default it warns and mergeGateOk stays true; it only fails under KANMER_GATE_STRICT."
    disposition: "accepted-risk"
    reason: "The mitigation is real but weaker than the prose states: a stripped policy produces a visible warning annotation on the next PR, not a block. The other two mitigations (main-only default, get_status.delivery.source reporting board vs default) stand as written, and the risk cannot bite this repository at all because its board carries no delivery block. Recorded so the wording is not mistaken for a hard guarantee."
  - id: "F-009"
    severity: "note"
    summary: "The new board.yml fence in AGENTS.md shows the delivery keys in snake_case (integration_branch, release_branch, ...) while the schema accepts only camelCase. BoardConfigSchema is a plain z.object(), so a copy-pasted snake_case block is silently stripped to `delivery: {}` — which is truthy, so deliveryPolicySource then reports source: \"board\" for an entirely default policy, defeating the very signal gotcha 20 relies on."
    disposition: "accepted-risk"
    reason: "The prose block immediately below the fence states the camelCase spelling explicitly and says the snake_case form is only there to match how goal.md reads. The mis-set outcome is the safe main-only default. Worth correcting in a future docs pass; not worth a merge round-trip or a ticket."
  - id: "F-010"
    severity: "note"
    summary: "The scope-split rationale states that goal.md already draws the seam between Phase 5 (delivery policy and state) and Phase 14 (release serialization). goal.md Phase 5 rules 6, 7 and 8 also name immutable release candidates, remediation minting a new candidate identity, and one active release lease per channel, so the seam is not as clean as the ticket, plan and PR body all assert."
    disposition: "accepted-risk"
    reason: "The split itself is sound and no acceptance criterion falls through: Phase 14 is where those three rules are specified in depth (persisted attempt record, lease, supersession, successor), and CORE-132 names FRD-031 AC2's candidate clause, AC3, AC4 and the unavailable-release-service edge case explicitly in its verification checkbox. Only the claim of a pre-drawn clean seam is overstated; the substance and the acceptance coverage are honest."
  - id: "F-011"
    severity: "note"
    summary: "assertDeliveryPolicy is invoked from writeBoard only, not from readBoard, so a hand-edited board.yml carrying an invalid branch name is accepted on read and only rejected the next time the board is written."
    disposition: "accepted-risk"
    reason: "Mirrors how assertUniquePrefixes already behaves on the same code path, so this is the established convention rather than a new gap, and a read-time throw would make a malformed file unreadable instead of correctable."
  - id: "F-012"
    severity: "note"
    summary: "Two counts in the post-implementation report do not match the diff: it claims delivery.test.ts is '(new, 50 tests)' where the file has 48 `it(...)` blocks, and '6 MCP checks' in smoke.mjs where the diff adds 7 `check(...)` calls."
    disposition: "accepted-risk"
    reason: "Report-accuracy only; both were verified directly against the head SHA and neither changes what shipped. The test-count claim overstates by two and the smoke-check claim understates by one, so this is sloppiness rather than a pattern of inflating coverage. Every other count in the report (39 tools, 6 delivery.test.mjs tests, the gates.ts/profiles.ts grep, SOFT_CODES membership) was checked and is exact."
  - id: "F-013"
    severity: "note"
    summary: "The diff modifies apps/gui/src/renderer/src/manual/chapters.generated.ts, which falls inside the `apps/gui/**` glob the plan lists under 'Do not modify'. Neither the plan's Expected Files table nor files.md names the path, and the report's deviation 8 explains why `npm run build:manual` was run without noting that its output lands in a forbidden directory."
    disposition: "accepted-risk"
    reason: "The file is a mechanically generated mirror of docs/manual/glossary.md, regenerated by `npm run build:manual` and required to keep `verify:docs` green after the glossary edit; I confirmed it is byte-identical to a fresh regeneration at the head SHA, so it contains no hand-written GUI change. The plan's intent — no GUI behaviour change — is met: the only non-generated GUI surface, Editor.tsx, is untouched. An undisclosed scope-list collision, not an undisclosed change."
---

# Review attestation — CORE-116, PR #299

Independent review at head `5926adea745a73381dc8b1ee41521644c3b45ecd`, base
`main` `bf0eaed4`, board `0d026e7e`. Reviewed in a dedicated detached worktree at
the exact head SHA; the implementation worktree `.worktrees/core-116` and the
board worktree `.worktrees/kanmer` were never modified.

**Verdict: pass.** Merge is not yet authorised — see *CI rail* below.

## What the change does

A `delivery:` block on `board.yml` (`integrationBranch`, `releaseBranch`,
`releaseCandidatePattern`, `hotfixBackport`) resolved by `resolveDelivery`, with
`deliveryTargets(policy, item)` as the single rule deciding base branch, PR
target and verification target. Nine additive `delivery_*` ticket frontmatter
fields validated by `assertDeliveryAgainstBoard` against the merged post-patch
record. A `WRONG_TARGET` merge-gate check fed by `pull_request.base.ref`. A
`delivery` block on the execution packet naming the exact base SHA. `get_status.delivery`,
and delivery parameters on `create_item` / `update_item`. No new tool, no board
format bump, no change to Kanmer's own repository policy.

## FRD-031 acceptance-criterion coverage

Read directly from `docs/functional/frd/FRD-031-configurable-delivery-and-release-state.md`,
not from the implementer's report.

| FRD-031 criterion | This PR | CORE-132 | Neither |
|---|---|---|---|
| AC1 — main-only fixture targets and verifies `main` at its exact merged SHA | yes | — | no |
| AC2 — dev-to-frozen-candidate-to-main: targets `dev`, proves integration, records final release separately | yes (targeting, integration proof, separate release record) | yes (immutable candidate creation) | no |
| AC3 — a changed candidate SHA requires a new candidate identity and new evidence | — | yes | no |
| AC4 — second concurrent release owner gets `RELEASE_CHANNEL_HELD`; terminal attempt clears the lease | — | yes | no |
| AC5 — a release-branch hotfix records its required integration backport | yes | — | no |
| Edge — unavailable release service records a bounded retry schedule | — | yes | no |
| Edge — release evidence never turns an unmerged feature branch into a verified ticket | yes | — | no |

**No criterion falls to neither.** CORE-132's verification checkbox names
"FRD-031 AC2 (immutable candidate half), AC3, AC4 and the
unavailable-release-service edge case" explicitly, CORE-116 `blocks` CORE-132,
and FRD-031 was not edited. Each of this PR's four claimed items has a named,
passing fixture in `packages/core/src/delivery.test.ts` (`FRD-031 AC1 —`,
`FRD-031 AC2 —`, `FRD-031 AC5 —`, `FRD-031 edge case —`).

The split corresponds to two already-approved phases — `goal.md:467` Phase 5 and
`goal.md:917` Phase 14 — though not as cleanly as claimed (see F-010).

## Reviewer focus points, verified independently

1. **Merged-record validation.** Confirmed. `assertDeliveryAgainstBoard` is
   called on `next` after the patch is applied and after `applyDeliveryEffects`,
   in both `createItem` and `updateItem`. Clearing depended-on evidence is
   refused: `updateItem(id, { delivery_sha: "" })` on a ticket recording
   `integrated` throws `DELIVERY_EVIDENCE_MISSING`, and the test at
   `delivery.test.ts:217` asserts exactly that. Executed and passing.
2. **One definition of "hotfix".** Confirmed for the hotfix rule itself:
   `deliveryTargets` in `board.ts` is the only place `hotfix` is computed, and
   the merge gate, the store's backport derivation and the execution packet all
   call it. It is evidence-based (`item.delivery_branch === policy.releaseBranch`),
   never a branch-name heuristic — a repository-wide grep for `hotfix` found no
   name matching anywhere. **One divergence did creep in**, however: the
   `dispatch_task` verify prompt derives its target from
   `resolveDelivery(board).integrationBranch` rather than from `deliveryTargets`
   (F-001).
3. **`WRONG_TARGET` under `KANMER_GATE_STRICT`.** Plainly: today the check is in
   `SOFT_CODES`, so `levelFor` returns `warning`, `mergeGateOk` ignores it, and a
   wrong target annotates without blocking. The day strict is enabled, three
   things change. (a) For this repository — no `delivery:` block, so expected
   target `main` — nothing changes; every PR into `main` still passes.
   (b) For any project whose PRs do not target its configured integration
   branch, the gate becomes a hard merge block. (c) A genuine hotfix PR passes
   only if the ticket's `delivery_branch` was recorded as the release branch
   *before* the gate ran; otherwise strict mode blocks a legitimate hotfix. Note
   also that an event carrying no `base.ref` stays `skipped` even under strict —
   strict does not guarantee the check actually ran.
4. **Policy in `board.yml` vs the Q2 sidecar.** I do not overturn it. The
   asymmetry gotcha 20 records is real and gotcha 15 shows the sidecar precedent
   (`project.json` exists precisely because `board.yml` strips unknown keys), so
   the tension is genuine. But the risk cannot reach this repository — FRD-031
   forbids giving Kanmer's own board a policy, so the only board a stable
   v0.3.12 server serves carries no block — the default direction is safe, and
   an operator looks for policy in the Settings editor, which reads `board.yml`.
   The mitigation prose overstates one point (F-008) and the AGENTS.md fence has
   a copy-paste hazard (F-009); neither changes the decision.
5. **Test assertions extended, never weakened.** Confirmed exhaustively. Across
   every test file the PR touches, exactly three existing lines changed:
   `merge-gate.test.ts` gained `"WRONG_TARGET"` in an ordered check list and a
   ninth `"skipped"` in an ordered outcome list (both strictly longer, both
   still `toEqual`), and `prompts.test.ts` replaced
   `expect(f.reason).toMatch(/merged main/)` with an exact `toBe` on the full
   string — a tightening. `git diff --numstat` over all test files and
   `smoke.mjs` shows 799 added lines against 3 deleted, all three accounted for.

## Other acceptance checks performed

- **Non-gating (ADR-0005).** `grep -c "delivery_"` returns 0 in both `gates.ts`
  and `profiles.ts`. The regression fixture proves a `production-verified`
  ticket with no `proof` is still refused entry to Done, and that the gate
  report contains no `delivery` string at all.
- **Derived fields are not caller inputs.** `delivery_backport_required` and
  `delivery_recorded_at` appear in `DELIVERY_FIELD_KEYS` but not in
  `DELIVERY_PATCH_KEYS`, `DeliveryPatch`, or either MCP tool schema. There is no
  path by which a caller records itself as owing nothing.
- **Artefact fidelity.** Ran `npm run build`, `node scripts/build-plugin.mjs`
  and `node scripts/build-manual.mjs` in the review worktree at the head SHA:
  `git status --porcelain` is empty. The committed
  `plugins/kanmer/mcp/kanmer-mcp.cjs` and `chapters.generated.ts` are
  byte-identical to a fresh rebuild — the bundle is a real rebuild, not a hand
  edit.
- **Roster and compatibility.** `registerTool` count is 39 and `smoke.mjs`
  asserts 39. No board format bump. Kanmer's board has no `board.yml` at all
  (synthesized default), so it gains no `delivery:` block, as FRD-031 requires.
- **Scope.** The diff touches no file the plan's *Do not modify* list protects,
  with the single generated-mirror exception recorded as F-013: FRD-031
  unedited, `.github/workflows/**` and `scripts/release*.mjs` untouched,
  `step-packet.ts` and `STEP_PACKET_VERSION` untouched, no hand-written
  `apps/gui/**` change, and none of CORE-128's five test files touched.
- **Checklist.** 55 of 55 items ticked, 0 unticked, and the load-bearing ones
  were re-verified against the head SHA rather than taken on trust.
- **Tests executed at the head SHA.** `delivery.test.ts` + `merge-gate.test.ts` +
  `prompts.test.ts`: 73 passed, 0 failed.
  `node --test packages/mcp-server/src/delivery.test.mjs`: 6 passed, 0 failed.

## Review threads

Seven unresolved threads from `chatgpt-codex-connector`, all dispositioned above
(F-001 through F-007). None is accepted at its claimed severity without
independent verification; two claimed P1s were materially overstated:

- The Editor.tsx P1 (F-007) cites an AGENTS.md recipe step, but the approved plan
  scoped `apps/gui/**` out before implementation and five prior agent-managed
  frontmatter fields landed the same way. Downgraded to minor.
- The hotfix-verification-target P1 (F-001) is a real divergence and the most
  substantive finding in the set, but it is wrong only for a recorded hotfix on
  a project with a distinct release branch, and no FRD-031 criterion depends on
  it. Downgraded to minor.

## CI rail

- `verify` — **SUCCESS** on this head (run 33140890003). This is authoritative
  over the local `npm run verify` exit 1, which the report attributes to the
  `scripts/antigravity-plugin-config.test.mjs` Windows EBUSY quirk owned by
  CORE-128.
- `kanmer-gate` — **FAILURE** on this head, and it is **not** a defect in this
  PR. The run executed at 04:08 against board `b90f6772`, where CORE-116 still
  read as stage `backlog` and no attestation existed: `WRONG_STAGE` failed and
  `NO_REVIEW_RECORD` warned. Every other check passed on that same run,
  including the new `WRONG_TARGET` (`pull request targets the integration
  branch "main"`, hotfix false) — useful independent evidence that the new check
  behaves correctly in CI. The board has since advanced to `0d026e7e`, which
  carries the Review move.

**Merge is therefore withheld.** This attestation must reach the remote board,
after which a re-gate (`gh workflow run pr.yml --ref main`, or the board-branch
push trigger) re-runs `kanmer-gate` against the current board. `WRONG_STAGE`,
`NO_REVIEW_RECORD`, `STALE_REVIEW`, `COMMITS_UNREACHABLE` and `SYNC_REQUIRED`
should all then pass — `board_sha` `0d026e7e` is the pushed tip, and the three
recorded commits are all reachable from this head. Only after `kanmer-gate` is
green may PR #299 be squash-merged and CORE-116 moved Review → Verifying.

## Residual risk

Thirteen findings, all minor or note, all dispositioned `accepted-risk` under
FRD-034's allowance that dispositioned minor/note findings may remain as
explicit residual risk. No blocker and no major finding. No finding blocks a
named FRD-031 acceptance criterion. No follow-up ticket is filed for any of
them; they are recorded here and remain accepted on this ticket.

The two most worth carrying forward for whoever next touches this surface:
**F-001** (the dispatch verify prompt is the one consumer that does not go
through `deliveryTargets`, so the "they cannot disagree" invariant in AGENTS.md
gotcha 20 is true of the gate and the packet but not of the prompt) and
**F-008** (`WRONG_TARGET` warns rather than fails by default, so the
board.yml-stripping mitigation is softer than the prose claims).
