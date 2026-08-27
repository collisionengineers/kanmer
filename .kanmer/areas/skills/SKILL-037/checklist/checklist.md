# Checklist — SKILL-037

- [ ] [pre-review] Worktree `.worktrees/skill-037` on branch `skill-037-review-remediation-contract` from `origin/main`; ticket taken with that branch/worktree.
- [ ] [pre-review] `kanmer-review/SKILL.md`: `board_sha`/`expected_reviewers`/`threads_snapshot` in the frontmatter block; expected-reviewers settle rule (bots never a gate); thread → `F-###` mapping; consolidated vs delta review scope; `review_round`/`remediation_budget`; sanctioned `review → implementing` return with `reason`; "leave the ticket in Review" and "linked PR Review ticket" removed.
- [ ] [pre-review] `kanmer-execute/SKILL.md`: re-entry lane on the existing PR (renew claim on resume and before long commands; push to same branch; never a second PR; report gains a remediation-round section); fresh lane records the PR ref in `prs[]`.
- [ ] [pre-review] `kanmer-verify/SKILL.md`: `failure_class` field and routing table; PASS / WAIVED_BY_OPERATOR semantics.
- [ ] [pre-review] `kanmer-closeout/SKILL.md`: Done shape accepts `PASS` or `WAIVED_BY_OPERATOR`.
- [ ] [pre-review] `kanmer-auto/SKILL.md`: transfer expired claims (scratch note, never `force`), live claims stop; renew on resume/long commands; remediation return and `failure_class` routing; subagents read their own background logs.
- [ ] [pre-review] `kanmer-tickets/references/tool-reference.md`: attestation optional keys and proof `failure_class` documented; `get_status` row untouched.
- [ ] [pre-review] `scripts/verify-skill-prose.mjs` check 17 added; its test file inspected/updated.
- [ ] [pre-review] `npm run verify:skills` exit 0 (ALL CHECKS PASSED); `npm run verify:agents-block` exit 0; `node --test scripts/verify-skill-prose.test.mjs` exit 0; `plugin:check` status recorded.
- [ ] [pre-review] Golden scenarios (a) and (b) walked through in the post-implementation report against the new prose.
- [ ] [pre-review] Post-implementation report written; commit + PR recorded on the ticket; PR open with `Kanmer: SKILL-037`; ticket moved `implementing → review`. Stop.
- [ ] [post-merge] `kanmer-verify` runs `verify:skills` and `verify:agents-block` at the merge SHA; hosted `verify` covers `plugin:check`.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills. Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.
