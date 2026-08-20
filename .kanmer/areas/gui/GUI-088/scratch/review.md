# Independent review — GUI-088 / PR #74

## Reviewer and scope

Independent review of PR #74 at `d8150b7c67cf3499df8cf94d533402d43c88bd5f`. I am not the author. This review was requested to record a verdict only; it does not merge the PR or move the ticket.

## Evidence read

- Ticket, links, HZN-005 context (no `context.md`), and every discovered ticket document: `research`, `files`, `plan`, `checklist`, `open-questions`, `post-implementation-report`, and nested `scratch/notes.md`.
- Governing docs: FRD-012 R3/R4 and ADR-0009.
- PR #74 metadata, full two-file diff, status, and GitHub comments/reviews (none).

## Changes reviewed

- `apps/gui/src/main/connect.ts`: `ensureAgentsBlock(root)` now runs before the install-kind branch. Marketplace paths consequently cannot bypass FRD-012 R3; their result notes begin with `AGENTS.md block ensured`. The marketplace command order, stop-on-first-failure path, and exact failure propagation are unchanged. Copy-skills behavior remains the same except that its existing block write is no longer duplicated below the branch.
- `apps/gui/src/main/connect.test.ts`: the synthetic marketplace harness proves first-connect block creation, success output, byte-identical reconnect, and block retention after marketplace disconnect.

## Governing-doc and report check

PASS — FRD-012 R3 requires the managed block for every provider, which is exactly the moved write. FRD-012 R4 says not to remove that block without asking; the unchanged marketplace-disconnect behavior is explicitly asserted. ADR-0009’s universal-orientation hierarchy is preserved independently of optional marketplace skill delivery.

PASS — the post-implementation report accounts for both changed files and accurately states the retained risk: a failing marketplace command can follow the independently completed block write, but Connect still reports `ok: false` and the exact failed command/output. No unplanned production change or governing-doc modification appears in the diff.

## Verification rerun

- `npm test -w @kanmer/gui -- connect.test.ts` in the PR worktree — PASS, 22/22 tests.
- `npm run typecheck -w @kanmer/gui` in the PR worktree — PASS.
- `npm run verify:agents-block` in the PR worktree — PASS, 28/28 checks.
- `git diff --check origin/main...HEAD` — PASS.
- PR is open, mergeable, non-draft; no GitHub review comments or checks were reported.

## Comments and disposition

- Blocking: none.
- Non-blocking: none.
- No incoming review comments required a disposition.

## Verdict

**PASS.** The narrow implementation matches the plan, report, FRD-012, and ADR-0009, with focused regression coverage and clean verification. Per the request, PR #74 is left unmerged and GUI-088 remains in Review.
