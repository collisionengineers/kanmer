# CORE-035 disposable integration run

- Run ID: `20260822t075446z-78e5ba65`
- Planned fixture repository: `collisionengineers/kanmer-spine-integration-20260822t075446z-78e5ba65`
- Exact production source SHA under test: `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b` (origin/main, merged CORE-025)
- Operator: `collisionengineers` (authenticated `gh`; no credentials recorded)
- Started UTC: `2026-08-22T07:54:46Z`
- Host: Windows; Node/npm and Git versions to be recorded with the command log.
- Isolation: production checkout/board are read-only context only; all fixture source/board/worktrees will be under a disposable temp root.
- Expected refusal matrix: INT-001 spike/GATE_BLOCKED; INT-002 missing docs then questions-resolved; INT-003 occupied by other actor then same-actor resume; INT-004 packet ready.
- Expected gate matrix: NO_TICKET, WRONG_STAGE, DEPENDENCY_BLOCKED, OPEN_QUESTIONS, NO_REVIEW_RECORD, STALE_REVIEW, COMMITS_UNREACHABLE, then green current-head gate.
- Expected protection matrix: required verify pending/red, unresolved conversation, then protected merge with required checks green and no bypass.
- Exact-SHA verification: detached worktree at disposable mergeCommit.oid, full SHA equality, detached/clean assertions, fixture focused test + scripts rail + verify.
- Cleanup: pending; record repository deletion and local path absence before any PASS claim.
- External proof boundary: no live source/board mutations; stop INCONCLUSIVE if private-repo/protection/check capability is unavailable; never fabricate cloud/GitHub results.
