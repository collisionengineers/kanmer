# Group context — Kanmer reliable autonomy and multi-controller operation

## Feature outcome

Deliver the approved operating model while v0.3.12 remains the stable live board authority. The candidate must support recovery, safe concurrent controllers and workspaces, configurable delivery, a lightweight capture path, evidence-backed constrained execution, bounded exact-SHA review/verification, serialized releases, multiple independently bound projects, and promotion/rollback proof.

## Users affected

Operators coordinating Kanmer projects, constrained implementation agents, independent reviewer/verifier agents, and GUI users managing multiple projects.

## Acceptance criteria

- A broken or abandoned ticket state can be inspected dry-run first and safely reconciled without touching `.worktrees/kanmer` or deleting dirty work.
- Logical project identity is stable across local paths; every mutation is project- and revision-safe.
- Renewable leases make isolated and explicit batch workspaces safe across multiple controllers.
- Main-only and dev-to-candidate-to-main delivery policies, release ownership, and delivery state are correctly modelled.
- Captures stay lightweight and outside goal selection until explicit promotion.
- An approved constrained plan compiles to bounded packets; a durable `/goal` run reconciles every live transition, uses fresh exact-head review and exact-merge verification, and stops churn.
- Named project endpoints and the GUI support multiple projects without cross-project writes.
- Golden boards prove the preceding scenarios and stable-to-candidate promotion can roll back.

## Non-goals

- No SQL database, distributed scheduler, extra workflow engine, permanent stages, global backlog, arbitrary request path routing, mandatory batch mode, or generic provider framework.
- Do not use candidate Kanmer as the live board authority before promotion.
- Do not revive unrelated older Review/Verifying tickets in this horizon; reconciliation handles only selected scope unless explicitly directed.

## Common terminology

- **project_id**: stable logical project identity; **location fingerprint**: machine-local repository/board path, machine, branch and origin identity.
- **workspace**: one active writer's isolated or frozen explicit batch worktree/branch; **lease**: renewable CAS-protected ownership record.
- **workflow stage**: six existing board stages; **delivery state**: independent integration/release/deployment progress.
- **stable**: released v0.4.0 (promoted 2026-09-01; previously v0.3.12) controlling the live board; **candidate**: unreleased work tested only in normal workspaces or disposable/copied boards.
- **current review**: fresh independent attestation bound to the exact PR head; **verification**: proof bound to the exact merged target SHA.

## Shared decisions and constraints

- Markdown/file-backed board, dedicated board branch, central TypeScript gate engine, Electron GUI, MCP server, profiles, groups, git branches/worktrees and six stages remain.
- Mutations use logical-project validation plus revision/lease CAS; a request never chooses an arbitrary project path.
- Review has one consolidated pass, one remediation batch and one delta review; only blocker/major findings, failed required checks, stale review, unmet acceptance, or a security/destructive risk block merge. Dispositioned minor/note risk does not.
- The controller reconciles board, Git, GitHub, CI and workspace facts after every worker result; worker prose does not advance state.
- One active release lease exists per channel. No silent deletion of dirty work. No unlimited remediation or audit loops.
- **Mutating reconciliation is not attempted before revision and lease contracts exist.** [[CORE-113]] was superseded on 2026-08-27 for this reason (see its Outcome and `scratch/notes.md`); its read-only classifier/collector is salvage material, its `apply_reconciliation` is not.

## Scope discipline (adopted 2026-08-28)

The horizon grew from 15 to 22 members because completed tickets were spawning
follow-ups at roughly 0.67 new tickets per completion, chiefly by converting
reviewer findings into tickets. FRD-034 already says dispositioned minor/note
findings "may remain as explicit residual risk"; filing a ticket for one
un-accepts the risk that was just accepted.

- A reviewer recommends a **new ticket** only for a blocker/major finding, or a
  finding that blocks a **named FRD acceptance criterion**. Every other finding
  is recorded on the ticket as an explicit dispositioned residual risk and
  stays there.
- A ticket joins HZN-008 only if it is required by a named acceptance criterion
  of FRD-028..035 or by this group's Definition of done. Useful work that fails
  that test is ordinary backlog outside the horizon, not a member of it.
- Applied on 2026-08-28 by operator decision: [[CORE-129]], [[CORE-130]] and
  [[GUI-145]] were deferred out of HZN-008 on exactly this test. They remain
  open on the board; none is lost, and none gates this horizon.

## Review budget and root-cause rule (adopted 2026-09-01)

[[CORE-127]] was returned Review → Implementing nine times in nineteen hours
with 34 findings, nearly all variants of one parsing-authority mechanism. That
is the loop this section forbids.

- **Budget:** one consolidated independent review, one remediation batch, one
  delta review. The delta review examines only the prior findings, the changed
  lines, their direct callers and contracts, and the relevant tests. It never
  restarts repository-wide ideation. A further blocker or major after the delta
  review means one controlled replan (Preparing) or an explicit blocked
  outcome — never a third round.
