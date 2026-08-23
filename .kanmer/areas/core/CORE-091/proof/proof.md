---
kind: proof-record
ticket: "CORE-091"
merged_sha: "30c99ffa658105c080fc4833bb6986c6866e9215"
verified_at: "2026-08-23T01:12:00Z"
result: PASS
environment: "detached origin/main merge 30c99ffa; clean Windows checkout; npm ci lockfile install"
attempts:
  - attempted_at: "2026-08-23T01:08:24Z"
    command: "GitHub hosted verify and kanmer-gate run 32609479149"
    exit_code: 0
    result: PASS
    summary: "Hosted verify and kanmer-gate both passed on the corrected clean-npm-ci artifact head ddf05569."
  - attempted_at: "2026-08-23T01:11:00Z"
    command: "git worktree add --detach .worktrees/core-091-verify 30c99ffa && npm ci --ignore-scripts --no-audit --no-fund"
    exit_code: 0
    result: PASS
    summary: "Exact merged SHA detached checkout and clean lockfile dependency install completed."
  - attempted_at: "2026-08-23T01:12:00Z"
    command: "npm run build"
    exit_code: 0
    result: PASS
    summary: "Core and MCP server ESM/standalone builds passed."
  - attempted_at: "2026-08-23T01:12:00Z"
    command: "npm run plugin:check"
    exit_code: 0
    result: PASS
    summary: "37 tools, 12 skill frontmatters, manifests, isolated handshake, and committed/fresh bundle bytes passed."
  - attempted_at: "2026-08-23T01:12:00Z"
    command: "npm run mcpb:check"
    exit_code: 0
    result: PASS
    summary: "MCPB validation passed with 3 files / 1,671,293 bytes; staged, unpacked, fresh standalone, and committed plugin server hash f52d9c5b3817b12432e211438913146908c32874bf74ac261839a21ee31ea58c."
  - attempted_at: "2026-08-23T01:12:00Z"
    command: "npm run test:scripts && git diff --check"
    exit_code: 0
    result: PASS
    summary: "89/89 script tests passed and diff-check passed."
  - attempted_at: "2026-08-23T01:00:00Z"
    command: "hosted verify on first PR artifact ed7d8a98"
    exit_code: 1
    result: FAIL
    summary: "Clean CI npm ci produced f52d9c5b while the plain-install artifact was 56f0644e; mcpb parity correctly failed. Correction ddf05569 regenerated from npm ci and passed hosted verification."
---
CORE-091 merged-main verification PASS. The corrected generated artifact is byte-identical to a clean lockfile build and MCPB staging/unpack, with no source or assertion changes. The initial reproducibility failure is retained above and fixed in the merged lineage.
