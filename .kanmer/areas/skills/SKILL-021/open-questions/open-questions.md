# Open questions — SKILL-021

All workflow decisions are resolved.

- [x] **What is execute’s first ticket-data call?** — `get_execution_packet`; a refusal stops before take/Git/write activity.
- [x] **How is `expected_project` compatibility handled?** — Read `get_status`; send the packet fingerprint only when `compat.expectedProject` advertises support, otherwise omit it for older servers.
- [x] **Who may use `.worktrees/kanmer`?** — Nobody implementing/reviewing/verifying a ticket. It remains the board worktree.
- [x] **When does execute stop?** — At the packet’s stop condition after opening the PR/moving to Review as applicable; it never merges or starts another ticket.
- [x] **How is review written?** — Whole-file `set_ticket_doc(doc:"scratch/review")` with `expected_version`; never `append_scratch` for the attestation.
- [x] **Which SHA is reviewed?** — The full current `headRefOid` from `gh pr view` immediately before review, rechecked immediately before merge.
- [x] **What happens if the PR head changes?** — The attestation is stale; rerun review and replace the record.
- [x] **How are GitHub findings handled?** — Gather reviews/comments and actual thread-resolution state; every finding receives a disposition. Open blocker/major findings prevent pass/merge.
- [x] **May review merge?** — Only with user/standing authorization, current-head pass attestation, all findings dispositioned, and required checks green. Self-review is marked `independent:false`.
- [x] **Which commit is verified?** — The exact `mergeCommit` returned for the merged PR, in a detached temporary worktree.
- [x] **May verification pull/reset/update main?** — No. It fetches objects and creates a detached worktree; no checkout’s `main` branch is changed.
- [x] **What if the PR is unmerged or has no merge commit?** — Stop; verification is running too early.
- [x] **How is proof written?** — Whole-file versioned proof record, preserving all attempts. Only top-level `PASS` permits Done.
- [x] **Are the old review assets deleted now?** — No. SKILL-015 owns deletion; this ticket stops referencing them for the attestation as needed.
- [x] **Does this ticket rebuild the MCP plugin?** — No. Skill-source/verifier only.

## Parked (explicitly deferred)

No questions are parked.
