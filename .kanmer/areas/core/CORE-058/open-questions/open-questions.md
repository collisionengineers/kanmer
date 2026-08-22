# Open questions — CORE-058

- [x] Should the exact ignore rule be `.kanmer/data/sources/`? Yes: it is the derived cache directory named by FRD-027/CORE-044 and is narrower than ignoring all `.kanmer/data`.
- [x] Should existing attached and branch-mismatch board worktrees be reconciled as well as newly created ones? Yes: every `ensureBoardWorktree` success path must make the rule idempotently present before later `syncBoard` staging.
- [x] Can the linked ticket worktree run `plugin:check`? No. The guard must remain; artifact parity will be proven from a normal checkout and the linked-worktree refusal will be recorded honestly.

## Parked (explicitly deferred)

Live GitHub release packaging, installed-app/plugin-host interaction, and retroactive cleanup of already-committed cache history are outside this deterministic ticket and remain INCONCLUSIVE/deferred.
