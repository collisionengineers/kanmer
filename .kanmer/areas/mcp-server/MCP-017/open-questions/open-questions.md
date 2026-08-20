# Open questions — MCP-017

## Resolved decisions

- **Which implementation file is canonical?** Extend the existing worktree-guard implementation discovered in `scripts/` (including an existing `scripts/lib/` helper if present). Do not create a second policy module merely to match a guessed path.
- **What test runner should be used?** The repository's existing `scripts/` test runner. No new framework or isolated uncalled script.
- **Should tests invoke the real board worktree?** No. Use pure vectors and a disposable Git repository/worktree named `kanmer`.
- **What must be proven beyond an error message?** The protected action/build marker is not reached and no output is written on refusal.
- **How are paths compared?** Canonical equality/containment by path segments, with Windows case-insensitive handling and POSIX case-sensitive handling; never substring matching.
- **Should nested paths inside the board worktree refuse?** Yes.
- **Should `kanmer-copy` or similarly prefixed paths refuse?** No, unless they genuinely resolve inside the configured board worktree.
- **Can Git/process discovery live in core?** No. Keep core pure; script/MCP adapters may inspect Git.
- **Should discovery failure allow a destructive command?** No. Fail safely with the existing diagnostic/exit contract.
- **Should this ticket implement CORE-034 health/status features?** No. Test/alignment only.
- **May the global test runner gain sleeps or retries?** No.

No unresolved implementation questions remain.
