# Kanmer Workflow and Reliability Redesign

**Status:** Recommended target design  
**Date:** 19 August 2026  
**Repository examined:** `collisionengineers/kanmer`  
**Primary objective:** Allow a strong planning/reviewing agent to prepare work that a weaker implementation agent can execute accurately, while keeping human approval understandable and avoiding unnecessary process or product surface.

---

## 1. Evidence basis and limitation

This design reconciles:

- A prior Kanmer design recommendation to use existing groups, tickets, checklists and proof rather than build a new parent/subticket system.
- The Pegasus workflow examination, especially the escaped production-caller, database-permission, runtime-composition, stale-review and GitHub-enforcement failures.
- The wider Kanmer repository review, especially its recommendations on contract consolidation, concurrency, evidence freshness, profile-adaptive skills, MCP structure, greenfield workflow and overengineering.
- The committed `kanmer-board` snapshot at commit `6bd2f362299f96095f7c2bfce5a1bd830823e465`, dated 18 August 2026 at 13:33 UTC. The branch is currently unprotected and has no required checks.
- Current source and skill behavior on `main`.
- Current GitHub pull-request state.
- Current primary-source guidance on agent design, evaluation, MCP and GitHub enforcement.

Direct access to the live Kanmer board was attempted three times, but each attempt failed before reaching Kanmer because the remote MCP tunnel returned HTTP 404. Current ticket evidence was therefore read from the committed board branch through GitHub. This is a real limitation: changes made locally after the last board sync may not be represented here. It is also a workflow finding in its own right; remote-connector health and endpoint expiry are currently not visible until a tool call fails.

---

# 2. Executive decision

Kanmer should **not** be rewritten. It should **not** gain a new nested ticket hierarchy, a second workflow engine, a database, more fixed stages, or a new mandatory prose document for every concern.

The recommended operating model is:

```text
Feature group
├── Shared feature approval and context
├── Small implementation tickets
│   ├── Human-readable ticket summary
│   ├── Exact implementation brief
│   ├── Mechanical checklist, when useful
│   └── Generated run, review and proof records
└── Final integration-verification ticket
```

Use the primitives Kanmer already has:

| Need | Existing Kanmer primitive |
|---|---|
| Complete feature outcome | Group or epic |
| Shared decisions and constraints | Group `context.md` |
| Small independently reviewable change | Normal ticket |
| Dependency order | `blocks` links |
| Exact mechanical steps | Checklist |
| Technical execution contract | Existing `plan/` document |
| Evidence | Existing `proof/` document |
| Complete feature verification | Final normal integration ticket |

The principal redesign is **information layering**:

1. **Approval view — for the human:** plain-language outcome, boundaries, decisions, risk and evidence.
2. **Execution view — for the weaker agent:** exact files, constraints, steps, commands and stop condition.
3. **Review view — for the stronger reviewer:** exact diff, findings, dispositions and reviewed SHA.
4. **Evidence view — for completion:** exact merged SHA, checks, outputs and acceptance mapping.

These are different audiences. Forcing all four audiences to read one ticket body is the main cause of unreadability.

---

# 3. The central problem: Kanmer mixes four different contracts

A current ticket can simultaneously contain:

- A product proposal.
- Unresolved research.
- Architecture decisions.
- Implementation instructions.
- A progress journal.
- A post-implementation explanation.
- Review conclusions.
- Verification evidence.

That produces technically rich but operationally poor tickets.

GUI-094 is a clear example. Before implementation, its ticket, plan, checklist, research, file map and questions total roughly 44 KB. Its plan alone is approximately 15 KB and defines an installer shim, registry lifecycle, provider behavior, package checks, real-host tests, documentation changes and release handling. The checklist adds more than thirty implementation and proof items.

The technical thinking is not the problem. The problem is that there is no clean answer to:

> What exactly am I approving?

Nor is there a bounded answer to:

> What exact job should the weaker implementation agent perform?

Several other backlog tickets still contain unresolved verbs such as “investigate,” “decide,” “choose,” or “determine” inside what appears to be implementation scope. GUI-081 asks whether a requirement should be implemented or withdrawn; GUI-084 mixes a notification change with unresolved native-notification feasibility; GUI-087 and GUI-088 retain competing design choices. These are preparation tasks, not execution-ready work orders.

The correction is not to delete technical detail. It is to put each kind of detail in the correct layer.

---

# 4. Target operating model

## 4.1 Responsibility split

### Strong planner or human

Responsible for:

- Understanding the request and desired outcome.
- Research and source validation.
- Resolving product and architecture decisions.
- Identifying risks, dependencies and non-goals.
- Deciding whether the work is a feature group, implementation ticket, fix, chore or spike.
- Decomposing feature-sized work.
- Writing exact implementation briefs.
- Selecting the relevant repository context.
- Defining tests and proof.
- Reviewing material deviations.

### Weaker implementation agent

Responsible for:

- One implementation ticket.
- One lease.
- One branch and worktree.
- One approved execution packet.
- A bounded set of allowed changes.
- Running specified checks.
- Reporting deviations rather than redesigning the work.
- Stopping at the stated boundary.

It must not:

- Decide product behavior.
- Select between architecture alternatives.
- alter the feature outcome.
- Edit governing documents unless explicitly authorized.
- Continue into another ticket.
- Merge its own pull request.
- Declare the whole feature complete.
- Create unrelated work automatically.

### Deterministic harness

Responsible for:

- Confirming project identity.
- Acquiring the ticket lease.
- Creating and validating the worktree.
- Supplying the execution packet.
- Running commands.
- Capturing exit codes and outputs.
- Comparing actual changed files with expected scope.
- Detecting stale packet versions.
- Checking pull-request linkage.
- Enforcing bounded retries.
- Producing run and evidence records.

“Deterministic” means ordinary software rules rather than a model’s judgement. A compiler exit code or a Git SHA is much more reliable than an agent saying “tests passed.”

### Strong reviewer

Responsible for:

- Reviewing the actual diff against the approved outcome and execution brief.
- Checking omissions that tests may miss.
- Reconciling all GitHub review findings.
- Deciding whether deviations are acceptable.
- Reviewing the exact current PR SHA.
- Performing feature-level integration review.

---

## 4.2 End-to-end flow

```text
User request
    ↓
Strong planner
    ↓
Feature approval or standalone ticket approval
    ↓
Small implementation tickets
    ↓
Readiness checks
    ↓
Execution packet
    ↓
Weak agent in isolated worktree
    ↓
Deterministic checks and bounded correction
    ↓
Pull request
    ↓
Strong review on exact SHA
    ↓
Required Kanmer/GitHub merge gate
    ↓
Verification on exact merged SHA
    ↓
Final feature integration ticket
    ↓
Feature complete
```

