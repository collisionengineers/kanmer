# CORE-038 files and scope

## Files to change

| File | Change | Risk / verification |
| --- | --- | --- |
| package.json | Point test:scripts at the portable launcher. | A typo could skip the script suite; run the command and shared verify. |
| scripts/test-scripts.mjs | New dependency-free launcher that discovers direct *.test.mjs files and invokes Node's test runner with explicit paths. | Enumeration, ordering, child exit propagation and empty-suite behavior; exercise on Windows and Git Bash. |
| AGENTS.md | Update the command-table description of npm run test:scripts to name the launcher rather than the shell glob. | Keeps contributor/agent convention accurate; no managed block or unrelated prose changes. |
| scripts/check-doc-numbering.mjs | Update the explanatory command reference. | Comment-only consistency. |
| scripts/check-doc-numbering.test.mjs | Update the explanatory command reference. | Comment-only consistency. |
| scripts/verify-release-assets.test.mjs | Update the explanatory command reference. | Comment-only consistency. |

## Ripple effects

- npm test and scripts/verify.mjs consume npm run test:scripts, so the launcher fixes the authoritative rail without changing VERIFY_STEPS.
- CI runs the same package script under Windows Git Bash; explicit paths remove shell-dependent glob behavior.
- The launcher must remain dependency-free and must not enumerate nested scripts/lib tests or unrelated files.
- Existing Node test files and assertions remain untouched; the target is all 80 existing tests passing.

## Deliberately out of scope

- No changes to MCP-041 supervisor tests or production code.
- No changes to CORE-037 Windows path assertions or GUI tests.
- No dependency additions, shell-specific wrapper, coverage-policy change, or test assertion weakening.
- No CI workflow redesign and no changes to other verification commands.

## Context files

| Context | Why it matters |
| --- | --- |
| scripts/verify.mjs | Defines the shared rail and calls npm test; confirms this is a scripts-test invocation fix. |
| .github/workflows/verify.yml | Shows the Windows runner/shell contract that exposed the literal glob. |
| package.json | Source of the failing command and node >=20 compatibility floor. |
| scripts/*.test.mjs | Existing dependency-free Node test suite whose 80-test coverage must be preserved. |
| PR #145 / MCP-041 | Historical failure evidence and unrelated changes that must remain outside this ticket. |