- **Root-cause classes:** when two findings arise from one underlying
  mechanism, stop patching examples. Record one class and choose exactly one
  of: replace the implementation approach; revise the plan; narrow the
  approved contract with a stated threat model; defer the whole class to one
  follow-up ticket. Never one patch or one ticket per example.
- **What consumes no budget:** re-auditing an unchanged head, a restated
  finding, an outdated GitHub thread, a disposition edit, PR metadata, or a new
  minor/note. A finding is `blocker | major | minor | note` by actual impact on
  the approved acceptance; an external P1/P2 label is not a severity.
- **Outdated threads:** a GitHub thread marked outdated is dispositioned
  `obsolete-after-change` (record it as `accepted-risk` with the text
  "superseded by <sha>" until the attestation schema carries that value) unless
  a reviewer reasserts the same defect against the current head. It is never a
  current open finding.
- **Terminal pass with residual risk:** green required checks at the exact
  head, no open blocker/major, every minor/note with a durable disposition, and
  any deferred class linked to one follow-up. Zero observations is not required.

## Interim ownership and remediation rule (v0.3.12, until the bootstrap ownership contract merges)

- A claim older than 30 minutes with no pause/resume note in `scratch/` and no live controller run record is treated as expired.
- Transferring an expired claim requires an operator note in the ticket's `scratch/` naming the old controller, the new controller, the recorded branch and worktree. Agents never use `force`; the operator releases via the GUI or `take_ticket action: "release"` after recording the worktree location.
- A `needs-changes` attestation bound to the current PR head is the only agent-side authority to move Review → Implementing; the move keeps the same branch, worktree and PR, and the ticket's remediation budget is one batch plus one delta review unless an operator note extends it.
- `expected_reviewers` are the independent subagent reviewer identities the controller dispatched, and nothing else. Codex, GitHub code-review bots and similar automated commenters are **never** expected reviewers and never a gate (kanmer-review on `main`, "Expected reviewers and the settle rule"). A bot thread that appears on an already-attested head is ordinary evidence: map it to a finding, disposition it, resolve it. It does not by itself invalidate the attestation or start another review round. *Corrected 2026-09-01: the previous wording ("every expected automated reviewer has posted") contradicted the merged skill and drove the nine CORE-127 rounds.*
- The recurring Windows timing failures (`store.test.ts`/`claims.test.ts`/`docs.test.ts` 5s timeouts and teardown `ENOTEMPTY`; the `antigravity-plugin-config.test.mjs` `EBUSY` pair) **also reach hosted CI** — corrected 2026-08-28 when the push run at CORE-116's merge SHA failed 548/549 on `store.test.ts`. "Judge the rail by hosted CI" is therefore necessary but **not sufficient**: a single red hosted run is not proof of a regression any more than a single green local run is proof of correctness. Discharge it with evidence, not assertion — re-run the same job at the same SHA with no code change, confirm the failing test is untouched by the diff, and give a mechanism argument for why the change cannot reach it. Retain every attempt in the proof. [[CORE-128]] exists to remove this cost.
- `main` branch protection sets **`required_conversation_resolution: true`**, so a PR sits at `mergeStateStatus: BLOCKED` until every review thread is resolved, no matter how green its checks are. `required_approving_review_count` is 0 and `enforce_admins` is true, so there is no bypass. Dispositioning a thread in the attestation and resolving it on GitHub are the **same obligation**: a reviewer that disposes findings without resolving threads leaves a PR that cannot merge. Resolve only after posting the disposition publicly on the PR, so the record survives outside the board.
- Confirm the board branch is pushed (local tip == `origin/kanmer-board`) before treating a `kanmer-gate` result as current; the gate reads the remote board tip and does not re-run on board pushes.

## Dependency map

