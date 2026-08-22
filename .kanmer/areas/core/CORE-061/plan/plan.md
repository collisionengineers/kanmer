# Plan — CORE-061

## Governing docs

- **FRD-020:** record the configurable board branch and safe rename handoff alongside the Git worktree behavior.
- **ADR-0016:** keep branch protection and GitHub merge physics external; document the operator action rather than inventing a hidden client.

## Approach

Add one concise convention paragraph to the canonical managed block source, mirror it in the setup skill's fenced block, and regenerate `AGENTS.md` using the existing writer. State the fallback, the exact `KANMER_BOARD_BRANCH` variable, the retarget-before-cleanup rule, and the prohibition on agents changing protected refs or repository settings. Run the existing verifier and related documentation rails.

## Ordered steps

1. Update `scripts/agents-block-body.mjs` with the repository-variable and administrator-handoff convention.
2. Synchronize the setup skill fenced block and regenerate `AGENTS.md` through `scripts/agents-block.mjs`.
3. Run `npm run verify:agents-block`, skill/manual/docs checks, and diff inspection; preserve any unrelated baseline failures.
4. Write the post-implementation report, commit, open the PR, and hand off for independent review.

## Proof and risks

The exact managed-block verifier proves source/fence/generated parity, idempotence, and marker handling. The residual risk is external GitHub configuration drift; the text directs administrators to maintain the variable and agents to stop rather than guess.
