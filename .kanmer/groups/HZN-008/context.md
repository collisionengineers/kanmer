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
- **stable**: released v0.3.12 controlling the live board; **candidate**: unreleased work tested only in normal workspaces or disposable/copied boards.
- **current review**: fresh independent attestation bound to the exact PR head; **verification**: proof bound to the exact merged target SHA.

## Shared decisions and constraints

- Markdown/file-backed board, dedicated board branch, central TypeScript gate engine, Electron GUI, MCP server, profiles, groups, git branches/worktrees and six stages remain.
- Mutations use logical-project validation plus revision/lease CAS; a request never chooses an arbitrary project path.
- Review has one consolidated pass, one remediation batch and one delta review; only blocker/major findings, failed required checks, stale review, unmet acceptance, or a security/destructive risk block merge. Dispositioned minor/note risk does not.
- The controller reconciles board, Git, GitHub, CI and workspace facts after every worker result; worker prose does not advance state.
- One active release lease exists per channel. No silent deletion of dirty work. No unlimited remediation or audit loops.
- **Mutating reconciliation is not attempted before revision and lease contracts exist.** [[CORE-113]] was superseded on 2026-08-27 for this reason (see its Outcome and `scratch/notes.md`); its read-only classifier/collector is salvage material, its `apply_reconciliation` is not.

## Interim ownership and remediation rule (v0.3.12, until the bootstrap ownership contract merges)

- A claim older than 30 minutes with no pause/resume note in `scratch/` and no live controller run record is treated as expired.
- Transferring an expired claim requires an operator note in the ticket's `scratch/` naming the old controller, the new controller, the recorded branch and worktree. Agents never use `force`; the operator releases via the GUI or `take_ticket action: "release"` after recording the worktree location.
- A `needs-changes` attestation bound to the current PR head is the only agent-side authority to move Review → Implementing; the move keeps the same branch, worktree and PR, and the ticket's remediation budget is one batch plus one delta review unless an operator note extends it.
- A review attestation is authoritative only after every expected automated reviewer has posted on the exact head; if a reviewer posts later on the same head, the attestation is replaced, not appended.
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
| [[CORE-116]] | Delivery policy and release-channel leases | 5 |
| [[CORE-117]] | Capture and promotion | 5 |
| [[CORE-118]] | Evidence/plan validation and step packets | 5 |
| [[MCP-054]] | Named multi-project endpoint registry | 5 |
| (new) mutating reconciliation | `apply_reconciliation` on revisions + leases | 6 |
| [[GUI-144]] | GUI multi-project registry health | 6 |
| [[SKILL-036]] | Durable `/goal`, review and verification control | 6 |
| [[CORE-119]] | Golden-board and promotion/rollback proof | 7 |

## Rollout & rollback

Build candidate code on ordinary ticket/batch workspaces and copied/disposable boards. Before promotion, back up the live board, stop the stable server cleanly, install candidate, migrate/reconcile, and verify identity, CRUD, leases, review, merge, verification, closeout and sync. A failed promotion restores v0.3.12 and the board backup; immutable failed release evidence is retained.

## Definition of done

All HZN-008 members are terminal with exact-SHA proof where applicable; required CI/gates are green; golden scenarios pass; no selected ticket is unexplained in Review/Verifying or has an unresolved lease; the release-channel lease is clear; stable promotion/rollback is evidenced.