This aligns with current agent-engineering guidance: instructions, tools, orchestration and guardrails must work together, and guardrails should be layered rather than treated as a single source of safety. Agent evaluations also work best when tasks are well specified, environments are stable and deterministic graders verify end-state behavior.

---

# 5. Ticket hierarchy: use groups, not a new hierarchy system

## 5.1 Feature-sized work

A feature should normally be represented as an existing epic/group.

The feature group owns:

- The complete user or operational outcome.
- What is explicitly not included.
- Shared decisions.
- Shared constraints.
- Cross-ticket risks.
- Dependencies.
- Rollout and rollback principles.
- Feature-level acceptance criteria.
- The final integration definition.

Implementation tickets belong to the group and represent independently implementable, reviewable and verifiable outcomes.

The group is complete when:

1. Every required implementation ticket is Done.
2. Every blocking relationship is resolved.
3. The final integration-verification ticket is Done.

No parent/child storage fields are required. Group membership is already derived from tickets.

## 5.2 Standalone work

A small fix, chore, documentation change or isolated feature can remain one normal ticket when it has:

- One outcome.
- One main risk boundary.
- One branch and PR.
- A bounded file and test surface.
- No unresolved product or architecture decision.

## 5.3 Split rule

Split a ticket when a part:

- Can have its own PR.
- Can be reviewed independently.
- Can fail independently.
- Must land before another part.
- Has a materially different risk profile.
- Can safely run in parallel.
- Can be abandoned without invalidating the rest.

Do not split by:

- File.
- Class.
- Method.
- Every acceptance-criterion sentence.
- Every review comment.

The correct unit is an **independently verifiable outcome**.

---

# 6. Human readability without losing technical quality

## 6.1 The approval contract

Every standalone implementation ticket, or every feature group for grouped work, should expose a short approval contract.

Recommended sections:

```markdown
# What you are approving

## Outcome
What will be true when this work is complete?

## Why
What problem does this solve?

## User or operational effect
What changes in observable behavior?

## In scope
The exact outcomes included.

## Out of scope
Related work that is deliberately excluded.

## Key decisions
The material product or architecture decisions already made, with brief reasons.

## Main risks
Security, data, cost, migration, compatibility or operational risks.

## Breakdown
The implementation tickets and dependency order.

## Evidence
How completion will be demonstrated.

## Approval boundary
What the planner and implementers are authorized to change.
```

This should ordinarily fit in one GUI screen. A rough target of 300–600 words is useful as guidance, but should not be a hard gate. A word-count gate would encourage omission rather than clarity.

The approval view should explain jargon inline. For example:

> “Optimistic concurrency” means a write is rejected when the file changed after the agent read it, rather than silently overwriting the newer version.

## 6.2 The execution contract

The execution brief remains technically exact and may be longer. It belongs in the existing `plan/` folder rather than the ticket body.

Recommended structure:

```markdown
# Objective

# Starting state

# Required changes

# Expected files
- Files likely to change.
- Context files that must be read.

# Do not modify

# Constraints

# Ordered implementation steps

# Acceptance checks

# Commands

# Failure and deviation rules

# Stop condition
```

The weaker agent should receive this document, not the complete research archive.

## 6.3 The approval summary must be checked against the technical plan

The strong planner should perform a consistency review:

- Does every material behavior in the technical plan appear in the approval contract?
- Does every migration, security boundary, external dependency, cost implication and irreversible action appear?
- Did the technical plan introduce a new outcome that the human did not approve?
- Did a child ticket expand beyond the feature group’s non-goals?

This can initially be an advisory strong-model review. The hard system should only enforce observable revision and section presence, not attempt to score prose quality automatically.

## 6.4 Material-change invalidation

Approval should be tied to a revision/hash.

Reapproval is required when any of these change:

- Outcome.
- Acceptance criteria.
- Non-goals.
- Key product or architecture decision.
- Security or privacy impact.
- Persistent data or migration behavior.
- Cloud cost or deployment model.
- Rollback strategy.
- Feature decomposition in a way that changes risk or user effect.

A change to a local implementation detail inside the approved boundary does not require reapproval.

The GUI should show:

```text
Approved revision: A7
Current revision: A8
Status: approval stale
Material changes:
- Added registry persistence.
- Added a new production dependency.
```

This is more useful than asking the user to reread a complete rewritten plan.

---

# 7. Documents and records

## 7.1 Direct answer: should more documents be tied to tickets?

**Do not add more mandatory human-authored pipeline documents.**

Kanmer already has enough prose. The improvement should be:

- Better semantic roles for existing documents.
- Feature-level shared context.
- Generated structured operational records.
- Better views over the same data.

Add no new mandatory “design,” “review,” “risk,” or “approval” prose type globally.

## 7.2 Recommended artifact matrix

| Artifact | Feature group | Implementation ticket | Spike | Authored or generated |
|---|---:|---:|---:|---|
| Approval contract | Required in `context.md` | Required in ticket body for standalone work; short delta for grouped work | Research question and decision boundary | Strong planner/human |
| Shared research | Optional, when several tickets need it | Ticket-specific delta only | Primary deliverable | Strong researcher |
| ADR/FRD/PRD links | Only when durable/cross-cutting behavior warrants them | Inherited or directly linked | As evidence for decision | Existing repo docs |
| Implementation brief | Not normally | Required for non-trivial implementation | Not applicable | Strong planner |
| Checklist | Not normally | Only when useful for mechanical progress | Not normally | Strong planner |
| File/context map | Shared only for conflict planning | Optional; required for high-overlap/high-risk work | Optional | Strong planner or generated |
| Open questions | Group-level shared decisions or ticket-specific | Must be resolved before dispatch | May be the research output | Strong planner/researcher |
| Run record | Group summary optional | Required for agent execution | Optional | Generated |
| Review attestation/findings | Final integration review | Required before merge | Optional | Generated + reviewer |
| Proof | Feature-level integration proof | Exact merged-SHA evidence | Research evidence | Generated + verifier |

## 7.3 Machine-generated records are not new paperwork

Kanmer should introduce structured records, but agents should not manually write them as essays.

### Run record

```yaml
run_id: run-2026-08-19-001
ticket: MCP-123
agent: implementation-worker
packet_hash: sha256:...
project_fingerprint: ...
base_sha: ...
lease_id: ...
started_at: ...
finished_at: ...
result: pass
commands:
  - command: npm test
    exit_code: 0
    output_hash: sha256:...
changed_files:
  - packages/mcp-server/src/write.ts
deviations: []
```

