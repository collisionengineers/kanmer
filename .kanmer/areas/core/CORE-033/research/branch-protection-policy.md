# Research — CORE-033: branch-protection policy and rollout

## Question

Which repository rules are required to make `main` physically PR/check-gated without breaking Kanmer’s direct-push board synchronization, and in what order can they be enabled safely?

## Findings

- Kanmer deliberately stores board state in a dedicated worktree on the `kanmer-board` branch. Source: `docs/manual/board-sync.md` and FRD-020 R1.
- Automatic board sync stages the board files, commits when dirty, fetches/rebases, and performs an ordinary direct push to the board branch. It never force-pushes and never touches another branch. Source: `docs/manual/board-sync.md`, “What a sync actually does”, and FRD-020 R3.
  - Therefore requiring a pull request or a status check on `kanmer-board` would break a shipped product path.
  - Disallowing force pushes and branch deletion is compatible with the shipped path and protects the operational history.
- CORE-032 creates the first real `verify` check. GitHub branch protection matches the check as it is displayed, so the observed check name must be captured from a real run rather than inferred from workflow YAML. Source: MASTERPLAN S-03 and Appendix A.
- The compiled-workflow approval contract makes protection a deliberate one-way social door: enable it only after the Windows verification rail has succeeded twice. GUI-085 is a prerequisite because its non-deterministic Windows timeout could otherwise turn protection into a repository-wide false blocker. Source: EPIC-009 context and CORE-033 dependency graph.
- The adopted protection contract for `main` is narrow:
  - require changes through a pull request;
  - require the exact observed `verify` check;
  - require conversation resolution;
  - disallow force pushes and deletion.
  It does not authorize additional approvals, code-owner review, signed commits, linear history, deployment gates, merge queue, required-up-to-date branches, branch locking, or push restrictions. Source: MASTERPLAN S-03.
- The adopted contract for `kanmer-board` is even narrower:
  - disallow force pushes;
  - disallow deletion;
  - leave ordinary direct push available;
  - do not require pull requests or status checks.
- CORE-024 will later add the actual `kanmer-gate` job. Requiring a check before GitHub has seen it can make every PR permanently unmergeable. The safe rollout is: merge the implementation, let the job post on a real PR, record its exact displayed name, then add it to the required checks. Source: MASTERPLAN S-03 and Appendix A.
- Repository settings are operational state, not fully represented by a source diff. A durable playbook is required so another operator can reproduce, inspect, repair, and extend the settings without relying on memory.
- Protection must apply to administrators/bypass-capable actors as far as the repository’s rule mechanism permits; otherwise a direct push test could succeed for the maintainer while failing for ordinary contributors, leaving the intended physical boundary porous. The playbook must record any unavoidable actor bypass explicitly rather than presenting the rule as absolute.

## Implications

- The only repository file added by this ticket is `docs/plans/compiled-workflow/playbook.md`; the branch/ruleset mutations themselves occur in GitHub settings.
- Configuration must not begin until both blockers are done and two distinct successful `verify` runs on real PR heads have been recorded.
- The playbook must distinguish initial rollout from the later CORE-024 expansion and must name exact observed check strings.
- Verification must include settings readback plus controlled behavioural tests: an unchecked PR is blocked, a normal direct push to `main` is refused, and an ordinary board sync/direct push still succeeds.
- A failure of the CI service is not permission for an agent to bypass protection. Any emergency temporary rule change is an operator action with a reason, timestamp, and follow-up ticket, followed by immediate restoration.

## Open questions

No product decision remains. The only values to be discovered at execution time are operational evidence—the exact check display name, the two successful run IDs/head SHAs, and the GitHub rule identifiers—which the playbook provides explicit fields to record.
