---
kind: proof-record
merged_sha: "db5da2555b40a1264e3ca213928f5549af744981"
environment: "detached worktree .worktrees/verify-mcp-056-db5da2555b40a1264e3ca213928f5549af744981 on the Windows 11 workstation, Node 24, npm ci, default TMP under the home folder with ~/.kanmer/endpoints.json present"
verified_at: "2026-09-03T23:54:34Z"
result: PASS
attempts: []
---
# Proof — MCP-056 (command-log)

Verified on merged `main` at `db5da2555b40a1264e3ca213928f5549af744981` (PR #315 squash merge) in a disposable detached worktree (detached, clean, exact SHA; not the board or an implementation worktree).

## Deterministic checks

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npm ci` | verify worktree | 0 | dependencies installed |
| `npm run verify` — **default `TMP`/`TEMP`** (under the home folder) while `~/.kanmer/endpoints.json` exists on this machine | verify worktree | 0 | PASS, 13 steps ending `plugin-sync OK — 41 tools match, bundle bytes match` (`C:\kt-tmp\mcp056-verify-merged.log`) |
| Hosted `verify` on the push to `main` at `db5da255` | GitHub Actions | — | success (run 33817942066) |

## The ticket's acceptance

The rail above is the acceptance named in the plan: before this change, `http.test.mjs` "project resolution fails before binding" hung to its 30 s timeout under exactly this environment (the home folder's registry-only `.kanmer` was taken for a board root), and `npm run verify` needed `TMP` pointed outside the home folder. In this rail `http.test.mjs` → `✔ project resolution fails before binding and leaves no listener (1163 ms)` from a cwd beneath a registry-only decoy, with `TMP` at its default.

## Result

**PASS**: the rail is green at the exact merge SHA with the default temp folder while the home-directory endpoint registry exists, and the hosted rail agrees.