### Review attestation

```yaml
ticket: MCP-123
pr: 87
reviewed_head_sha: ...
approval_revision: A7
plan_hash: ...
reviewer: strong-reviewer
verdict: pass
findings:
  - id: PR87-F01
    severity: P2
    status: fixed
```

### Proof record

```yaml
ticket: MCP-123
merged_sha: ...
environment: windows-11
verified_at: ...
criteria:
  AC-1:
    result: pass
    evidence:
      - type: command
        command: npm test
        exit_code: 0
```

Markdown can render these records for people. The structured data is what gates consume.

---

# 8. Feature documents versus implementation documents

## 8.1 Feature-group `context.md`

Recommended canonical template:

```markdown
# Feature outcome

# Users and workflow affected

# Acceptance criteria

# Non-goals

# Shared decisions

# Constraints

# Risks and mitigations

# Dependency map

# Rollout and rollback

# Implementation breakdown

# Feature definition of done
```

Group context should not become a duplicate PRD. It should contain only the information shared by the implementation tickets.

Create separate group research files only when multiple tickets would otherwise repeat the same investigation.

## 8.2 Implementation ticket body

For a grouped ticket:

```markdown
# Outcome

# Why this ticket exists

# Relationship to feature

# In scope

# Out of scope

# Acceptance evidence
```

The body should not repeat all shared feature context.

## 8.3 Implementation brief

The plan is the strong planner’s compiled work order. It should contain no unresolved material decision.

The readiness rule is:

> A weaker-agent implementation ticket is ready only when no product, architecture, security, migration or operational decision remains inside it.

Words that should normally trigger a readiness warning inside “Required changes” include:

- Investigate.
- Decide.
- Choose.
- Consider.
- Determine.
- Work out.
- Explore.
- Design an approach.

Those verbs are valid in a spike or preparation task, but not in a dispatched implementation brief.

## 8.4 Work-type overlays

Kanmer should not create a new workflow for every domain. Instead, the planner selects a lightweight template overlay.

### Fix

- Reproduction.
- Root cause.
- Required change.
- Regression boundary.
- Negative test.
- Stop condition.

### UI/UX

- User states: loading, empty, error, disabled, success.
- Keyboard and accessibility behavior.
- Responsive constraints.
- Existing design-system constraints.
- Visual proof.
- No unrelated redesign.

### Documentation

- Target audience.
- Source of truth.
- Claims being changed.
- Examples that must be executed.
- Version/date sensitivity.
- Secret and project-specific data checks.

### Cloud/infrastructure

- Tenant/subscription/project/environment.
- Identity and least privilege.
- Infrastructure-as-code change.
- Dry-run/plan output.
- Cost impact.
- Rollback.
- Deployment and production verification.
- No secrets in ticket or proof.

### Data/migration

- Current and target schema.
- Up and Down behavior.
- Backfill and failure handling.
- Runtime identity permissions.
- Restricted-role test.
- Rollback and data-loss analysis.

These overlays add relevant checks without creating new ticket types or stages.

---

# 9. Gates: four meaningful boundaries

Gates do not make an agent follow instructions. They prevent incomplete or stale work from being promoted.

Quality comes from three layers:

1. **Steering:** precise scope, context, constraints, steps and stop condition.
2. **Guardrails:** leases, project identity, worktrees, permissions, stage and merge gates.
3. **Feedback:** compiler, tests, static analysis, diff review and integration verification.

## 9.1 Ready to implement

Hard checks:

- An approved outcome exists.
- Approval revision is current.
- An implementation brief exists when required.
- No unresolved material question remains.
- No “decision” task remains in the implementation brief.
- Required predecessor tickets are complete.
- Project fingerprint matches.
- Base SHA and selected context are recorded.
- Ticket is not held by another valid lease.
- Required risk overlays are declared.
- The execution packet can be generated.

This gate should prevent dispatch, not merely prevent a later board move.

## 9.2 Ready for review

Hard checks:

- PR exists and maps to the ticket.
- Current PR head SHA is recorded.
- Applicable `[pre-review]` checklist items are complete.
- Required commands passed on the current head.
- Actual changed files are recorded.
- Unexpected files are explained.
- No uncommitted work remains.
- Implementation run ended with `PASS`, not `INCONCLUSIVE`.
- Material deviations were approved.

Unexpected file changes should initially warn rather than hard-block. File predictions are imperfect. Promote this to a block only for protected paths or after measured accuracy is high.

## 9.3 Ready to merge

This is a GitHub boundary, not just a Kanmer stage.

A required `kanmer/gate` status should evaluate:

```text
linked ticket exists
AND ticket is in Review
AND approval is current
AND current PR head SHA is the reviewed SHA
AND required CI is green
AND applicable pre-merge checklist items are complete
AND no blocking dependency remains
AND no open blocker/P1 finding remains
AND every P2 has an explicit disposition
AND required review threads are resolved
AND governing inputs have not changed
```

Severity policy:

- **Blocker/P1:** always block.
- **P2:** block until fixed, rejected with reason, or explicitly accepted/deferred by an authorized reviewer.
- **P3:** advisory, but must not silently disappear.

GitHub supports required status checks and conversation-resolution rules, and required checks can prevent merging until the current commit passes.

## 9.4 Ready for Done

Hard checks:

- PR is merged.
- Exact merged SHA is known.
- Verification ran on that exact SHA in a clean worktree.
- Applicable `[post-merge]` checks passed.
- Required `[post-deploy]` checks passed or are explicitly not applicable.
- Acceptance criteria map to evidence.
- Result is `PASS`; failures are not hidden by a successful rerun.
- For grouped features, the final integration ticket passed.

## 9.5 Stage-aware checklist syntax

Keep Markdown, adding small tags:

```markdown
- [x] [pre-review] Add restricted-role migration test.
- [x] [pre-merge] Required CI passes on current PR head.
- [ ] [post-merge] Verify the merged composition root.
- [ ] [post-deploy] Verify the production runtime identity.
```

Do not turn each item into a YAML object.

---

# 10. GitHub must become the physical enforcement boundary

The most serious observed failure is that Kanmer can say “blocked” while GitHub remains able to merge.

In Pegasus, a Kanmer review passed while serious GitHub findings remained. The missing production caller and database permission were repaired only by later PRs.

The same condition is visible in Kanmer now:

- `main` is unprotected and has no required checks.
- `kanmer-board` is unprotected and has no required checks.
- PR #64 is open, non-draft and mergeable.
- The PR has multiple unresolved P2 review threads, including a wrong-board/shadow-board risk, incomplete egress guidance, exposed infrastructure metadata, an overclaimed verification statement, secret-history risk and persistent environment pollution.
- No combined status checks were present when inspected.

