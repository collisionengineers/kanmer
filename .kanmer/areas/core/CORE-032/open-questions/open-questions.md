# Open questions — CORE-032

All decisions required for implementation are resolved by MASTERPLAN S-02.

- [x] **Which event and branch should invoke CI?** — Only `pull_request` targeting `main`, with activity types `opened`, `synchronize`, `reopened`, and `ready_for_review`.
- [x] **Which operating system and shell are authoritative?** — `windows-latest` with workflow-level `defaults.run.shell: bash`.
- [x] **Which runtime is installed?** — Node 20 through `actions/setup-node@v4`.
- [x] **How many jobs and checks are exposed?** — Exactly one job named/identified `verify`; no `kanmer-gate` stub.
- [x] **What permissions are granted?** — `contents: read` only.
- [x] **What command does the job run?** — One run step containing `npm ci && npm run verify`.
- [x] **Should `kanmer-board` pushes run this workflow?** — No; no `push` trigger is declared.
- [x] **Should caching, matrices, artifacts, retries, or other optimization be added?** — No. First establish the exact check and measure its real duration.

## Parked (explicitly deferred)

No questions are parked. Branch protection is owned by CORE-033; merge-gate job behaviour is owned by CORE-024.
