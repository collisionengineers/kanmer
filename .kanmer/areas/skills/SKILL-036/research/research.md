# Research — SKILL-036: durable `/goal` orchestration, bounded review, exact-SHA verification

*The research. Not the files document — this is what I **learned**, not what I will **touch**.*

## Question

FRD-034 asks for a durable `/goal` controller over variable scope with frozen
roster, independent exact-head review, bounded remediation and exact-merged-SHA
verification. Almost every *mechanism* it names has already merged (CORE-114…124,
SKILL-037), and `kanmer-auto` already implements a durable run-state pattern.
So the real question is **what is genuinely missing**, and whether SKILL-036
formalises, extends or supersedes `kanmer-auto` — not how to build an
orchestrator from scratch.

## Findings

### What already ships (so must be composed, not rebuilt)

- **`kanmer-auto` is already the durable controller pattern.**
  `plugins/kanmer/skills/kanmer-auto/SKILL.md` (277 lines) already owns: the
  durable run record (`automation/current.md` + immutable
  `automation/runs/<run-id>.md`), the frontmatter schema
  (`kind/schema/run_id/group/project_fingerprint/controller/status/created_at/updated_at/lane_limit/stop_reason`),
  the fixed run vocabulary (`running|paused|blocked|completed|aborted`) and
  ticket dispositions (`queued|active|waiting|blocked|finished|skipped`), lane
  assignment from the `files` document, the write→read-back cadence, the
  five-step reconciliation loop, 17 mandatory stop predicates, the serial
  `lane_limit: 1` fallback, role independence, and the four-list report.
  - It also already routes both of FRD-034's loops: `needs-changes` → same
    branch/worktree/PR re-entry + delta review, and non-PASS verification by
    `failure_class`.
- **`kanmer-auto`'s three real gaps against FRD-034** are: (1) it accepts
  **only one explicit existing group** — "Area-only and ad-hoc selections have
  no durable batch owner: stop before mutation" — where FRD-034 requires one
  ticket, one group, one area, an explicit list, or the prepared board; (2) it
  never states that the roster is **frozen** against new tickets and captures;
  (3) it names no preflight (project identity, delivery policy, capability).
- **SKILL-037 (`3267c7df`)** is the precedent for this ticket's *shape*: a
  skills-only change to `kanmer-review/auto/execute/verify/closeout` plus new
  checks in `scripts/verify-skill-prose.mjs` and its test. 407 insertions, no
  `packages/` change. It shipped the expected-reviewers settle rule,
  `threads_snapshot` (an **array**, one entry per thread, each mapped to an
  `F-###`), round-0 consolidated / round-≥1 delta review scope,
  `REVIEW_RETURN_NEEDS_ATTESTATION`, `REMEDIATION_BUDGET_EXHAUSTED`, and the
  `failure_class` routing table.
- **CORE-121 (`dc514375`)** put the backward-move authority in the store.
  `Store.backwardMoveEffects` (`packages/core/src/store.ts:1001`) shows the
  exact shape: *every* backward move needs a non-empty `reason`
  (`BACKWARD_MOVE_NEEDS_REASON`); **only** `review → implementing` additionally
  requires a valid `needs-changes` attestation bound to one of the ticket's
  `prs[]`, or a reason matching `operator:`. `review_round` increments on that
  move; `round >= budget` throws `REMEDIATION_BUDGET_EXHAUSTED`, and only an
  `operator:` reason both re-opens it and raises the budget.
- **CORE-116 (`28a12643`)** delivery policy. AGENTS.md §rule 20: resolve policy
  with `resolveDelivery(board)` and a ticket's branch with
  `deliveryTargets(policy, item)` — "the merge gate and the execution packet
  share that one function precisely so they cannot disagree". Delivery state is
  **non-gating** (ADR-0005). Kanmer's own board deliberately carries no
  `delivery:` block, so it resolves main-only — which is exactly why a
  controller that hardcodes `main` looks correct here and breaks elsewhere.