## 10.1 Minimal implementation

Do not begin with a large GitHub App.

First:

1. Add one authoritative command:

   ```text
   npm run verify
   ```

2. Add a GitHub Actions PR workflow.
3. Add `kanmer check-pr --ticket <id> --pr <number>`.
4. Run it as a named job `kanmer/gate`.
5. Protect `main` and require:
   - PR.
   - `verify`.
   - `kanmer/gate`.
   - Conversation resolution.
   - No force push or deletion.
   - No routine bypass.

GitHub Actions can provide the required check. A GitHub App can be considered later for richer annotations and webhook synchronization. GitHub’s Checks API supports detailed summaries and line annotations, but write access through that API is specifically a GitHub App capability.

## 10.2 Board branch protection

`kanmer-board` is operational data and should not require a normal PR for every ticket mutation.

Recommended rules:

- Disable force pushes and deletion.
- Restrict ordinary pushes to the Kanmer synchronization identity.
- Run a lightweight board validator after every push.
- Show an unhealthy board immediately in the GUI.
- Record last successful local and remote sync.
- Refuse new agent mutations when local board state is known to have diverged, unless an explicit recovery flow is used.

---

# 11. Review redesign

## 11.1 Review findings must be structured

Current review prose in `scratch/review.md` is not sufficient as the merge authority.

A finding needs:

```yaml
id: PR64-F03
source: github-review
severity: P2
path: docs/manual/connect.md
head_sha: b208107...
status: open
disposition: null
remediation_ticket: null
```

Allowed statuses:

- `open`
- `fixed`
- `rejected-with-reason`
- `accepted-risk`
- `deferred-to-ticket`
- `obsolete-after-change`

New GitHub comments should:

- Appear in the Kanmer review view.
- Invalidate an existing pass.
- Turn `kanmer/gate` red.
- Require review of the current head.

## 11.2 Bind review to exact inputs

Review attestation should record:

- PR number.
- Head SHA.
- Ticket revision.
- Approval revision.
- Plan hash.
- Relevant governing-document hashes.
- Reviewer.
- Time.
- Verdict.

The pass becomes stale when any of those change.

## 11.3 Do not create a ticket for every review comment

Fix in the current PR when:

- The change is required for acceptance.
- It is small enough to review in the same PR.
- It does not create a new product decision.
- It remains inside the approved boundary.

Create a follow-up ticket when:

- It is independently valuable.
- It can safely be deferred.
- It materially expands scope.
- It needs separate research or design.
- It has a different owner or release boundary.

The finding record remains even when no follow-up ticket is created.

## 11.4 Independent review

High-risk work should require a different strong reviewer from the authoring planner/implementer. Low-risk work may be self-reviewed, but the record must say so.

---

# 12. Verification and evidence redesign

## 12.1 Exact commit

The current verify skill instructs the agent to update and test `main`, which is mutable.

Verification should use:

```text
.worktrees/verify-<ticket>-<merged-sha>
```

created at the exact merged SHA.

## 12.2 Typed results

Use:

- `PASS`
- `FAIL`
- `INCONCLUSIVE`
- `NOT_APPLICABLE`
- `WAIVED_BY_OPERATOR`

An aborted test process is `INCONCLUSIVE`, not PASS.

When a failed run later passes, retain both:

```yaml
attempt_1: FAIL
attempt_2: PASS
classification: flaky-or-environmental
follow_up: TEST-...
```

## 12.3 Acceptance mapping

Proof should answer:

- What criterion was tested?
- On which exact commit?
- In which environment?
- Which command or observation proves it?
- What was the exit code?
- What negative/regression behavior was checked?

A screenshot existing under `assets/` is not sufficient by itself.

## 12.4 Evidence freshness

Proof becomes stale when:

- Merged code changes.
- Acceptance criteria change.
- A governing decision changes.
- Verification environment changes materially.
- A deployment is replaced.

Old proof should be preserved, not silently overwritten.

---

# 13. Diff- and risk-aware assurance

Current profiles are useful but too coarse to catch deployment-shaped risks. The observed failures were driven by what the change touched, not by whether the ticket was labelled “feature” or “fix.”

Keep the existing profiles, but add **risk overlays**.

## 13.1 Start with three observed high-value overlays

### Database/migration overlay

Triggered by a new or changed migration.

Requires:

- Runtime-role permission decision.
- Up and Down behavior.
- Restricted-role test.
- Current-head migration check.
- Bootstrap/snapshot reconciliation.
- Rollback analysis.

### Production-caller/composition overlay

Triggered by a new store, service, interface or implementation.

Requires:

- Dependency-injection registration or an explicit reason none is needed.
- At least one production caller.
- Composition test.
- Dark/orphaned-code check.

### Runtime/container overlay

Triggered by a new native, browser, OS, font, package or runtime dependency.

Requires:

- Release-image/package inclusion.
- Runtime smoke from the packaged artifact.
- Resource impact.
- Failure behavior.
- Deployment proof.

These three directly correspond to Pegasus escape classes.

## 13.2 Later advisory overlays

Add only after real failures justify them:

- API/contract compatibility.
- Security/privacy/secret handling.
- Cloud/IaC/cost.
- UI/accessibility.
- Documentation/source correctness.
- Cross-repository compatibility.
- Release/migration ordering.

New controls should begin in advisory mode with:

- The defect they prevent.
- A concrete failure example.
- Expected signal.
- Runtime/cost.
- False-positive handling.
- Owner.
- Promotion criterion.
- Review/removal date.

This prevents control churn and overengineering.

---

# 14. Profiles: keep them, clarify their purpose

Current source defines `feature`, `fix`, `chore`, `spike` and `custom` profiles around required document existence.

The semantic feature hierarchy should not be encoded in the profile.

Recommended interpretation:

- **Feature profile:** high-assurance implementation work.
- **Fix profile:** standard implementation work.
- **Chore profile:** light, reversible work.
- **Spike profile:** research is the output.
- **Custom:** import/backfill or explicit exception.

A feature group can contain implementation tickets with different profiles.

Profile selection should be recommended from risk and reversibility:

- Persistent data?
- Security/privacy?
- Migration?
- Shared contract?
- Difficult rollback?
- Multiple repositories?
- Deployment/runtime change?

Do not add a profile for every domain.

---

# 15. Stored and effective workflow must converge

Current `board.yml` does not contain every rule the server enforces. Source code injects `fix.enter-review` and `questions-resolved` requirements at runtime, and comments explicitly acknowledge that the stored configuration is incomplete.

