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

## Dependency map

1. [[DOC-027]] establishes concise governing inputs and links each member.
2. [[CORE-113]] provides dry-run-first recovery against the current model.
3. [[CORE-114]] establishes project identity and revision-safe contracts.
4. [[CORE-115]], [[CORE-116]], [[CORE-117]], [[CORE-118]] and [[MCP-054]] build on the shared contracts. [[GUI-144]] follows [[MCP-054]].
5. [[SKILL-036]] integrates leases, packets, review/verification and reconciliation into durable orchestration.
6. [[CORE-119]] proves the complete model on disposable boards and controls stable-to-candidate promotion/rollback.

## Implementation order and WIP

Start only [[DOC-027]], then take the single shared-contract serial lane. Do not begin more than two implementation PRs; only one shared subsystem PR is active at a time. Re-evaluate dependent plans after each contract merge. The live board remains on stable v0.3.12 throughout candidate work.

## Breakdown

| Ticket | Outcome | Order |
| --- | --- | --- |
| [[DOC-027]] | Governing FRD/ADR contract | 1 |
| [[CORE-113]] | Rescue/reconciliation | 2 |
| [[CORE-114]] | Identity and revision safety | 3 |
| [[CORE-115]] | Leases and isolated/batch workspaces | 4 |
| [[CORE-116]] | Delivery policy and release-channel leases | 4 |
| [[CORE-117]] | Capture and promotion | 4 |
| [[CORE-118]] | Evidence/plan validation and step packets | 4 |
| [[MCP-054]] | Named multi-project endpoint registry | 4 |
| [[GUI-144]] | GUI multi-project registry health | 5 |
| [[SKILL-036]] | Durable `/goal`, review and verification control | 5 |
| [[CORE-119]] | Golden-board and promotion/rollback proof | 6 |

## Rollout & rollback

Build candidate code on ordinary ticket/batch workspaces and copied/disposable boards. Before promotion, back up the live board, stop the stable server cleanly, install candidate, migrate/reconcile, and verify identity, CRUD, leases, review, merge, verification, closeout and sync. A failed promotion restores v0.3.12 and the board backup; immutable failed release evidence is retained.

## Definition of done

All HZN-008 members are terminal with exact-SHA proof where applicable; required CI/gates are green; golden scenarios pass; no selected ticket is unexplained in Review/Verifying or has an unresolved lease; the release-channel lease is clear; stable promotion/rollback is evidenced.
