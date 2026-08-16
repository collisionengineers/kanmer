# 1.8 Traceability: commits / PRs / deployment — M (request #16)

- **Where:** `types.ts` (frontmatter + `DeploymentConfigSchema` on the board), `frontmatter.ts` (`KEY_ORDER`), `store.ts` (validation), `board.ts` (default = deployment absent).
- Always-available optional arrays **`commits: string[]`** (SHAs) and **`prs: string[]`** (PR refs — number or URL), emitted only when non-empty (the `blocks` camp). Auto-populated by Phase 8 skills (`kanmer-execute` from the branch/worktree, `kanmer-closeout` from `gh`); hand-editable YAML.
- **Board-gated deployment.** New optional `board.yml` block:

```yaml
deployment:                 # absent ⇒ the field never appears on any ticket (non-cloud projects)
  environments: [ production ]   # ordered; "live" = the last/only one. Extensible (e.g. [staging, production]).
```

  When present it activates a per-ticket **`deployment`** field — a **flat string** (no object shape): **`n/a`** (not deployable — docs/tooling; always accepted) | **`not-deployed`** | **`<env-id>`** (deployed to that environment; must be one of `deployment.environments`). `store` validates `deployment` only when `board.deployment` exists (reject otherwise, like `assertFieldAgainstBoard`). `get_status`/`list_board` surface whether deployment tracking is on. **Out of scope:** CI/CD auto-detection of live state — `deployment` is set manually or at closeout.
- `KEY_ORDER` additions (after `blocks`/`refs`): `commits`, `prs`, `deployment`.