This means two server versions can interpret the same board differently.

Recommended correction:

1. Add a migration that writes the complete effective profiles into `board.yml`.
2. Preview the exact migration.
3. Retain runtime compensation for one compatibility period.
4. Remove it after migrated boards are established.
5. Make `get_status` report:
   - Stored profile hash.
   - Effective profile hash.
   - Whether they differ.
   - Why.
6. Make GUI and skills consume effective rules only through core/MCP.

The file store should remain the source of truth; the server should validate it, not silently invent permanent rules.

---

# 16. MCP redesign

MCP is model-controlled tooling. The protocol supports structured results, output schemas and actionable tool errors, and recommends clear user control for sensitive operations.

## 16.1 Current problems

The MCP server currently:

- Lives largely in one large registration file.
- Returns serialized JSON text through `ok()`.
- Returns a plain `Error: ...` string through `fail()`.
- Makes revision tokens optional.
- Uses `taken_at` rather than an expiring lease.
- Permits last-write-wins when `expected_version` is omitted.
- Allows normal creation directly in any stage.
- Contains tool descriptions with obsolete status/priority language.

## 16.2 Project identity on every mutation

Every response should include:

- Repository root.
- Board root.
- Remote origin identity.
- Board UUID.
- Board branch.
- Server version/hash.
- Project fingerprint.

Every mutation must receive `expected_project`.

Mismatch:

```json
{
  "ok": false,
  "error": {
    "code": "WRONG_PROJECT",
    "message": "This request targeted collisionengineers/kanmer but the server is serving collisionengineers/pegasus.",
    "retryable": false,
    "actualProject": "..."
  }
}
```

No write occurs.

## 16.3 Mandatory revisions

Agent mutations should require the revision last read:

- Ticket update/move.
- Take/release.
- Document write.
- Group write.
- Board write.
- Bulk operation.

GUI may offer a deliberate conflict-resolution path. Agent tools should not silently overwrite.

## 16.4 Real leases

Replace simple `taken_at` ownership with:

```yaml
lease_id: ...
ticket: ...
actor: ...
run_id: ...
branch: ...
worktree: ...
started_at: ...
expires_at: ...
last_heartbeat: ...
```

Taking is atomic. A second actor is refused unless the lease expired or an audited takeover is performed.

## 16.5 Idempotency

Creation and dispatch should accept `idempotency_key`.

This prevents retries from creating duplicate tickets or runs.

For bulk creation:

- Support dry run.
- Return a resumable batch ID.
- Repeated calls with the same key return the same result.
- Do not build a general transaction engine.

## 16.6 Structured output and errors

Use MCP `structuredContent` and `outputSchema`, retaining JSON text only for backward compatibility.

Stable error codes:

- `WRONG_PROJECT`
- `REVISION_CONFLICT`
- `LEASE_HELD`
- `LEASE_EXPIRED`
- `GATE_BLOCKED`
- `UNRESOLVED_DECISION`
- `STALE_APPROVAL`
- `STALE_PACKET`
- `STALE_REVIEW`
- `STALE_EVIDENCE`
- `DEPENDENCY_BLOCKED`
- `SYNC_REQUIRED`
- `PARTIAL_BATCH_FAILURE`

## 16.7 Extend `get_doc_gates`

Return:

```json
{
  "requiredNow": [],
  "recommendedNext": [],
  "optional": [],
  "alreadyComplete": [],
  "stale": [],
  "blockingReasons": [],
  "suggestedNextAction": "prepare-implementation",
  "reachableStages": []
}
```

This becomes the single answer used by GUI, skills and dispatch.

## 16.8 Add one execution-packet read

A justified composite read:

```text
get_execution_packet(ticket_id)
```

It returns only:

- Project identity.
- Ticket outcome.
- Feature context summary.
- Approved implementation brief.
- Checklist.
- Selected context files.
- Constraints.
- Commands.
- Stop condition.
- Risk requirements.
- Revision/hash tokens.
- Lease state.

It refuses when the ticket is not ready.

This is preferable to giving a weak agent the whole ticket folder or requiring many fragile reads.

## 16.9 Role-scoped tool surfaces

The weaker implementer should not see all board-administration tools.

Recommended scopes:

### Planner

- Read project/tickets/groups/docs.
- Create/update tickets and groups.
- Link dependencies.
- Write planning documents.

### Implementer

- Get execution packet.
- Acquire/heartbeat/release lease.
- Append run progress.
- Submit deviation.
- Read selected context.
- No board configuration, delete, arbitrary create, merge or governing-doc write.

### Reviewer

- Get review packet.
- Record findings and dispositions.
- Run premerge check.
- No implementation mutation unless explicitly delegated.

### Verifier

- Get proof plan.
- Record checks/evidence.
- Move to Done when gate passes.

This reduces accidental behavior more effectively than adding more instructions.

## 16.10 Safe workspace lifecycle

Add one action-oriented tool rather than repeated shell recipes:

```text
ticket_workspace(action: preview | create | inspect | cleanup)
```

It must:

- Refuse `.worktrees/kanmer`.
- Confirm branch ownership.
- Detect dirty/unmerged work.
- Use dry run for cleanup.
- Release the lease only after safe closeout.

## 16.11 Remote connector health

The failed live connector call shows that `get_status` cannot diagnose a transport that never reaches the server.

Add a separate connector-health surface:

- Endpoint/tunnel ID.
- Creation and expiry state.
- Last successful probe.
- Last Kanmer identity returned.
- Transport status.
- Authentication status.
- Server status.
- Board status.
- Reconnect/recreate action.
- Explicit distinction between HTTP transport failure and Kanmer tool failure.

Provide:

```text
kanmer tunnel doctor --json
```

Do not silently reconnect to a different board.

---

# 17. Skill redesign

## 17.1 General contract

Every phase skill should:

1. Confirm project identity.
2. Read ticket and group context.
3. Ask the gate engine what applies.
4. Perform only its phase.
5. Produce its declared output.
6. Return a structured handoff.

Skills must not restate fixed workflow requirements that can drift.

Current skills still impose a universal sequence in several places. The plan skill says research and files must be present even when the profile does not require them; execute always expects plan/checklist and writes a report; auto starts by researching every ticket.

## 17.2 Research skill

Trigger only when a material unknown exists.

Output:

```text
Questions
Sources
Facts
Inferences
Recommendations
Counterevidence
Confidence
Ticket consequences
Remaining unknowns
Stop condition
```

Rules:

- Separate fact from recommendation.
- Record source/version/date.
- Search for evidence against the preferred answer.
- Reuse group research.
- Stop when a responsible decision can be made.
- Do not research a reversible, obvious chore by default.