- **CORE-115/124** leases: `leaseState()` is the only expiry rule;
  `take_ticket` verbs `renew`/`transfer`/`release` run under one board write
  lock; `transfer` is the reclaim and never deletes; a batch is frozen by its
  first member's take (`lease_batch`, `lease_batch_frozen_at`) and
  `releaseTicket` refuses `BATCH_ACTIVE` until every member is terminal.
- **CORE-123** merge-gate hardening added `SYNC_REQUIRED` for an attestation
  naming a board SHA the remote has never seen, and `get_status.boardSync` for
  `board_sha`. **The installed stable server is v0.3.12 and does not expose
  `boardSync`** (verified: `get_status` on this board returns no `boardSync`
  key, `server.version 0.3.12`, `sha256Short 639df4cf`). Any contract that says
  "read `get_status.boardSync`" must therefore name a git fallback that works
  today, or it is unusable until promotion.
- **CORE-118** step packets and **CORE-114** document-inclusive `revision` /
  `expected_revision` are already wired into `get_execution_packet`; the
  revision covers every pipeline document **except** `scratch/` and `reference/`.

### `scripts/verify-skill-prose.mjs` is the enforcement surface

- It is the only test that asserts skill prose. Checks that constrain this
  ticket directly:
  - **check 5** — every `kanmer-<word>` token in the skills tree must name a
    real skill directory. A new skill name is fine once its folder exists; a
    reference to a skill that does not exist fails.
  - **check 6** — `EXPECTED_SKILLS = 12`, with the comment "the next roster
    change should update the number here deliberately rather than discover it in
    CI". Adding a 13th skill is legal but is a deliberate roster change.
  - **check 8** — `.worktrees/kanmer` and "at most one gated boundary" must be
    stated in every skill that can act on them; `kanmer-auto` is on both lists.
  - **check 13** — asserts `kanmer-auto` literally contains
    `"one explicit existing group"`, `automation/current.md`,
    `automation/runs/<run-id>.md`, `project_fingerprint`, `controller`,
    `stop_reason`, the five statuses, `read it back`, and
    **`never runs \`gh pr merge\``**; and that the run-state template keeps its
    five headings and eleven frontmatter fields.
  - **check 14** — long regexes over `kanmer-auto`'s reconciliation loop, stop
    predicates, serial fallback, completion definition and retry rules.
  - **check 18** — SKILL-037's remediation-loop wording in five skills.
- Consequence: **any edit to `kanmer-auto` must preserve those literal strings.**
  In particular "one explicit existing group" and "never runs `gh pr merge`" are
  asserted verbatim, so broadening scope has to be *additive* prose that keeps
  the group sentence true for the group case.

### The live run ledger — what a controller actually has to survive

Read from `.kanmer/groups/HZN-008/automation/runs/20260827T133106Z-claude-code.md`
(≈90 kB, two days of real multi-controller operation) and the group `context.md`.

- **Sync before gate.** Repeated incidents: "kanmer-gate FAIL (remote board
  stale: remote 3935fdcc vs local 3d494013, 19 dirty files — syncer stalled
  again)". The gate reads the **remote** board tip, and does not re-run on board
  pushes; an unpushed attestation yields a gate that passes while recording
  "no review attestation". The resume instruction encodes the fix: "if the
  reviewer has attested `pass` but kanmer-gate is red only because the remote
  board is stale, ask the operator to sync, re-run the failed gate job
  (`gh run rerun <id> --failed`), then resume the reviewer for merge".
- **`required_conversation_resolution: true`** on `main`: "`mergeStateStatus`
  stayed `BLOCKED` with both required checks green… **Every future PR in this
  repo will sit at BLOCKED until its threads are resolved.** Dispositioning in
  the attestation and resolving on GitHub are the same obligation; a reviewer
  that does the first without the second leaves an unmergeable PR."
  `required_approving_review_count` is 0 and `enforce_admins` is true — no bypass.
