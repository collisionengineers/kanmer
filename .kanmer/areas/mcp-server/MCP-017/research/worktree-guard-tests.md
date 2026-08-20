# Research — MCP-017 worktree-guard test rail

## Purpose

The repository already relies on a worktree guard to prevent build/release or mutation commands from running in the Kanmer board worktree. That guard is a safety rail: a false negative can corrupt or switch the branch serving the live board, while a false positive can block legitimate ticket/main-checkout work. It therefore needs direct, deterministic tests rather than incidental coverage through larger scripts.

## Test architecture

Split the guard into two layers if it is not already structured this way:

1. **Pure classification** accepts resolved paths/branch facts and returns a typed allow/refuse decision with reason. This receives exhaustive unit tests and performs no Git/process/filesystem work.
2. **Thin environment adapter** discovers cwd/repo/common-dir/worktree/branch using existing helpers, invokes the classifier, prints the existing message, and exits with the existing code. Cover it with a small disposable-repository integration test only where needed.

Do not introduce a second worktree policy. CORE-034's core path guard and the script/MCP guard must agree on the board-worktree identities, but their implementation boundaries remain as specified: core cannot spawn Git; script/MCP code may inspect Git.

## Required cases

The classifier must distinguish at least:

- normal repository main checkout;
- ordinary ticket worktree under `.worktrees/<ticket-id>`;
- canonical board worktree `.worktrees/kanmer`;
- board root supplied as an absolute path;
- relative path resolving to the board worktree;
- trailing separators;
- mixed `/` and `\` separators;
- Windows drive-letter case and path case behavior;
- path sharing a prefix but not the same segment (for example `kanmer-copy` must not equal `kanmer`);
- nested cwd inside the board worktree;
- missing/non-Git directory and Git discovery failure;
- environment/config override for board branch/path, if the production guard supports one.

Compare canonical path segments, not substring matches. On Windows, normalize drive letter/separators and use case-insensitive equality consistent with the runtime. On POSIX, preserve case sensitivity. Avoid `realpath` unless production already uses it and tests cover absent paths/symlinks.

## Safety behavior

- Refusal must occur before the guarded command writes or builds generated artifacts.
- Preserve the current exit code and user-facing repair text unless the governing FRD explicitly requires a change.
- A discovery error should fail safely for destructive/release operations; it must not silently assume a healthy checkout.
- Tests must never point the guard at the real `.worktrees/kanmer` directory. Use pure inputs or a disposable repository with a worktree named `kanmer`.

## Runner integration

Use the existing `scripts/` test runner and root script introduced for script tests. Add the new file to its canonical discovery pattern. Do not create an isolated command that `npm test`/`npm run verify` never executes.

Tests should use Node's built-in assertion/test facilities or the runner already selected by the repo; add no test framework dependency. Keep fixtures local, non-networked, and cleaned in `finally`/test teardown.

## Relationship to CORE-034

CORE-034 adds a pure store-level guard for `takeTicket` and board-worktree health. MCP-017 should:

- test the existing script/MCP preflight guard independently;
- reuse shared pure path normalization only if the repository already exposes a browser/Node-safe helper without violating package boundaries;
- otherwise duplicate the tiny environment-specific Git inspection deliberately and add cross-contract fixture vectors so the two guards cannot drift semantically.

It must not absorb CORE-034's `get_status.boardWorktree` feature or change `takeTicket`.

## Evidence

A satisfactory proof includes:

- unit test output covering every path vector;
- disposable Git integration showing board worktree refusal and ticket worktree acceptance;
- root script-test command, `npm test`, and `npm run verify` green;
- an assertion that the protected action callback/marker file is never reached on refusal;
- no files changed in the real board worktree.

## Non-goals

- No worktree creation UI.
- No lease/takeover mechanism.
- No change to branch naming policy.
- No test against the production board worktree.
- No broad path-utility package solely for this test.
