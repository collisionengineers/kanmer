# Files — GUI-127

## Modify

| Path | Change | Risk / guardrail |
| --- | --- | --- |
| `apps/gui/src/main/kanmerGit.test.ts` | Replace synchronous fixture removal with bounded awaited cleanup and scope the hook timeout to the real-Git fixture lifetime; add assertions that the fixture root is gone. | Must not weaken any Git/branch/worktree assertions, add an unbounded retry, sleep, skip, or global timeout. |

## Inspect only

| Path | Reason |
| --- | --- |
| `apps/gui/src/main/kanmerGit.ts` | Change only if focused evidence demonstrates that production leaves a child process, handle, or worktree behind. Current evidence does not. |
| `apps/gui/vitest.config.ts` and root test scripts | Confirm the file still runs through the canonical GUI and root verification rails; do not exclude or duplicate it. |
| `GUI-085` documents | Preserve the original scope: real integration coverage, local-only Git, no global timeout relaxation. |
| `.github/workflows/pr.yml` | Confirm the PR's Windows authoritative verifier runs the root command; do not add a second speculative job. |

## Ripple effects

- The GUI workspace is invoked by root `npm test`, therefore this one fixture can fail all authoritative verification and release workflows.
- GUI-127 unblocks evidence attempts for CORE-024, CORE-036, and CORE-042; it does not itself prove their independent external conditions.

## Deliberately out of scope

- Production board/worktree behavior, Cloudflare/OpenAI tunnelling, GitHub branch protection, and the historical migration fixture required by CORE-022.
- Removing pre-existing temporary directories not created by this ticket's controlled test runs.
