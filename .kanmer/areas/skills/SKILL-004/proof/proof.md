# Proof

## Merged-main identity and reachability

Verification ran from the normal repository checkout on branch main, not the feature worktree and never the board worktree. HEAD and origin/main were both af61144ce743f74b2aba92fb0778588b0b9bedd0. The scoped implementation commit ad127405437f9a93eef5e86d697ccaadf0ebc8af9 (docs(setup): one reconcile loop in place of three modes) is an ancestor of HEAD; git merge-base --is-ancestor exited 0. The fresh reconciliation branch had no source delta, and git diff origin/main...HEAD for plugins/kanmer/skills/kanmer-setup/SKILL.md was empty.

Existing PR #17 remains the traceable historical delivery. No new feature commit or PR was created during verification.

## Merged-main checks

| Command | Result |
|---|---|
| npm run verify:skills | PASS, exit 0; all 13 semantic skill-prose sections passed and the 12-skill roster was found. |
| npm run verify:agents-block | PASS, exit 0; 31/31 checks passed, including byte identity of the fenced managed block. |
| npm run build:core | PASS, exit 0; core ESM/browser/DTS builds and browser check completed. |
| npm run test:scripts | PASS, exit 0; 80/80 passed on merged main after the core build. |
| npm run typecheck | PASS, exit 0 across core, MCP server, UI, and GUI. |
| git diff --check | PASS, exit 0. |
| git merge-base --is-ancestor ad127405437f9a93eef5e86d697ccaadf0ebc8af9 HEAD | PASS, exit 0. |

The earlier fresh-worktree run retained in the report had an initial test:scripts exit 1 because packages/core/dist/index.js did not yet exist; build:core followed and the exact rerun passed 80/80. That setup prerequisite failure is not presented as a merged-main regression.

## What this proves

The merged setup skill contains the format-independent reconcile loop, version-step and migration guidance, managed-block refresh, one-source ingestion order, explicit issue close confirmation sequence, source-marker idempotency guidance, per-plan-item historical ticket rules, plan/proof placement, fixed-stage/area/profile guidance, and the retained greenfield brief interview. Static semantic and managed-block rails pass, and the implementation SHA is reachable from merged main.

## Explicitly inconclusive boundaries

No live setup execution was performed against a disposable format-3/legacy board. Migration dry-run/apply, a second-run no-op, plan/history ingestion, source-marker duplicate suppression, issue listing/confirmation/close/comment/report, and greenfield board creation remain INCONCLUSIVE. Closing GitHub issues is destructive external state and no issue was touched. No screenshot or human interactive setup evidence exists. These boundaries are preserved from the report, checklist (13/18), and independent PASS WITH ACCEPTED RISK review; they are not upgraded to PASS by the static rails.

## Verdict

Merged-main deterministic verification PASS for the scoped setup-reconciliation implementation, with the runtime/externally destructive behavior listed above INCONCLUSIVE. The proof is sufficient for the Verifying to Done gate under the accepted-risk review disposition.
