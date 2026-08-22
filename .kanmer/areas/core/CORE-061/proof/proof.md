# Proof — CORE-061

## Merged target and lineage

PR #181 (https://github.com/collisionengineers/kanmer/pull/181) is MERGED as
non-squash merge commit `8c09342459a471f5941b014c577d14e6abc0ae56` into
`core-043-protection-retarget`. The implementation commit
`216dcdf0cc4fd1f303b9d68ed801d03c92e69c0a` is an ancestor of that merge
(`git merge-base --is-ancestor` exit 0). Verification ran in the detached
review worktree at the current merged cumulative target
`f63d953fc8467440988c887c62a34ade0c77c96c`, which contains the merge and is
the branch targeted by PR #181; `origin/main` does not yet contain this
protected-branch cumulative line.

## Exact evidence

All commands ran from the clean detached merged-target worktree
`.worktrees/core-043-cumulative-review` at `f63d953fc8467440988c887c62a34ade0c77c96c`:

- `npm run verify:agents-block` — exit 0, 31/31 checks passed, including
  canonical source/setup fence/generated AGENTS parity, idempotence, marker
  integrity, and the GUI canonical-body pointer.
- `npm run verify:skills` — exit 0, all checks passed; 12-skill roster and
  managed convention references are valid.
- `npm run check:manual` — exit 0, manual current (22 chapters).
- `npm run verify:docs` — exit 0.
- `npm run build:core` — exit 0, browser and Node core artifacts built.
- `npm run test:scripts` — exit 0, 89/89 passed on the merged target.
- `git diff --check` — exit 0.
- Direct content inspection confirms `KANMER_BOARD_BRANCH`, explicit
  `kanmer-board` fallback, administrator retarget-before-cleanup handoff,
  and the agent protected-ref stop rule in `scripts/agents-block-body.mjs`,
  `plugins/kanmer/skills/kanmer-setup/SKILL.md`, and generated `AGENTS.md`.

The prior implementation report's first fresh-worktree pre-build failure is
retained in that report. This verification target had the required dependency
installation and its scripts rail passed 89/89; no failure was hidden.

## External boundary

No live GitHub repository-variable update, branch-protection mutation, or
protected-ref cleanup was authorized or performed. Those administrator-owned
effects remain INCONCLUSIVE by design; this ticket proves the governing
convention and fail-closed handoff text, not external GitHub configuration.

## Result

Merged-target deterministic proof PASS. Verified on the PR #181 cumulative
merge target; ready for Verifying → Done and closeout.
