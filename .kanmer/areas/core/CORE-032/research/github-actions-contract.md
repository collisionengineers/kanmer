# Research — CORE-032: first pull-request verification workflow

## Question

What is the smallest GitHub Actions workflow that exposes CORE-031’s authoritative verification rail as a stable Windows PR check, without accidentally running for the board branch or advertising unfinished merge-gate behaviour?

## Findings

- The repository has no `.github/workflows/` files and no existing CI convention to preserve. Source: repository tree and Git history for `.github/`.
  - This ticket creates the first check name that later branch protection will depend on, so its job identity is a compatibility boundary rather than cosmetic wording.
- Root `package.json` declares Node `>=20`, has a lockfile at package-lock format 3, and CORE-031 introduces `npm run verify`. Sources: `package.json`, `package-lock.json`, and CORE-031.
  - `npm ci` is therefore the deterministic install command; no package-manager setup beyond Node is required.
- The verification rail includes Windows-relevant GUI tests, path/discovery behaviour, Electron-main modules, and linked-worktree protections. Sources: `package.json`, `apps/gui/src/main/*.test.ts`, `packages/core/src/discover.test.ts`, and `scripts/check-plugin-sync.mjs`.
  - A Linux runner would not exercise the product environment that has produced the observed failures. `windows-latest` is a load-bearing requirement.
- GitHub’s default shell for `run:` steps on Windows is PowerShell, while the adopted follow-on gate design uses Bash environment syntax (`$RUNNER_TEMP`, `$GITHUB_EVENT_PATH`). Source: MASTERPLAN Appendix A.
  - Setting `defaults.run.shell: bash` at workflow level now keeps the first and later jobs consistent and prevents a shell change when CORE-024 adds `kanmer-gate`.
- A workflow triggered only by `pull_request` with `branches: [main]` and the four specified activity types cannot run for direct pushes to `kanmer-board`. Source: GitHub Actions event semantics as encoded by the ticket contract; no `push`, `workflow_dispatch`, or broad branch trigger is needed.
  - `opened`, `synchronize`, and `reopened` cover ordinary PR lifecycle changes. `ready_for_review` ensures a draft becoming ready receives a fresh run. Draft PRs are still checked on open/synchronize; there is no draft conditional.
- The least-privilege workflow permission is `contents: read`, sufficient for checkout and all local verification commands. The rail does not upload artifacts, comment on PRs, publish checks through an API, or read the board branch in this phase.
- Standard actions are sufficient: `actions/checkout@v4` and `actions/setup-node@v4` with `node-version: 20`. Adding a cache, matrix, concurrency group, artifact upload, retry wrapper, or split jobs would create behaviour not required by the seed.
- `npm ci && npm run verify` should remain one named run step, as fixed by the ticket. It ensures verification cannot start after a failed install and keeps the visible job surface to one check.
- The workflow can prove itself on the PR that adds it. Post-merge evidence that `kanmer-board` pushes do not create runs belongs in verification/proof, because the implementation must not fabricate a board push or alter branch protection.

## Implications

- Add one workflow file with one job ID/name, `verify`; do not add a placeholder `kanmer-gate` job.
- Pin the event, target branch, shell, runner, Node major, permissions, and command exactly as stated.
- Keep the workflow deliberately boring: checkout, setup Node, run install plus the shared rail.
- Record the displayed check name and duration from the real PR. CORE-033 must use the observed name rather than guessing it.
- Branch rules, write permissions, board fetching, PR metadata parsing, and merge-gate evaluation remain outside this ticket.

## Open questions

No unresolved design question remains. The workflow topology and every load-bearing setting are fixed by MASTERPLAN S-02.
