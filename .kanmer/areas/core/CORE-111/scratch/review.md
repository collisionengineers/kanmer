---
kind: review-attestation
pr: "284"
head_sha: "829c8148dabed55c37b8d37d08985fd1ab722fb5"
verdict: pass
reviewer: "codex-independent-reviewer:/root/review_core111_release_pr"
independent: true
plan_hash: "0589afab5e9fc822"
ticket_updated: "2026-08-26T20:31:33.282Z"
findings: []
---

# Independent review — CORE-111 / PR #284

## Scope and binding inputs

This is an independent, bounded review of PR #284 at exact head `829c8148dabed55c37b8d37d08985fd1ab722fb5`, committed as `release: v0.3.12` with parent `0349f269a4f2e6c31cccd2d610c823f3718bfc77`. It is bound to the current CORE-111 plan version `0589afab5e9fc822` and ticket revision `2026-08-26T20:31:33.282Z`. The reviewer is a separately assigned agent role from the release controller.

The scope is limited to the v0.3.12 release-manifest and generated-plugin artifact preparation, current required checks and current GitHub feedback, the approved CORE-111 release preparation, and blocker/P1/major regression risk. It does not attest to publication, external release assets, installation, or post-merge verification; those remain the release and verification steps in the plan.

## Implementation and acceptance alignment

PR #284 is open, non-draft, and CLEAN at the bound head. Its sole commit changes exactly the release-script-derived eight files:

- root GUI and lockfile versions: `package.json`, `apps/gui/package.json`, and the three matching lockfile entries;
- `mcpb/manifest.json`;
- all three plugin manifests; and
- `plugins/kanmer/mcp/kanmer-mcp.cjs`, whose compiled `SERVER_VERSION` changes from `0.3.11` to `0.3.12`.

Every changed version is exactly `0.3.12`; there are no dependency, application-behaviour, architecture, or unrelated-file changes. This matches CORE-111's expected release-script outputs and FRD-021 R3's coherent-version and release-notes discipline. The compiled bundle change prevents plugin consumers from receiving a server that reports the previous release version.

## Required checks and current feedback

- Required `verify`: **pass**, workflow run `33010428025`, job `98316686828`, completed 2026-08-26T20:30:54Z. The authoritative verification-rail step completed successfully.
- Required `kanmer-gate`: **pass**, workflow run `33010428025`, job `98316683363`, completed 2026-08-26T20:33:33Z. Its dependency installation, read-only-core build, exact ancestry fetch, separate board-worktree fetch/assertion, and phase-2 merge gate all completed successfully.
- GitHub reports no reviews, issue comments, or review threads. The GraphQL review-thread query returns an empty set, so there are no current or non-outdated thread findings to disposition.

## Decision and residual risk

**Pass.** The current exact head is a scoped, coherent v0.3.12 release-preparation change with both required checks green and no open blocker, P1, major, or GitHub feedback finding.

Residual release risk is explicitly outside this pre-merge attestation: the controller must still merge this PR and run the governed publish command, verify the immutable tag and assets, then perform the installed-control-plane checks and exact-SHA verification before CORE-111 can close.
