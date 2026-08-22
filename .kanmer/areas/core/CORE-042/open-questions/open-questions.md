# Open questions — CORE-042

## Resolved decisions

- **How does a release reach protected main?** Preparation creates and pushes
  only `release/v<version>`, then opens a normal PR targeting `main`. The
  human/authorized operator merges it after `verify` and conversation gates.
- **When is the tag created?** Only in explicit post-merge `--publish` mode
  from clean merged `main`, after ancestry and manifest checks. No tag is
  created on the preparation branch.
- **Does the tag workflow publish?** No. `.github/workflows/release.yml` stays
  contents-read-only and verifies the already-published assets.
- **What does dry-run mean?** It is a no-write preview of both phases and never
  switches branches, opens a PR, tags, publishes, or rewrites manifests.
- **What existing safeguards remain?** Shared verify steps, release notes,
  token/version checks, deterministic MCP/plugin/MCPB builds, updater package
  checks, latest-release visibility, repair-once, and exact asset digest checks.
- **Are new dependencies or board stages needed?** No. The flow stays
  dependency-free and uses existing GitHub CLI/operator authorization; no board
  stage/profile/merge queue is added.

## Parked (explicitly deferred)

- [ ] Live branch-protection enforcement, human PR merge, tag publication,
  GitHub asset visibility, and real packaged update-cycle evidence are external
  post-merge operations. The report will preserve them as INCONCLUSIVE until
  the authorized operator runs and records the publish phase and hosted tag
  workflow.
- [ ] Choosing an unattended release bot or merge queue is outside CORE-042;
  the approved path is an authorized human/operator PR boundary.

No unresolved implementation questions remain.
