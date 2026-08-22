# CORE-038 checklist

## Implementation

- [ ] Add a dependency-free Node launcher for direct scripts/*.test.mjs enumeration.
- [ ] Sort discovered test files deterministically and fail clearly when none exist.
- [ ] Invoke Node's built-in test runner with explicit paths and inherited stdio.
- [ ] Propagate child nonzero status, signals, and spawn errors without suppression.
- [ ] Point package.json test:scripts at the launcher.
- [ ] Update AGENTS command documentation and only the stale script command comments.

## Verification

- [ ] Reproduce the old quoted literal-glob failure under the Git Bash-compatible invocation and preserve its exit 1 evidence.
- [ ] Run the portable launcher through npm and confirm all existing script tests pass (80/80).
- [ ] Run focused type/build/diff checks and the shared verification rail, recording exact exits and unrelated first failures.
- [ ] Write the post-implementation report with scope, governing-doc rationale, risks, and merged-main verification commands.
- [ ] Record commit and PR traceability, then move Implementing→Review only after gates pass.

## Progress notes

- 2026-08-22: PR #145 verify log reproduced the Windows Node 20 literal-glob failure after core/GUI/HTTP rails; scope is limited to portable test-file enumeration.
