# Open questions — CORE-035

All scenario decisions are resolved.

- [x] **Can a local bare repository substitute for GitHub?** — No. A real disposable private GitHub repository is required to prove Actions checks, conversations, protection, and merge refusal.
- [x] **May the production Kanmer repository/board be used as the fixture?** — No. Use a fully separate disposable repository, board branch, and worktrees.
- [x] **Does this ticket add a reusable integration harness?** — No by default. The deliverable is the real interaction log/proof; any repeated-harness need becomes a follow-up ticket.
- [x] **Which packet refusals must be shown?** — Spike, missing/gated preparation, unresolved question after docs are complete, and occupancy by another actor.
- [x] **Which merge-gate outcomes must be shown?** — At minimum `NO_TICKET` and unresolved questions, plus every phase-2 outcome shipped by CORE-025 (`WRONG_STAGE`, `DEPENDENCY_BLOCKED`, review-record/staleness, commit reachability) with its actual warn/fail severity.
- [x] **How is a warning counted as firing?** — Record its exact emitted code/severity/output; do not claim it blocked merge when the shipped policy is advisory.
- [x] **May a required check, conversation, or rule be bypassed to finish the run?** — No. The happy path must complete with no override or temporary weakening.
- [x] **What implementation is used?** — A minimal dependency-free Node 20 function/test change sufficient to create a real diff and verification claim.
- [x] **Which SHA is verified?** — The exact full `mergeCommit.oid` from the happy-path PR in a detached worktree.
- [x] **What counts as proof?** — A chronological retained command/MCP/GitHub log plus a final CORE-035 proof record; failed attempts remain visible.
- [x] **When is the disposable repo deleted?** — Only after proof is written/read back and cleanup evidence can be recorded.
- [x] **What if the operator lacks private-repo/protection permissions?** — Stop and report the capability blocker. Do not use a mock/local substitute or the production repository.
- [x] **May product defects discovered during the run be fixed here?** — No. File a separate fix ticket and stop/re-run after it lands.

## Parked (explicitly deferred)

No questions are parked.