- **Hosted CI is necessary but not sufficient.** "'judge the rail by hosted CI'
  is necessary but not sufficient, and a red hosted run must be discharged with
  evidence — same-SHA re-run, diff-untouched confirmation, and a mechanism
  argument — never by assertion." The correction came from a *verifier*
  overruling the controller's own environment brief — evidence that role
  independence is load-bearing, not ceremonial.
- **Scope discipline.** Twelve completions spawned eight tickets (~0.67 per
  completion) because the controller converted reviewer findings already
  dispositioned `accepted-risk` into tickets, "which un-accepts the risk that
  was just accepted". Adopted rule, now in the group context: a new ticket only
  for a blocker/major finding or one blocking a named FRD acceptance criterion;
  a real defect that blocks no acceptance criterion "goes into the nearest
  already-required ticket, not a new one".
- **The controller never merges.** Run invariant: "The controller never
  auto-merges a pull request; merges are performed by the independent reviewer
  under the operator's standing delegation." When a merge was blocked, "the
  merge point was handed back to the reviewer that had withheld it rather than
  taken by the controller, preserving role independence." This is how FRD-034's
  "the controller merges" and `kanmer-auto`'s "never runs `gh pr merge`" are
  reconciled in practice: the controller **coordinates**, the reviewer
  **executes**.
- **Frontmatter-only reads produce wrong dispositions.** "The controller's
  earlier read of this ticket was frontmatter-only and therefore wrong", and
  the recorded contract gap: "nothing checks a proof document for internal
  consistency. `result:` in the frontmatter is the only machine-readable verdict
  the gate and the skills read, yet later prose sections can be appended that
  contradict it."
- **`threads_snapshot` must be an ARRAY.** CORE-115's and CORE-124's
  attestations wrote it as a mapping, which `review-attestation.ts` rejects;
  the gate only warns today, so the drift survived two tickets.
- **Absolute git paths.** "CONTROLLER INCIDENT, no damage: a controller shell
  whose working directory had drifted into `.worktrees/kanmer` … ran
  `git merge --ff-only origin/main` there… Every controller git command now uses
  absolute paths."
- **Concurrent verifiers collide.** "concurrent verifiers must not share
  `/tmp/verify.log` — future verifier prompts must name a unique log."
- **Rail contention causes the flake.** "CORE-118's verification is deliberately
  HELD until the MCP-051 rail finishes rather than run concurrently, because two
  heavy rails at once is the documented cause of the very flake CORE-128 tracks."
- **Budget in practice is operator-gated.** "Remediation budget (1) spent →
  predicate 4/15: lane parked awaiting operator authorisation of round 2", then
  "operator authorised GUI-144 remediation round 2 (remediation_budget 1→2)".
- **Worker harness quirk, not a plan deviation.** "both workers stopped early
  'waiting for background verify notification' (a subagent cannot receive it
  while stopped)" — already stated in `kanmer-auto`.
- **Secret exposure incident.** A `sed` redaction filter that did not match the
  CLI's table format printed four live secret values. "never rely on a post-hoc
  text filter to redact output that has already been produced."

### Where FRD-034 exceeds what is written anywhere

From `goal.md` PHASE 10–13 (the operator's source specification, untracked at
the repo root) and FRD-034 itself:

- Overlap detection must cover **file, contract, migration, lockfile and
  heavyweight-resource** overlap — `kanmer-auto` compares only `files` documents.
- **Phase 12 review budget**: one consolidated review, one batch remediation,
  one delta re-review; then "return the ticket to Preparing; spawn one fresh
  planning/research subagent; revise the plan once; re-execute"; then an
  explicit blocked outcome. The store permits `review → preparing` on a bare
  reason (only `review → implementing` is attestation-gated), so this is
  *mechanically* possible — which is exactly why it needs an explicit boundary,
  or it becomes a laundering route around `REMEDIATION_BUDGET_EXHAUSTED`.
- **Phase 13 active-stage invariants**: a Review ticket must have an open PR, a
  current head SHA, an active or immediately queued reviewer, and an attestation
  state; a Verifying ticket a confirmed merged PR, an exact merge SHA, an
  active/queued attempt, and a known proof state. "The goal controller must
  never report success while selected tickets remain in an unexplained Review or
  Verifying state" — and FRD-034's edge cases name the two concrete shapes: a
  merged PR left in Review, and a PASS proof left in Verifying.