1. [[DOC-027]] establishes concise governing inputs and links each member.
2. [[CORE-121]] bootstrap ownership/backward-move contract unblocks every later lane: expiring claims with owner-checked transfer, audited Review → Implementing.
3. In parallel after 2: [[CORE-122]] read-only reconciliation inspector (salvaged from [[CORE-113]] PR #286), [[CORE-123]] merge-gate/board-sync hardening, and [[SKILL-037]] review-consolidation skill contract.
4. [[CORE-114]] establishes project identity and a document-inclusive revision contract.
5. [[CORE-115]], [[CORE-116]], [[CORE-117]], [[CORE-118]] and [[MCP-054]] build on the shared contracts. [[GUI-144]] follows [[MCP-054]].
6. Mutating reconciliation (`apply_reconciliation`, expired-claim release, typed verification routing) follows [[CORE-115]].
7. [[SKILL-036]] integrates leases, packets, review/verification and reconciliation into durable orchestration.
8. [[CORE-119]] proves the complete model on disposable boards and controls stable-to-candidate promotion/rollback.

## Implementation order and WIP

[[DOC-027]] is done. Next take [[CORE-121]] as a single small PR on the stable line; then run the three parallel lanes in 3 above; then the shared-contract serial lane [[CORE-114]] → [[CORE-115]]. Do not begin more than two implementation PRs; only one shared subsystem PR is active at a time. Re-evaluate dependent plans after each contract merge. The live board remains on stable v0.3.12 throughout candidate work.

Order from 2026-09-01: land [[CORE-127]] in one bounded round, hand-reconcile stale board state, release 0.4.0 as the new stable control plane with minimal promotion acceptance, then SKILL-039 (anti-churn amendment in skills/core), [[CORE-133]], [[CORE-119]], and 0.4.1.

Order from 2026-09-02 (v0.4.0 promoted; setup run under the new plane): [[MCP-055]] first — it is a blocker for driving the stable server from Claude Code — then [[SKILL-039]], [[CORE-133]], [[CORE-119]], then release 0.4.1 as [[CORE-137]] through the [[CORE-136]] path. [[GUI-147]] (Claude Connect marketplace/version drift) is ordinary backlog scheduled alongside 0.4.1 but is not a horizon member.

## Breakdown

| Ticket | Outcome | Order |
| --- | --- | --- |
| [[DOC-027]] | Governing FRD/ADR contract | 1 (done) |
| [[CORE-113]] | Rescue/reconciliation — **superseded 2026-08-27**, archived | — |
| [[CORE-121]] | Expiring claims, transfer, audited backward move | 2 |
| [[CORE-122]] | `reconcile_ticket` salvaged from PR #286 | 3 |
| [[CORE-123]] | Attestation errors, `SYNC_REQUIRED`, board-push CI trigger | 3 |
| [[SKILL-037]] | Expected reviewers settle, delta review, remediation budget, same-PR return | 3 |
| [[CORE-114]] | Identity and revision safety | 4 |
| [[CORE-115]] | Leases and isolated/batch workspaces | 5 |
| [[CORE-116]] | Delivery policy and per-ticket delivery state | 5 |
| [[CORE-132]] | Release-channel leases and candidate identity | 5 |
| [[CORE-117]] | Capture and promotion | 5 |
| [[CORE-118]] | Evidence/plan validation and step packets | 5 |
| [[MCP-054]] | Named multi-project endpoint registry | 5 |
| [[CORE-131]] | `apply_reconciliation` on revisions + leases | 6 |
| [[GUI-144]] | GUI multi-project registry health | 6 |
| [[SKILL-036]] | Durable `/goal`, review and verification control | 6 |
| [[CORE-127]] | Constrained step reconciliation | 6 |
| [[GUI-146]] | Release blocker: renderer core import, GUI build in the verify rail | 6 |
| [[CORE-136]] | v0.4.0 release and promotion to live control plane | 6 |
| [[MCP-055]] | 0.4.1 blocker: structuredContent must carry the whole tool result (Claude Code renders only the project stamp) | 7 |
| [[SKILL-039]] | Anti-churn amendment in skills/core | 7 |
| [[CORE-137]] | v0.4.1 release and promotion (horizon closer) | 8 |
| [[CORE-119]] | Golden-board and promotion/rollback proof | 7 |

## Rollout & rollback

Build candidate code on ordinary ticket/batch workspaces and copied/disposable boards. Before promotion, back up the live board, stop the stable server cleanly, install candidate, migrate/reconcile, and verify identity, CRUD, leases, review, merge, verification, closeout and sync. A failed promotion restores v0.3.12 and the board backup; immutable failed release evidence is retained.

## Definition of done

All HZN-008 members are terminal with exact-SHA proof where applicable; required CI/gates are green; golden scenarios pass; no selected ticket is unexplained in Review/Verifying or has an unresolved lease; the release-channel lease is clear; stable promotion/rollback is evidenced.

## Closure and run ledger — v0.4.1 (2026-09-04)

- **Run:** [[CORE-137]] executed the protected v0.4.1 release path from cut-point `04a977516fcb29500b5df2fd6aacea24e2e3d54e`; independently reviewed PR #319 merged as `4e94ad806d5f74dbfdc9b0789190624addf4cbdd`.
- **Release:** public latest `v0.4.1` contains the four coherent updater/plugin assets. Tag workflow 33865938392 and independent remote-asset verification passed. Live attempt `main@1` is terminal `released`, verification `passed`, and the `main` channel has no lease.
- **Promotion:** packaged/copy smoke, full copied-board workflow, fresh Claude Code full-payload check, Claude marketplace fault/recovery, three-host portable Connect idempotence, setup reconciliation, Pegasus documentation CI, retained-0.4.0 rollback and final 0.4.1 cut-over all passed. The immutable ticket proof retains every failed/inconclusive attempt and the later remedy.
- **Live authority:** installed packaged server 0.4.1 generation `0.4.1-7432`, SHA-256 `3f7af329d5e634f4d90cf4aa65cea53f72c1b92117e5307329a9bd31d63c9d90`, serves logical project `dc201ffe-56fa-40b3-aa27-3a01b371c7db` at fingerprint `kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`.
- **Definition of done:** all selected HZN-008 members are terminal with exact-SHA evidence where applicable; the golden contract evaluates PASS; no selected ticket remains in Review or Verifying; CORE-137 is Done with `production-verified` delivery; its claim is retained only until workspace cleanup; the release-channel lease is clear. HZN-008 is closed by v0.4.1.
