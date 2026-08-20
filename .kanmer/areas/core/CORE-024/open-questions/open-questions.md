# Open questions — CORE-024

All phase-1 design decisions are resolved.

- [x] **Which board does the gate read?** — A separately fetched `origin/kanmer-board` worktree under `$RUNNER_TEMP`; never the PR checkout.
- [x] **May the evaluator call `init()`/`ensureInit()` or mutate activity?** — No. Construct/read `KanmerStore` only; board/read failure exits 2.
- [x] **How is a ticket resolved?** — Whole-line PR-body `Kanmer: <ID>` footer first, then branch prefix `/^([A-Z0-9]{2,6}-\d+)/i`; IDs normalized uppercase.
- [x] **What if an explicit footer references a missing/non-ticket item?** — Fail `NO_TICKET`; do not fall back to branch.
- [x] **What if body contains distinct valid-looking footer IDs?** — Fail `NO_TICKET` as ambiguous. Repeated identical footer lines resolve once.
- [x] **How are questions counted?** — A public read-only store helper delegates to the existing `countCheckboxes(ticketDir,"open-questions",{stopAtParked:true})`.
- [x] **Do absent/zero-checkbox question files block?** — No.
- [x] **Do parked unchecked questions block?** — No. Only unchecked boxes above each file’s parked heading count.
- [x] **Are question checks profile/stage-dependent?** — No. Phase 1 always checks the resolved ticket before merge.
- [x] **Which phase-1 codes exist?** — `NO_TICKET` and `OPEN_QUESTIONS`, both error-level.
- [x] **What are CLI exits?** — 0 evaluated/pass; 1 evaluated/gate fail; 2 could not evaluate/infrastructure failure.
- [x] **Where does JSON go?** — One deterministic verdict on stdout; escaped `::error::` annotations on stderr.
- [x] **Does the job depend on `verify` or skip drafts?** — No. It is an independent sibling and checks drafts like any PR event.
- [x] **Which permissions are required?** — Existing `contents: read` only.
- [x] **When does branch protection require the job?** — Only after it has posted on a real PR and the exact displayed check name is recorded through CORE-033’s playbook procedure.
- [x] **Does this change the MCP tool surface/plugin bundle?** — No.

## Parked (explicitly deferred)

No questions are parked. Stage/dependency/review-SHA/commit-reachability checks belong to CORE-025.
