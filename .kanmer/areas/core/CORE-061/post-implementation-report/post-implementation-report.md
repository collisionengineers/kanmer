# Post-implementation report — CORE-061

## Outcome

Recorded the board-branch handoff convention in the canonical managed AGENTS block:
the repository variable `KANMER_BOARD_BRANCH` is authoritative and the explicit
fallback is `kanmer-board`. The paragraph documents the administrator-owned
branch-protection/checks and repository-variable handoff, and tells agents to stop
when the observed branch and configured convention disagree.

The same canonical body is present in `scripts/agents-block-body.mjs`, the fenced
copy in `plugins/kanmer/skills/kanmer-setup/SKILL.md`, and generated `AGENTS.md`.
The prose validator allows the documented `kanmer-board` convention token without
mistaking it for a skill reference.

## Scope and lineage

Changed only the managed-block source/fence/generated guide and the validator's
allowlist for that literal convention token:

- `scripts/agents-block-body.mjs`
- `plugins/kanmer/skills/kanmer-setup/SKILL.md`
- `AGENTS.md`
- `scripts/verify-skill-prose.mjs`

The branch is based directly on CORE-043 cumulative head
`4f106865947e556759aeb88363ea9aab7c01beac`; the implementation commit is
`216dcdf0`. No protected branch, repository variable, or GitHub check setting
was mutated by this ticket. Those administrator/external effects remain
INCONCLUSIVE and are explicitly outside this implementation lane.

## Verification

- `npm run verify:agents-block` — exit 0, 31/31 checks passed.
- `npm run verify:skills` — exit 0, all checks passed.
- `npm run check:manual` — exit 0, manual current (22 chapters).
- `npm run verify:docs` — exit 0.
- `npm run build:core` — exit 0.
- `npm run test:scripts` — exit 0, 88/88 passed after the core build.
- `git diff --check` — exit 0.

The first `npm run test:scripts` attempt exited 1 because the fresh worktree
lacked branch-local `packages/core/dist/index.js`; that exact failure was preserved
in scratch, then the prescribed `npm run build:core` was run and the full rerun
passed 88/88. No failure was suppressed.

## Review handoff

PR #181: https://github.com/collisionengineers/kanmer/pull/181

PR head `216dcdf0`, base `core-043-protection-retarget` at cumulative
`4f106865`. This ticket is ready for independent review and is not merged.
