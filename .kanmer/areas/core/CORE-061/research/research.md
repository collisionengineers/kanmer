# Research — CORE-061

## Question

Where is the repository's governing contributor convention generated, and where must the `KANMER_BOARD_BRANCH` handoff be recorded so agents receive the same instruction as the workflow?

## Findings

1. `AGENTS.md` begins with a marker-delimited block owned by `kanmer-setup`; edits inside it are overwritten. `scripts/agents-block-body.mjs` is the canonical source, and `plugins/kanmer/skills/kanmer-setup/SKILL.md` carries the fenced copy verified byte-for-byte by `scripts/verify-agents-block.mjs`.
2. The root contributor section also states that command/convention changes update `AGENTS.md` in the same PR. The current managed instructions do not mention the workflow repository variable or the administrator handoff.
3. `.github/workflows/pr.yml` reads `vars.KANMER_BOARD_BRANCH || 'kanmer-board'`; branch protection and required checks therefore depend on this external convention.
4. The board-sync and troubleshooting manuals describe branch renames but do not name the repository variable. CORE-059 owns the retained-ref behavior; this ticket owns the governing instruction and exact managed-block parity.

## Implications

The convention belongs in the canonical managed-block source and its fenced skill copy, then must be regenerated into `AGENTS.md` with the existing writer. A separate unmanaged duplicate would drift and fail the repo's own source-of-truth rule. The change should state the fallback, the administrator retarget-before-cleanup sequence, and that agents must not mutate the protected branch or GitHub variable themselves.
