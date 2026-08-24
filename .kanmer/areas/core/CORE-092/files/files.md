# Files — CI board-branch fetch ref

| Path | Role | Change |
| --- | --- | --- |
| `.github/workflows/pr.yml` | Pull-request `kanmer-gate` workflow | Fetch the board branch into an explicit remote-tracking ref before creating its temporary worktree. |
| `scripts/pr-workflow.test.mjs` | Workflow contract test | Assert that the workflow fetches and consumes the same explicit board ref. |
| `packages/mcp-server/src/check-pr.mjs` | Existing merge-gate CLI | Read only; confirm it remains present and exercised by its existing test suite. |

No application runtime files, dependencies, board schema, or Cloudflare configuration change.
