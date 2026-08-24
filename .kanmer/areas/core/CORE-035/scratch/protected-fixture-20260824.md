# Protected fixture rerun — 2026-08-24

- Fixture PR: https://github.com/collisionengineers/kanmer-core035-protected-20260824t142522z-dd4f69a4/pull/2
- Fixture head: `fc22eb9bbc4fc0cdbd421934dfdc8e0079e0db3a`
- Production ancestor exercised: `7579341048f8d5952916dd7556bff0504f720eab`
- Hosted run: https://github.com/collisionengineers/kanmer-core035-protected-20260824t142522z-dd4f69a4/actions/runs/32747239427 — PASS.
  - `kanmer-gate` job 97495579155: PASS; fetched the separate board worktree and resolved the ticket evidence.
  - `verify` job 97495579365: PASS; canonical-source identity step and authoritative Windows verification passed.
- Protection readback is unchanged: strict required `verify` + `kanmer-gate`, one approving review, resolved conversations, administrators enforced, and force/delete disabled.
- Historical PR #1 and its failed run remain preserved.
- PR #2 is intentionally OPEN and blocked with `REVIEW_REQUIRED`. No review, merge, proof, or Done move was made. A formal approval from a different GitHub identity, followed by the protected merge and exact merged-SHA verification, remains required.
