---
kind: review-attestation
pr: "220"
head_sha: "a42046176640b575f205f13113b77c4750e23050"
base_sha: "973bcf9340aa2c627c717a00f1bcf0f6d3fca242"
verdict: needs-changes
reviewer: "codex-gui099-executor"
independent: true
plan_hash: "6d1e6d7162bf7418"
ticket_updated: "2026-08-22T22:32:48.695Z"
findings:
  - id: F-001
    severity: blocker
    disposition: needs-changes
    reason: "A clean detached checkout of the exact PR head passes npm ci but npm run mcpb:check exits 1 after a fresh standalone build: the generated server is f52d9c5b3817b12432e211438913146908c32874bf74ac261839a21ee31ea58c, while the committed plugin is 7298b5c268ac5995cadd56f6bbd4bcbe301f97a6a72eddd2f53d64a346158d75; check-mcpb-sync reports MCPB server differs from distributed plugin copy."
  - id: hosted-checks
    severity: minor
    disposition: accepted-risk
    reason: "PR #220 has no hosted status checks attached; the local clean-checkout parity failure is preserved as the blocking evidence."
---

## Independent review — CORE-090 / PR #220

Reviewed exact head a42046176640b575f205f13113b77c4750e23050 against base 973bcf9340aa2c627c717a00f1bcf0f6d3fca242. The diff is exactly one generated file, plugins/kanmer/mcp/kanmer-mcp.cjs, with no source changes; git diff --check against the base exits 0. The artifact scope is appropriate, but the artifact does not satisfy the ticket's parity contract in a clean workspace.

Exact evidence from a clean detached checkout with its own npm ci installation:

- npm ci --ignore-scripts --no-audit --no-fund --prefer-offline: exit 0;
- npm run mcpb:check: exit 1 after build and valid 37-tool/2-prompt MCPB creation;
- fresh standalone server SHA-256: f52d9c5b3817b12432e211438913146908c32874bf74ac261839a21ee31ea58c;
- committed PR artifact SHA-256: 7298b5c268ac5995cadd56f6bbd4bcbe301f97a6a72eddd2f53d64a346158d75;
- failure: scripts/check-mcpb-sync.mjs reports MCPB server differs from distributed plugin copy.

The implementation report claims mcpb:check passed in a linked cumulative worktree, but that result is not reproducible in a clean exact-head checkout and is contradicted by the authoritative parity command. Regenerate the artifact from the clean cumulative tree, rerun mcpb:check, and obtain fresh hosted evidence before merge. Verdict: NEEDS-CHANGES; no merge performed.