## 17.3 Planning skill

The strong planner should:

1. Decide whether this is feature-sized.
2. Create/update the feature group.
3. Resolve material decisions.
4. Produce the approval contract.
5. Show the user the approval view and decomposition.
6. Create small implementation tickets.
7. Write exact execution briefs.
8. Define a final integration ticket.
9. Select risk overlays.
10. Record complexity budget and non-goals.

It should not:

- Create one ticket per acceptance criterion.
- Require a new ADR for every choice.
- send the full research archive to the implementer.
- leave architecture selection in the implementation ticket.

## 17.4 Execute skill

The execute skill should be rewritten for weak-agent compatibility:

- Require `get_execution_packet`.
- Acquire a lease.
- Use the safe workspace tool.
- Read only selected context.
- Follow ordered steps.
- Allow bounded corrections from deterministic failures.
- Report a deviation rather than editing the plan.
- Stop at the explicit stop condition.
- Generate the implementation record from Git and run data.
- Never merge.

Deviation categories:

- Missing context.
- Unexpected required file.
- Dependency absent.
- Architecture mismatch.
- Security or irreversible change.
- Test failure outside scope.
- Approved outcome cannot be met.

## 17.5 Review skill

The review skill should:

- Review exact SHA.
- Pull GitHub threads and submissions.
- Write structured findings.
- Check approval, brief and actual diff.
- Verify tests apply to current SHA.
- Distinguish fix-now from deferable follow-up.
- Refuse pass when findings are undispositioned.
- Publish/recompute `kanmer/gate`.
- Not merge until the required GitHub check is green.

The current skill explicitly acknowledges that it merges before the Kanmer move and that GitHub is outside the gate engine. This must be removed as a workflow gap, not merely documented.

## 17.6 Verify skill

- Use exact merged SHA.
- Create clean detached worktree.
- Run deterministic checks first.
- Capture environment and outputs.
- Perform negative and regression checks.
- Record typed outcomes.
- Attach visual evidence where relevant.
- Mark evidence stale when inputs change.

## 17.7 Auto skill

Add:

- Durable run record.
- Bounded worker pool.
- Atomic leases before dispatch.
- Conflict graph beyond file overlap.
- Resource leases for LocalDB, browser suite, full test suite and migration snapshot.
- Shared group research.
- Dependency waves.
- Recalculation after shared contracts merge.
- Maximum retry count.
- Escalation instead of infinite redispatch.
- Stop a wave when a governing decision changes.
- One consolidated final report.

Parallel-agent experiments show that harness design, tests and work decomposition are the determining factors, not simply increasing the number of agents.

## 17.8 Closeout skill

Replace repeated cleanup instructions with the safe workspace tool:

1. Preview.
2. Confirm merged/abandoned state.
3. Apply cleanup.
4. Release lease.
5. Record result.

## 17.9 Setup skill

Setup should reconcile:

- Board format.
- Stored/effective profiles.
- Managed instructions.
- Skills.
- MCP registrations.
- Project fingerprint.
- CI workflow.
- Branch protection.
- Board sync.
- Remote connector health.

---

# 18. GUI redesign

## 18.1 Ticket editor views

Use tabs or modes:

1. **Approval**
2. **Execution**
3. **Review**
4. **Evidence**
5. **History**

Default to Approval for a human.

## 18.2 Approval card

Show:

- Outcome.
- User effect.
- Non-goals.
- Key decisions.
- Risks.
- Breakdown.
- Evidence.
- Approval status/revision.

Technical detail remains available but collapsed.

## 18.3 Material-change diff

When approval becomes stale, show only the material changes.

## 18.4 Feature group view

Show:

- Feature outcome.
- Child ticket outcomes.
- Dependency graph.
- Current blockers.
- Final integration ticket.
- Group completion derived from members.

No new group lifecycle is required.

## 18.5 Risk and readiness panel

Show:

- Ready/not ready.
- Unresolved decisions.
- Required risk overlays.
- Stale approval/plan/review/proof.
- Missing predecessor.
- Unexpected file overlap.
- Current lease.

## 18.6 Health screen

Show:

- Board and repository identity.
- Server build.
- Stored/effective profile mismatch.
- Board sync status.
- Connector/tunnel status.
- Stale leases.
- Conflicted files.
- Invalid board files.
- Missing branch protections.
- CI/gate state.
- Orphaned branches/worktrees.
- Stale proof.

Do not recreate a second backlog screen. Improve the existing surface.

---

# 19. Parallel work and duplicate prevention

The current board records GUI-085, GUI-086 and GUI-089 as effectively the same Windows test failure, with GUI-089 explicitly noting that parallel agents filed the issue three times because they could not see each other’s diagnosis.

## 19.1 Duplicate candidate warning

On create:

- Search title/body/paths/error strings.
- Return likely matches.
- Allow creation after explicit confirmation.
- Use idempotency key to make retries safe.

Do not use an LLM duplicate score as an automatic hard rejection.

## 19.2 Conflict graph

Compare:

- Expected files.
- Shared interfaces/schemas.
- Migration folders/snapshots.
- Lockfiles.
- Governing documents.
- Shared test fixtures.
- Deployment resources.
- Explicit dependencies.

Classify overlap:

- Safe.
- Ordered dependency.
- Unsafe concurrent work.
- Shared resource requiring a lease.

## 19.3 Bounded concurrency

Default to a small worker pool. Increase only from measured evidence.

Optimization target:

> Verified tickets completed without human correction, not agents kept busy.

---

# 20. Current ticket disposition

This is a representative audit of the current committed board snapshot, not a claim that no local changes exist after 18 August.

## 20.1 Deduplicate

- Keep one canonical ticket for the GUI-085/086/089 Windows test issue.
- Archive/link the others.
- Record why the duplicate occurred.
- Use it as the first duplicate-detection eval case.

## 20.2 Resolve decisions before implementation

Tickets such as:

- GUI-081.
- GUI-084.
- GUI-087.
- GUI-088.
- SKILL-015.

should remain in preparation or become short spikes until the strong planner chooses the behavior. Do not dispatch them as weak-agent implementation work.

## 20.3 Keep as spikes/investigations

Examples:

- GUI-091.
- GUI-092.
- GUI-093.
- CORE-024/CORE-025.

CORE-024 and CORE-025 should likely be one focused spike defining the minimum merge-gate contract, followed by separate implementation tickets. Two sequential “investigate CI” tickets add process without creating independent value.

## 20.4 Convert to feature groups and decompose

### GUI-094 — Portable Codex Connect

Recommended group:

