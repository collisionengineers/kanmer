---
kind: proof-record
merged_sha: "ea8a6408ec26d99ae63c9f46e3cd811366881b8c"
environment: "Detached verification worktree .worktrees/verify-doc-027-ea8a6408ec26d99ae63c9f46e3cd811366881b8c; Windows; Node v24.15.0; npm ci --ignore-scripts"
verified_at: "2026-08-26T21:39:25.9484511Z"
result: PASS
attempts:
  - attempted_at: "2026-08-26T21:31:00Z"
    command: "npm ci --ignore-scripts"
    cwd: ".worktrees/verify-doc-027-ea8a6408ec26d99ae63c9f46e3cd811366881b8c"
    exit_code: 0
    result: PASS
    summary: "Installed 647 lockfile-pinned packages in the isolated verifier. npm audit reported 13 pre-existing dependency warnings; no dependencies changed."
  - attempted_at: "2026-08-26T21:32:00Z"
    command: "npm run verify:docs"
    cwd: ".worktrees/verify-doc-027-ea8a6408ec26d99ae63c9f46e3cd811366881b8c"
    exit_code: 0
    result: PASS
    summary: "Document mirror, numbered documents, links, fences, canary and provider boundaries passed."
  - attempted_at: "2026-08-26T21:32:58Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-doc-027-ea8a6408ec26d99ae63c9f46e3cd811366881b8c"
    exit_code: 0
    result: PASS
    summary: "Built core and MCP server; passed 323 core tests, GUI tests, HTTP/script/smoke checks, typechecks, skill prose validation, AGENTS validation, and plugin consistency."
---

# DOC-027 merged verification

PR #285 merged at `ea8a6408ec26d99ae63c9f46e3cd811366881b8c`. The verifier was a clean, detached worktree at that exact SHA; its pre- and post-rail Git state was clean and branchless. All required DOC-027 verification commands passed with exit code 0.

The earlier implementation-worktree full verify was recorded as a failed environmental attempt because it inherited incompatible parent-worktree dependencies from the dirty source checkout. This exact-SHA verifier used its own lockfile-pinned dependencies and is the authoritative PASS evidence.

Merge trace: [PR #285](https://github.com/collisionengineers/kanmer/pull/285) merged at `2026-08-26T21:30:16Z` with merge SHA `ea8a6408ec26d99ae63c9f46e3cd811366881b8c`.
