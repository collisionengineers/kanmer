## Execution evidence — 2026-08-21

Implemented in `.worktrees/mcp-022` on `mcp-022-project-fingerprint`, commit `7283abf`.

Fingerprint vectors: Windows canonical roots `c:/Kanmer/Board` / `c:/Kanmer/Repo`; exact source-independent payload hashing is asserted in smoke. Every one of the 18 write schemas is checked at the protocol surface. A wrong token on a fresh root returns `Error:` plus `structuredContent.error.code = WRONG_PROJECT`, leaves the complete byte snapshot unchanged and does not create `.kanmer`. Representative `create_items` and `migrate_board` wrong-token calls also fail before handler execution. Stale revision and direct/collapsed document-gate failures preserve legacy text and report `REVISION_CONFLICT` / `GATE_BLOCKED`; unrelated validation remains uncoded.

Evidence: workspace typecheck/build; stdio smoke 184/184; raw protocol 42/42; discovery 13/13; HTTP 3/3; diff check. Plugin bundle rebuilt in ticket worktree; normal-checkout plugin check remains post-merge only by tool design.
