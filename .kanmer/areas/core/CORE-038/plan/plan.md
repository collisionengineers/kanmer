# CORE-038 implementation plan

## Governing docs

The ticket has docs_todo: true and no governing FRD/ADR reference; this is a bounded CI portability repair governed by the repository's AGENTS.md verification rules and the existing scripts/verify.mjs rail. No product or architecture document is needed for this dependency-free runner change.

## Approach

Replace shell-dependent glob passing with a small Node launcher that discovers the intended direct test files and starts Node's built-in test runner with explicit paths. This keeps the existing test files, assertions, Node >=20 floor, and VERIFY_STEPS unchanged.

## Ordered steps

1. Add scripts/test-scripts.mjs using only built-in node:child_process, node:fs, node:path, and node:url APIs.
2. Enumerate regular files directly under the launcher directory matching *.test.mjs, sort by basename, and fail with a clear message when no files exist.
3. Invoke process.execPath with --test and the explicit file paths using inherited stdio; propagate child status, signal termination, and spawn errors.
4. Change package.json and required command-reference comments/AGENTS prose to call/document the launcher. Do not modify assertions or unrelated rail commands.
5. Run focused launcher checks: Windows npm invocation, direct Git Bash-compatible invocation, and the 80-test suite; then run package/shared type and verification rails proportionate to this root command change.
6. Write the post-implementation report, record commit/PR traceability, and stop at Review for independent review.

## Risks and mitigations

- **Empty or unexpected enumeration:** filter regular files and fail nonzero with the directory/pattern.
- **Ordering drift:** sort basenames before invoking Node.
- **Child failures hidden:** propagate status and signal/error paths instead of swallowing them.
- **Node compatibility:** use APIs available in Node >=20; no newer glob or package APIs.
- **Scope drift:** leave MCP-041/CORE-037/GUI code and assertions unchanged.

## Proof plan

On the implementation worktree, record the pre-fix Git Bash literal-glob failure and post-fix explicit launcher success with 80/80. Run npm run build, npm run typecheck, npm run test:scripts, and the shared npm run verify or its exact failing sub-step; preserve first failures and exits. Review must confirm the diff changes only the listed rail/docs files.
