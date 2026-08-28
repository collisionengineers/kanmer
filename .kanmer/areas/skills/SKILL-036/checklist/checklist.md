# Checklist — SKILL-036

*One independently tickable box per ordered plan step or acceptance check.
Append progress notes rather than rewriting.*

- [x] [pre-review] Create the branch and worktree from a freshly fetched `origin/main` (`28a12643`) via `take_ticket`, using absolute paths only.
- [x] [pre-review] Read `kanmer-auto/SKILL.md` in full and list the check-13/14 literals that must survive verbatim before making any edit.
- [x] [pre-review] Rewrite `kanmer-auto` §1's scope sentence to accept one ticket, one explicit existing group, one area, an explicit ticket list, or the prepared board — keeping the literal string `one explicit existing group`.
- [x] [pre-review] State in §1 that a non-group scope names a **run host group** whose `automation/` folder owns the record, and that the host group's membership is not the roster.
- [x] [pre-review] State that the roster is frozen in `## Selection contract` at run creation, is never re-resolved, and that a later-created ticket or any `profile: "capture"` item never joins it.
- [x] [pre-review] Add the Preflight subsection: project fingerprint match, `get_status.repo` staleness reported not repaired, delivery policy read once for the PR and verification targets (never hardcode `main`), board worktree health, and multi-controller scope ownership.
- [x] [pre-review] Widen §2's overlap definition to contract/API surface, migrations, lockfiles and heavyweight shared resources, and add the rail-contention rule.
- [x] [pre-review] Add the sync-before-gate clause naming the absolute-path git comparison of `kanmer-board` against `origin/kanmer-board`, and `get_status.boardSync` as the candidate-server equivalent.
- [x] [pre-review] Add the evidence-hygiene clauses: read proofs and attestations in full (never frontmatter-only), absolute paths in every git command, unique verifier log paths, scope discipline on dispositioned minor/note findings, and no secrets-manager list command.
- [x] [pre-review] Add the bounded-churn and escalation-boundary section: one automatic replan for a plan defect recorded once per ticket, and a `blocked` lane quoting `REMEDIATION_BUDGET_EXHAUSTED` verbatim with no `review → preparing` route around it.
- [x] [pre-review] Add the active Review/Verifying invariants section, including reconciling a merged PR left in Review and a PASS proof left in Verifying before the run reports anything.
- [x] [pre-review] Extend §7 with merge coordination (controller dispatches the reviewer that merges; still never runs `gh pr merge`) and the `required_conversation_resolution` obligation.
- [x] [pre-review] Confirm §4 is still literally `## 4. Mandatory stop predicates` and that no existing section was renumbered.
- [x] [pre-review] Add `scope`, `scope_selector`, `authority` and `delivery_target` to `run-state-template.md`, a frozen-roster line to Selection contract, and a `Replan` ledger column — keeping all five headings and all eleven asserted fields.
- [x] [pre-review] Add `scope` and `scope_selector` to `current-run-template.md`, keeping `run_path: automation/runs/<run-id>.md` and `## Resume instruction`.
- [x] [pre-review] Add the board-sync and thread-resolution clauses to `kanmer-review/SKILL.md` without reintroducing either phrase check 18 forbids.
- [x] [pre-review] Add the hosted-CI discharge rule (same-SHA re-run + diff-untouched confirmation + mechanism argument), the read-the-proof-in-full rule and the unique verifier log to `kanmer-verify/SKILL.md`, adding no fifth `failure_class`.
- [x] [pre-review] Write check block 19 in `scripts/verify-skill-prose.mjs` asserting every new clause in the one skill that acts on it, plus the template fields and the two negative assertions; leave `EXPECTED_SKILLS` at 12.
- [x] [pre-review] Add fixture tests to `scripts/verify-skill-prose.test.mjs` proving each new check FAILS when its clause is removed.
- [x] [pre-review] Correct the `kanmer-auto/` line in `AGENTS.md` after confirming it is outside the `kanmer:instructions` managed block.
- [x] [pre-review] Run `npm run verify:skills` and record the exit code; confirm `ALL CHECKS PASSED` and `the roster is 12 skills`.
- [x] [pre-review] Run `npm run verify:agents-block` and record the exit code.
- [x] [pre-review] Run `node --test scripts/verify-skill-prose.test.mjs` and `npm run test:scripts`; record exact exit codes without weakening any assertion.
- [x] [pre-review] Confirm `git diff --stat` contains no `packages/` path, no `plugins/kanmer/mcp/` bundle and no tool-reference file.
- [x] [pre-review] Confirm each FRD-034 acceptance criterion and both edge cases maps to a named section, as tabulated in the plan's Governing docs.
- [x] [pre-review] Record `npm run verify`'s exit code and name the antigravity `EBUSY` pair as CORE-128's, not this ticket's.
- [x] [pre-review] Write the post-implementation report with every command and exit code, the parked operator-only question, and any deviation.
- [x] [pre-review] Open the PR against the delivery policy's PR target with a `Kanmer: SKILL-036` footer and move Implementing → Review.
- [x] [pre-review] Stop at the approved boundary: do not review, do not merge, do not resolve GitHub review threads, do not file follow-up tickets, do not start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills.
Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

- Branch `skill-036-durable-goal-orchestration`, worktree `.worktrees/skill-036`, created from `origin/main` `28a12643`. Implementation commit `aa5f73da`.
- **Deviation from the plan's Commands list:** `npm run verify` was **not run**. A linked git worktree has no `node_modules`, so the full rail cannot execute there, and `scripts/check-plugin-sync.mjs` refuses to run from a linked worktree by design. The bundle is untouched, so `plugin:check` is not owed. The focused rails (`verify:skills`, `verify:agents-block`, `test:scripts`, the fixture tests) were run instead, and hosted CI on the PR is the rail of record.
- `npm run test:scripts` exited 1 with four failures, all discharged with evidence in the post-implementation report: two belong to `scripts/antigravity-plugin-config.test.mjs` (CORE-128's lane, untouched by this diff), and two are `ERR_MODULE_NOT_FOUND` on the unbuilt `packages/core/dist` — both re-run green from the built main checkout (`pass 2 / fail 0`) at the same code, with the diff confirmed not to touch either test file or anything it imports.
- One operator-only question is parked in `open-questions` with its recommendation implemented as the conservative default; no follow-up ticket was filed, per HZN-008's Scope discipline section.

---

## Closeout — SKILL-036

- [x] PR merge verified (`gh pr view --json state,mergedAt`) — state MERGED, mergeCommit 70d23efda85b3d347e36ad7f1e55fa0d4d32c754, mergedAt 2026-08-28T06:42:57Z
- [x] proof.md finalised — already contains PR 302 identity and merge date in verified prose (version 147fd0a95938ae05, result PASS); left unmodified per operator instruction
- [x] Moved to final stage — status `done`, not archived
- [x] Outcome recorded in ticket body (PR link, follow-ups, deployment n/a)
- [x] cd out of worktree; `git worktree remove .worktrees/skill-036` — exit 0
- [x] `git branch -d skill-036-durable-goal-orchestration` — exit 0 (safe delete succeeded, no `-D` needed)
- [x] `git fetch --prune` + `git worktree prune` — both exit 0; remote branch also deleted (`git push origin --delete`)
- [x] `take_ticket action: "release"`
