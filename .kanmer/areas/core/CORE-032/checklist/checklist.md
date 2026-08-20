# Checklist — CORE-032

- [ ] Confirm CORE-031 is merged and root `npm run verify` exists and is green in a normal checkout.
- [ ] Create `.github/workflows/pr.yml` as the only implementation file.
- [ ] Configure only `pull_request` events targeting `main`.
- [ ] Restrict activity types to `opened`, `synchronize`, `reopened`, and `ready_for_review`.
- [ ] Set top-level `permissions: contents: read` and no write permissions.
- [ ] Set workflow-level `defaults.run.shell: bash`.
- [ ] Define exactly one job with ID `verify` and display name `verify`.
- [ ] Set the job runner to `windows-latest`.
- [ ] Add `actions/checkout@v4` with no unnecessary history or board fetch.
- [ ] Add `actions/setup-node@v4` with `node-version: 20` and no unmeasured cache configuration.
- [ ] Add one run step containing exactly `npm ci && npm run verify`.
- [ ] Confirm there is no `push`, `workflow_dispatch`, schedule, merge-group, path filter, matrix, retry, artifact, or second workflow/job.
- [ ] Confirm there is no `kanmer-gate` placeholder.
- [ ] Run `git diff --check` and inspect the complete workflow diff.
- [ ] Confirm `git status --short` lists only `.github/workflows/pr.yml`.
- [ ] Open the PR against `main` with `Kanmer: CORE-032` in the body.
- [ ] Confirm the current PR head receives exactly one check named `verify`.
- [ ] Confirm the run uses Windows, Bash, Node 20, and executes both `npm ci` and `npm run verify` successfully.
- [ ] Record the run ID, head SHA, conclusion, and elapsed duration; note whether it meets the under-ten-minute target.
- [ ] After merge, use an ordinary board-sync push to confirm `pr.yml` creates no `kanmer-board` run; do not manufacture a board change.
- [ ] Stop at review readiness; do not configure protection, add `kanmer-gate`, merge, or begin a blocked ticket.

## Progress notes

Append the real GitHub run identifiers and observations here. Static YAML inspection is not a substitute for the real PR check.