1. **Launcher and installer contract**
2. **Codex Connect selection, probe and config**
3. **Packaging and real-host verification**
4. **Documentation and migration**
5. **Final end-to-end integration**

The existing plan remains valuable source material. It should be divided into bounded execution briefs.

### Secure remote access

Group:

- DOC-010 — user and operator documentation.
- MCP-021 — provider-neutral tunnel contract.
- GUI-095 — lifecycle/health UI.
- Final security and multi-project integration ticket.

MCP-020 controlled background dispatch should be a separate feature group because it creates a different authorization and execution boundary, even if it later uses the same tunnel.

### Other likely feature-sized work

- GUI-090.
- CORE-026.
- MCP-020.
- MCP-021.

## 20.5 Keep as normal implementation tickets after brief cleanup

Examples include:

- CORE-028/029/030.
- MCP-017/018/019.
- DOC-008/009.
- SKILL-017.

These should still receive an exact brief, but they do not justify a new hierarchy.

## 20.6 PR #64

Before merge:

- Reconcile all current GitHub findings.
- Correct or explicitly disposition each P2.
- Run current verification.
- Bind review to current head SHA.
- Do not rely on its present “mergeable” state as evidence of readiness.

---

# 21. Release and deployment workflow

## 21.1 Separate workflow state from delivery state

Keep the six stages.

Add optional delivery metadata:

```yaml
merged_sha: ...
integration_target: main
release_candidate: rc-12-2
deployment_state: not-deployed
environment: null
production_verification: pending
```

A ticket can be in Verifying without pretending it is deployed.

## 21.2 Freeze release candidates

For high-volume repositories:

1. Select an exact integration SHA.
2. Create immutable `release/<name>-rc1`.
3. Generate manifest:
   - SHA.
   - PRs.
   - tickets.
   - migrations.
   - runtime artifacts.
   - deployment checks.
4. Review and test that ref.
5. Create rc2 after remediation.

Evidence for rc1 must not carry over to rc2.

A release audit should test integration and deployment. It should not reconstruct whether every individual feature had a caller, permission or reviewed current SHA.

## 21.3 Merge queue

Do not add a merge queue to Kanmer immediately.

Use it in repositories with high concurrent PR throughput after required checks are established. GitHub’s merge queue tests changes against the latest target-branch state and is intended for busy branches.

---

# 22. Overengineering controls

## 22.1 Evidence before abstraction

Create an abstraction when:

- Two real consumers already exist, or
- One high-risk invariant needs centralized enforcement.

For generic extension systems, wait for a third consumer.

## 22.2 Complexity budget

Every plan should list additions:

| Type | Examples |
|---|---|
| Dependency | New package |
| Persistent state | New file, field, table |
| Runtime | Service, worker, daemon |
| Public surface | Tool, API, setting |
| Operations | Migration, deployment, recovery |
| Duplication | New source of truth |
| Documentation | Durable PRD/FRD/ADR |

For each:

- Which outcome requires it?
- What simpler option was rejected?
- How is it removed?
- Who maintains it?

## 22.3 Document triggers

Create:

- **Vision:** multi-release purpose.
- **PRD:** multiple user capabilities.
- **FRD:** behavior must remain stable across tickets/releases.
- **ADR:** cross-cutting, difficult-to-reverse technical decision.
- **Research:** a material unknown blocks a responsible decision.
- **Plan:** sequencing/risk/coordination requires it.
- **Checklist:** mechanical progress benefits from it.
- **Proof:** the change needs verifiable evidence.

A design choice does not automatically require an ADR.

## 22.4 Vertical slices

Build the smallest end-to-end outcome before a generalized framework.

## 22.5 One surface

Do not create two full editing surfaces for the same workflow unless they serve materially different users.

## 22.6 Control trial

Every new gate starts advisory and earns mandatory status through evidence.

## 22.7 Explicit non-goals for this redesign

Do not build now:

- Nested parent/child tickets.
- Feature-specific board stages.
- A second workflow engine.
- Feature branches.
- A database.
- Event sourcing.
- A generic policy DSL.
- A generic distributed scheduler.
- A new skill for every domain.
- LLM-based hard judgement of prose quality.
- Automatic merge.
- Dozens of diff detectors.
- A GitHub App before the Action-based gate proves the contract.

---

# 23. Greenfield workflow

## 23.1 Select depth

### Lean

For prototypes, local utilities and reversible experiments:

- One-page brief.
- Non-goals.
- System boundary.
- Walking skeleton.
- Small first-horizon backlog.
- Basic CI.

### Standard

For multiple workflows, integrations or contributors:

- Feature groups.
- Shared decisions.
- Selective research.
- Durable behavior docs where needed.
- First-release dependency map.
- Integration verification.

### High assurance

For sensitive data, regulated work, destructive migrations or multi-system delivery:

- Threat/failure analysis.
- Migration and rollback.
- Independent review.
- Traceable acceptance and proof.
- Stronger deployment gates.

## 23.2 Sequence

1. Project brief.
2. Dangerous unknowns.
3. System boundary.
4. Walking skeleton.
5. Architecture reassessment.
6. Vertical release slices.
7. Detailed first horizon only.
8. Parallel ownership.
9. Basic quality rail.
10. Replan after the first real release.

Do not generate the project’s lifetime backlog before the walking skeleton reveals which assumptions are wrong.

---

# 24. Agent adherence evaluations

Kanmer should maintain disposable “golden boards.”

Initial cases:

1. Small chore that should not trigger research.
2. High-risk feature requiring full evidence.
3. Spike whose research is the deliverable.
4. Two agents racing to take one ticket.
5. Concurrent document edits.
6. Wrong-project mutation.
7. Stale approval packet.
8. PR head changes after review.
9. GitHub comment arrives after pass.
10. Merged SHA differs from reviewed SHA.
11. Duplicate ticket retry.
12. Three agents diagnose the same failure.
13. Runtime dependency absent from package.
14. New service has no production caller.
15. Migration works as admin but fails as runtime role.

Score:

- Correct project.
- Correct tools.
- Decision adherence.
- Unnecessary documents.
- Missing required evidence.
- Scope expansion.
- Conflict recovery.
- Human corrections.
- Cost/tokens.
- Verified outcome.

Agent evals should exercise tools, state changes and multiple turns, not only compare a final text answer.

---

# 25. Metrics

Primary metric:

> Verified outcomes completed with no human correction, workflow bypass or stale evidence.

Supporting metrics:

