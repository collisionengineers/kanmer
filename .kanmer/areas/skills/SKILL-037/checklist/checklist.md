# Checklist — SKILL-037

- [x] [pre-review] Worktree `.worktrees/skill-037` on branch `skill-037-review-remediation-contract` from `origin/main`; ticket taken with that branch/worktree.
- [x] [pre-review] `kanmer-review/SKILL.md`: `board_sha`/`expected_reviewers`/`threads_snapshot` in the frontmatter block; expected-reviewers settle rule (bots never a gate); thread → `F-###` mapping; consolidated vs delta review scope; `review_round`/`remediation_budget`; sanctioned `review → implementing` return with `reason`; "leave the ticket in Review" and "linked PR Review ticket" removed.
- [x] [pre-review] `kanmer-execute/SKILL.md`: re-entry lane on the existing PR (renew claim on resume and before long commands; push to same branch; never a second PR; report gains a remediation-round section); fresh lane records the PR ref in `prs[]`.
- [x] [pre-review] `kanmer-verify/SKILL.md`: `failure_class` field and routing table; PASS / WAIVED_BY_OPERATOR semantics.
- [x] [pre-review] `kanmer-closeout/SKILL.md`: Done shape accepts `PASS` or `WAIVED_BY_OPERATOR`.
- [x] [pre-review] `kanmer-auto/SKILL.md`: transfer expired claims (scratch note, never `force`), live claims stop; renew on resume/long commands; remediation return and `failure_class` routing; subagents read their own background logs.
- [x] [pre-review] `kanmer-tickets/references/tool-reference.md`: attestation optional keys and proof `failure_class` documented; `get_status` row untouched.
- [x] [pre-review] `scripts/verify-skill-prose.mjs` check added (numbered 18; file already had two 17s); negative test case added to its test file.
- [x] [pre-review] `npm run verify:skills` exit 0 (ALL CHECKS PASSED); `npm run verify:agents-block` exit 0 (31/31); `node --test scripts/verify-skill-prose.test.mjs` exit 0; `plugin:check` not run (worktree refusal by design, no bundle input changed) — hosted rail.
- [x] [pre-review] Golden scenarios (a) and (b) walked through in the post-implementation report against the new prose.
- [x] [pre-review] Post-implementation report written; commit e6c9e0ad + PR #290 recorded on the ticket; PR open with `Kanmer: SKILL-037`; ticket moved `implementing → review`. Stop.
- [ ] [post-merge] `kanmer-verify` runs `verify:skills` and `verify:agents-block` at the merge SHA; hosted `verify` covers `plugin:check`.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills. Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.

- 2026-08-27 verify:skills first run: check 18 FAIL (regex did not allow `**never**` bold markers); fixed the regex, rerun PASS. All other checks passed on first run.

## Closeout — SKILL-037

- [x] PR merge verified (`gh pr view --json state,mergedAt`: MERGED 2026-08-27T17:14:47Z, merge 3267c7df)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage (Done since 2026-08-27T17:44:46Z by kanmer-verify)
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/skill-037` (+ verify worktree and stray log)
- [x] `git branch -D skill-037-review-remediation-contract` (squash-merged) + `git push origin --delete`
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
