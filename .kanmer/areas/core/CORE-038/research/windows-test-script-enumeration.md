# CORE-038 research — Windows-safe scripts test enumeration

## Question

Why does the authoritative scripts test command fail on the GitHub Windows runner after the MCP-041/CORE-037 changes, and what is the smallest dependency-free repair that preserves the complete Node test suite?

## Findings

1. **The failure is a quoted literal glob, not a test failure.** PR #145's GitHub Actions run 32542393121 (verify job 96954762665) reached the scripts step after core, GUI and HTTP checks passed. The runner used Git Bash on Windows with Node v20.20.2 and executed node --test with the quoted pattern scripts/*.test.mjs; Node reported Could not find the literal D:/a/kanmer/kanmer/scripts/*.test.mjs path and exited 1. Source: PR #145 verify log, 2026-08-22.
2. **The current root script owns the broken invocation.** package.json defines test:scripts as node --test with the quoted scripts/*.test.mjs pattern. Shell expansion is not portable: Git Bash preserves the pattern, while the local Node v24 environment currently runs the same command and reports 80/80, so the local pass does not prove Node 20 CI behavior. Source: root package.json; local runs on this checkout.
3. **The suite is direct-file and dependency-free.** The scripts root currently contains nine *.test.mjs files and the existing command reports 80 tests across nine suites. The repository convention is built-in node:test; no glob package or other runtime dependency is approved. Source: scripts inventory, package manifest, and npm run test:scripts.
4. **The rail must preserve Node's test-runner semantics and exit status.** A Node launcher can enumerate direct files with node:fs, sort them deterministically, invoke process.execPath --test with explicit paths and inherited stdio, and propagate spawn errors, signals, and nonzero status. This avoids shell glob rules on Windows, Git Bash, PowerShell, and POSIX shells without changing test files or assertions.
5. **Command documentation must follow the convention change.** AGENTS.md and several script comments describe the old node --test scripts/*.test.mjs command. The fix must update those references in the same PR, while leaving the test suite and unrelated verification commands untouched.

## Implications

- Add one dependency-free launcher under scripts/ and make npm run test:scripts call it directly.
- Enumerate only direct regular files matching *.test.mjs, sorted by filename; fail clearly if none are found.
- Preserve exit code and signal/error behavior from the child Node test runner.
- Update only command-convention prose/comments required by the new launcher.
- Verify the normal Windows npm command, a Git Bash invocation, and the full shared npm run verify path; retain the 80/80 result as the compatibility target.
