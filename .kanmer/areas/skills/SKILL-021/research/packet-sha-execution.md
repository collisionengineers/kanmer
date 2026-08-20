# Research — SKILL-021: bind execution, review, and verification to exact packets and SHAs

## Questions

1. Which current skill instructions permit stale, incomplete, or wrong-commit work?
2. How should the three phase skills consume MCP-023/MCP-024 without duplicating gates or record schemas?
3. What exact Git/GitHub choreography keeps implementation isolated and post-merge verification immutable?

## Findings

### Execute

- `kanmer-execute` currently begins by separately reading plan/checklist and assumes both exist. This repeats a universal preparation contract and makes the agent assemble context/gates manually.
- MCP-023 replaces that assembly with `get_execution_packet`. It returns profile-derived readiness, authoritative ticket/group/docs/gates, stop condition, commands hint, and a project fingerprint.
- The first data call after orientation must be `get_execution_packet <id>`. `ready:false` is a hard stop: do not take, create a branch/worktree, modify files, or “fill in” missing preparation as execution.
- MCP-022 compatibility is asymmetric: 0.3.3 servers reject unknown `expected_project`. Execute must read `get_status` before any write, send the packet fingerprint only when `compat.expectedProject === "optional"` (or a future supported value), and omit the field when capability is absent.
- The implementation workspace remains exactly `.worktrees/<id-lowercase>` and never `.worktrees/kanmer`; `take_ticket` must record the actual branch/path.
- Execute must stop at the packet’s `stopCondition`. It never merges and never starts another ticket, even when the next work appears obvious.

### Review

- Current `kanmer-review` appends prose to scratch and treats review as the owner of merge. Appending cannot maintain frontmatter, and the review is not bound to a PR head or plan version.
- MCP-024 defines `scratch/review.md` as a whole-file review attestation. The skill must:
  - obtain current `headRefOid` from `gh pr view` immediately before review;
  - read `plan/plan.md` and retain its MCP content-version as `plan_hash`;
  - retain ticket `updated` timestamp;
  - gather the actual diff, status checks, review decisions/comments, and unresolved review threads;
  - write/replace `scratch/review` using `set_ticket_doc` and `expected_version`, not `append_scratch`.
- Every GitHub review finding/thread needs a disposition in the attestation. Fixed, rejected-with-reason, accepted-risk, or deferred-to-ticket are explicit; open blocker/major findings produce `needs-changes` and prevent merge.
- The PR head must be re-read immediately before merge. A changed head invalidates the attestation; rerun review and replace it.
- Once required checks exist, any red, cancelled, pending, missing required, or stale-head check prevents merge. The skill must not interpret a locally green command as a substitute.
- Merge remains a human-delegated review action in this horizon, but only after current-head attestation, dispositions, green required checks, pass verdict, and user/standing authorization. The skill never silently self-approves its own work; `independent:false` must be explicit.

### Verify

- Current `kanmer-verify` updates/checks out mutable `main`, so it can test a commit newer than the ticket’s merge and can disturb the user’s main checkout.
- Exact merge identity comes from `gh pr view <pr> --json state,mergeCommit`. An unmerged PR or null merge commit means verification is early and must stop.
- The immutable verification workspace is created after `git fetch origin`:

  `git worktree add --detach .worktrees/verify-<id-lowercase>-<merged-sha-short> <full-merged-sha>`

  The MASTERPLAN names `<merged_sha>`; using a short suffix for filesystem length is acceptable only if the full SHA is still the detached target and record value. Prefer full SHA when path limits permit.
- Verification never pulls, resets, checks out, or updates `main` in any checkout. It never uses `.worktrees/kanmer` or the implementation worktree as a substitute for the exact detached SHA.
- `proof/proof.md` is a whole-file frontmatter record from MCP-024. Read existing proof/version, append attempts logically, retain failures, replace with `expected_version`, and set `merged_sha` to the exact target.
- Only top-level `PASS` permits `move_item done`. `FAIL`/`INCONCLUSIVE` stop and produce remediation; existence of the file alone must not be treated by the skill as success.
- Cleanup of the temporary verification worktree is deterministic after evidence is safely written; failure to remove it is reported for closeout rather than hiding proof.

### Verification rail and packaging

- These are skill-source changes. No MCP tool schema or bundled binary changes.
- `scripts/verify-skill-prose.mjs` already verifies hard worktree and boundary rules; updated wording must remain compliant.
- CORE-035 provides the end-to-end disposable-board proof after dependencies land. This ticket’s own acceptance is skill verification plus source-level fixture/dry-run review of the exact call order.

## Decisions

- Modify only the three phase skill files unless a targeted verifier assertion is needed to prevent an exact regression.
- Reference the MCP-024 canonical record schema rather than creating competing templates.
- Preserve review’s authorized merge responsibility but make it current-SHA/check/disposition bound.
- Verify only a detached exact merged SHA and never mutate main.

## Remaining unknowns

None. MCP-023 and MCP-024 must land first; they are implementation blockers, not design questions.
