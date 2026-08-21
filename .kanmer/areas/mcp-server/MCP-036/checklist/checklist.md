# Checklist — MCP-036

## Preparation

- [x] Read MCP-025 packet, review finding, FRD-025, and ADR-0017.
- [x] Confirm current listener/timer/socket start and close semantics.

## Implementation

- [x] Resolve project fingerprint before binding.
- [x] Retain readiness metadata without a second project resolution.
- [x] Roll back every partial startup resource on failure.
- [x] Add no-board/fingerprint-failure regression.
- [x] Preserve valid start, HTTP smoke, and official-client behavior.

## Verification

- [x] HTTP unit rail passes (7/7).
- [x] Build and HTTP smoke pass.
- [x] stdio/protocol/discovery smokes pass (184/184, 42/42, 13/13).
- [x] Root typecheck and npm test pass on merged main; no failures hidden.
- [x] plugin:check and git diff --check pass on merged main.
- [x] Independent review PASS recorded, including MCP-037 remediation disposition.

## Review and closeout

- [x] Post-implementation report written.
- [x] PR #109 remediation merged through PR #107 at main commit 4d65d91.
- [x] Merged-main proof written.
- [x] Ticket moved through Done and released.
- [x] Worktree and branch removed after merge reachability was confirmed.
