---
kind: proof-record
merged_sha: "77e21f1f7482b4978f74d8aaa7013512268a016b"
environment: "detached .worktrees/verify-core-108-77e21f1f7482b4978f74d8aaa7013512268a016b / Windows / Node v24.15.0"
verified_at: "2026-08-25T12:10:30.4508802Z"
result: PASS
attempts:
  - attempted_at: "2026-08-25T12:10:30.4508802Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-108-77e21f1f7482b4978f74d8aaa7013512268a016b"
    exit_code: 0
    result: PASS
    summary: "Installed the lockfile-resolved dependency tree; npm reported the unchanged audit baseline of 13 vulnerabilities."
  - attempted_at: "2026-08-25T12:10:30.4508802Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-108-77e21f1f7482b4978f74d8aaa7013512268a016b"
    exit_code: 0
    result: PASS
    summary: "Authoritative verification rail passed: build; 310 core tests; 477 GUI tests; 102 HTTP/remote tests; 116 script tests including the release-ID regression; workspace typecheck; docs; MCP and discovery smoke; protocol matrix; skills; AGENTS block; and plugin sync."
---

# Verification proof

GitHub identifies PR #273 as merged at the exact commit above. The disposable worktree was detached, clean before verification, and matched that full SHA. The authoritative repository verification command exited 0 without assertion changes or retries.

The merged production release flow now retrieves a draft release by its authenticated numeric database ID before publication while preserving the public tag lookup after publication. The route-specific 404 regression test proves ID lookup failures no longer masquerade as missing tags.
