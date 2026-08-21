# MCP-038 checklist

## Preparation

- [x] Record the merged-main plugin:check failure and canonical regeneration evidence.
- [x] Map the generated artifact and verification scripts.
- [x] Resolve preparation questions.

## Implementation

- [x] Regenerate the committed standalone MCP bundle.
- [x] Confirm the diff is artifact-only.
- [x] Run plugin:check and diff checks.
- [x] Write the post-implementation report.

## Review

- [x] Independent reviewer records PASS; first candidate mismatch fixed by rebasing and regenerating.
- [x] PR #111 corrected commit 0636eda merged into main at ed8d390.

## Verification and closeout

- [x] Verify plugin:check and byte reproducibility on merged main; SHA-256 48583b7eb295dc599822dc65778a4adda9181755323824ef984f74aa4d309f6e.
- [x] Write proof on merged main.
- [x] Move through Done and release the ticket.
- [x] Remove the worktree and branch after the merged commit is reachable.