- P1 findings after merge.
- Remediation PRs per original PR.
- Tickets entering Review with incomplete pre-review checks.
- Merges with stale review SHA.
- Release-audit blockers.
- `INCONCLUSIVE` or flaky verification.
- Duplicate tickets.
- Concurrent overlap.
- Human approval time.
- Material changes after approval.
- Documents never read.
- Agent cost per verified outcome.
- Remote connector availability.

Do not optimize for:

- Number of documents.
- Number of tickets.
- Number of tools.
- Number of agents.
- Amount of generated prose.

---

# 26. Implementation order

## Phase 0 — Immediate policy and backlog correction

- Adopt the approval-contract and implementation-brief templates manually.
- Stop dispatching tickets with unresolved design verbs.
- Deduplicate GUI-085/086/089.
- Reframe GUI-094 and remote-access work as feature groups.
- Require PR #64 findings to be dispositioned before merge.
- Define the final integration-ticket rule.

## Phase 1 — Stop merge escapes

1. Add `npm run verify`.
2. Add GitHub Actions.
3. Protect `main`.
4. Add `kanmer check-pr`.
5. Require `kanmer/gate`.
6. Require conversation resolution.
7. Store exact-SHA review attestations and findings.

These are the highest-value reliability changes.

## Phase 2 — Readable approval and weak-agent execution

1. Canonical feature-group context template.
2. Canonical ticket approval summary.
3. Strict implementation-brief template.
4. Approval/Execution/Review/Evidence GUI views.
5. `get_execution_packet`.
6. Material-change invalidation.
7. Profile-adaptive skill rewrite.

## Phase 3 — Parallel and mutation safety

1. Mandatory project fingerprint.
2. Mandatory revision tokens.
3. Real leases and heartbeats.
4. Idempotency keys.
5. Run records.
6. Safe workspace tool.
7. Duplicate candidate warnings.
8. Conflict/resource detection.

## Phase 4 — Evidence and risk

1. Structured proof.
2. Exact merged-SHA verification.
3. Evidence freshness.
4. Migration overlay.
5. Production-caller/composition overlay.
6. Runtime/container overlay.
7. Delivery metadata.
8. Frozen release manifests.

## Phase 5 — Maintainability and measurement

1. Generate contract documentation from core schemas.
2. Materialize effective profiles.
3. Split MCP registration by domain.
4. Split `KanmerStore` gradually.
5. Split large GUI components gradually.
6. Golden-board eval suite.
7. Workflow metrics.
8. Advisory-control lifecycle.

---

# 27. Proposed Kanmer upgrade backlog

Use existing groups and assign actual IDs through Kanmer.

## Group A — Enforceable merge boundary

1. Create canonical `npm run verify`.
2. Add PR GitHub Actions workflow.
3. Implement `kanmer check-pr`.
4. Publish required `kanmer/gate`.
5. Store structured review findings.
6. Bind review to exact SHA and approval revision.
7. Protect `main`.
8. Final integration test using a disposable repository.

## Group B — Readable feature and execution contracts

1. Add feature-group context template.
2. Add short approval-summary template.
3. Add exact implementation-brief template.
4. Add approval revision/hash.
5. Add `get_execution_packet`.
6. Rewrite plan and execute skills.
7. Add GUI Approval/Execution views.
8. Test with GUI-094 decomposition.

## Group C — Safe parallel agents

1. Mandatory mutation revisions.
2. Project fingerprint enforcement.
3. Ticket leases.
4. Durable run records.
5. Idempotency keys.
6. Safe workspace lifecycle.
7. Duplicate warnings.
8. Conflict/resource leases.
9. Test the GUI-085/086/089 scenario.

## Group D — Trustworthy proof

1. Typed verification results.
2. Exact-SHA verification worktrees.
3. Structured proof metadata.
4. Evidence freshness.
5. Top three risk overlays.
6. Frozen release candidate manifest.
7. Pegasus-shaped regression scenarios.

---

# 28. Canonical examples

## 28.1 Human approval card

```markdown
# What you are approving

## Outcome
Kanmer write operations refuse to modify a board when the caller expected a
different project.

## Why
Remote and multi-project agents can otherwise write to the wrong repository.

## User effect
The write is rejected before any file changes and returns a clear WRONG_PROJECT
error naming the expected and actual project.

## In scope
- Shared fingerprint format.
- Validation on all MCP mutations.
- Tests for match and mismatch.

## Out of scope
- Read tools.
- GUI redesign.
- Remote tunnel lifecycle.

## Main risk
Older clients do not yet send the fingerprint. The rollout must preserve a
measured compatibility path and then make it mandatory.

## Evidence
A mismatch test proves no file bytes changed; all existing mutation tests pass.
```

## 28.2 Weak-agent execution brief

```markdown
# Objective

Add project-fingerprint validation to Kanmer MCP mutations.

# Starting state

`get_status` returns the project and repository roots. Mutation tools do not
require the caller to confirm the expected project.

# Required changes

1. Add `expected_project` to the shared mutation input contract.
2. Compare it with the server fingerprint before initialization or mutation.
3. Return `WRONG_PROJECT` on mismatch.
4. Include expected and actual fingerprints.
5. Prove no file was written on mismatch.

# Expected files

- packages/mcp-server/src/write.ts
- packages/core/src/projectFingerprint.ts
- packages/mcp-server/src/write.test.ts

# Do not modify

- GUI components
- Board storage format
- Read-only tools
- Release scripts

# Constraints

- No new dependency.
- Preserve successful output compatibility.
- Use the shared structured-error envelope.

# Acceptance checks

- Matching fingerprint permits the write.
- Mismatching fingerprint writes no bytes.
- Error code is `WRONG_PROJECT`.
- Existing mutation tests pass.

# Commands

npm test -w @kanmer/mcp-server
npm run typecheck

# Deviation rule

Stop and report if the shared mutation seam does not exist or the change would
require a storage-format migration.

# Stop condition

Stop after implementation and specified checks. Do not begin GUI or tunnel work.
```

---

# 29. Final recommendation

The best Kanmer design is not a larger process. It is a **compiled workflow**:

- The human approves a short, honest contract.
- A strong planner resolves ambiguity and compiles that contract into small work orders.
- A weaker agent receives one bounded execution packet.
- A deterministic harness controls identity, workspace, tests and evidence.
- A strong reviewer reconciles the actual diff and every review finding.
- GitHub physically refuses stale or incomplete merges.
- Exact-SHA verification proves what landed.
- A final integration ticket proves the feature rather than assuming completed parts compose.

This preserves Kanmer’s strongest qualities—transparent files, fixed stages, profiles, groups, worktrees and auditable evidence—while correcting the failures exposed by Pegasus and by Kanmer’s own live board.

The essential principle is:

> Keep the technical detail, but stop making every audience read all of it.
