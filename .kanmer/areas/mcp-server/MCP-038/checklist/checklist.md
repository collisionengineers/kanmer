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

- [ ] Independent reviewer records PASS or findings.
- [ ] PR #111 is merged into main.

## Verification and closeout

- [ ] Verify plugin:check and byte reproducibility on merged main.
- [ ] Write proof on merged main.
- [ ] Move through Done and release the ticket.
- [ ] Remove the worktree and branch after the merged commit is reachable.