- **Phase 10 multi-controller**: "Multiple controllers may run against one
  project when they own different workspaces and scopes. A controller cannot
  claim the entire project merely because it exists."

### Environment

- `origin/main` is `28a12643` (CORE-116). The main checkout is at `0f4a21fe`
  and clean apart from untracked `goal.md`, `.infisical.json`, `skills-lock.json`.
- Live worktrees include `.worktrees/core-128` and `.worktrees/core-131`
  (active lanes, out of bounds), `.worktrees/kanmer` (board), and two
  `verify-*` worktrees.
- `get_sources(area: "skills", labels: ["reliable-autonomy"])` returns
  `declaredCount: 0` — the project declares no MCP/plugin/llms.txt sources, so
  no declared research input applies and none was skipped as
  `unknown`/`unavailable`.
- `scripts/check-plugin-sync.mjs` **refuses to run from a linked git worktree**.
  A skills-prose-only change does not touch the bundle, so `plugin:check` is not
  owed; `verify:skills` and `verify:agents-block` are.

## Implications

1. **SKILL-036 extends `kanmer-auto` in place; it does not fork or supersede
   it.** Every durable-state mechanism FRD-034 names is already there and is
   asserted verbatim by `verify-skill-prose.mjs` checks 13/14/18. A second
   orchestrator skill would duplicate ~90 % of that prose, create a
   description-trigger collision between "clear this group" and "/goal", and
   give two skills authority over the same run record — the "silently fork it"
   defect. The additive work is scope, freeze, preflight, overlap breadth,
   escalation boundary, active-stage invariants, and the operating-evidence
   rules.
2. **Broadening scope needs a durable owner, not a new store.** `set_group_doc`
   is the only durable non-ticket writer, so a non-group scope must name a
   **run host group** whose `automation/` folder owns the record. The frozen
   roster lives in `## Selection contract`, so it is independent of that group's
   membership — which is also what makes "new tickets and captures cannot join"
   true by construction rather than by vigilance.
3. **"The controller merges" must be read as "coordinates the merge".**
   `never runs \`gh pr merge\`` is asserted by check 13 and is the live run's
   invariant. The contract must say the controller dispatches the independent
   reviewer with merge authority and reconciles the merge from GitHub — never
   executes it.
4. **The automatic replan must not become a third authority.** CORE-121 owns
   `review → implementing`; the task is explicit that no third authority may be
   added there. Routing `review → preparing` is a *different* boundary and is
   store-legal on a bare reason, but using it after
   `REMEDIATION_BUDGET_EXHAUSTED` would be a bypass in substance. This is an
   authority decision, not an implementation choice → parked, with the
   conservative default implemented.
5. **Anything the contract tells a controller to read must exist on the stable
   server.** `get_status.boardSync` does not exist on v0.3.12, so the
   sync-before-gate rule must be expressed as a git fact
   (`git -C <abs board worktree> rev-parse kanmer-board` vs
   `origin/kanmer-board`) with `boardSync` named as the candidate-server form.
   Otherwise SKILL-036's contracts are "written, not usable" — the exact failure
   the ticket warns about.
6. **Delivery must come from `deliveryTargets(...)`.** The PR target and the
   verification target are policy outputs. Kanmer's own board resolves main-only,
   so a hardcoded `main` would pass every check in this repo and be wrong.
7. **The change shape is SKILL-037's**: skills prose plus new checks in
   `scripts/verify-skill-prose.mjs` and its test. That keeps the ticket entirely
   out of `packages/core`, `packages/mcp-server` and
   `scripts/antigravity-plugin-config.test.mjs`, which belong to the CORE-131
   and CORE-128 lanes.

## Open questions

Recorded in `open-questions`. One is operator-only (the post-exhaustion replan
authority) and is parked with its recommendation implemented as the default.
