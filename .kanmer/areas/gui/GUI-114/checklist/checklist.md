# GUI-114 checklist

## Packet and design

- [x] Re-read GUI-114, GUI-113 merge packet, HZN-007 context, FRD-012,
  ADR-0016, finding 3836808787 and live gates.
- [x] Record the argv boundary, provider ownership, and no-native-plugin scope.
- [x] Write research, files, plan and resolved questions.

## Shell-safe registration

- [x] Add a provider-owned argv builder for CLI registrations.
- [x] Execute Claude registration through `execFile`/argv in production.
- [x] Keep the copy-paste command safe for shell metacharacters.
- [x] Preserve Codex/OpenCode file registrations and GUI-113 native plugin
  staging unchanged.

## Tests and evidence

- [x] Add exact Claude argv and hostile `team&whoami` regression coverage.
- [x] Add Connect production seam proving no shell execution and one argv value.
- [x] Run focused and relevant GUI tests with exact exits.
- [x] Run workspace typecheck/build, manual/docs/agents/skills/scripts/diff rails;
  preserve failures and unavailable plugin/host evidence.
- [x] Mark hosted protection and real Claude host proof INCONCLUSIVE.

## Handoff

- [x] Write post-implementation report.
- [x] Commit/push, record exact PR/commit, and move one boundary to Review.
- [x] Append/read back HZN-007 current/run and ticket/gates.

## Stop condition

Stop at Review for independent review; do not self-review or merge.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts
(`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is
visible on the board.

---

## Closeout — GUI-114

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/<id>`
- [x] `git branch -d <branch>` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
