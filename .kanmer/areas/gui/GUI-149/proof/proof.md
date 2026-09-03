---
kind: proof-record
merged_sha: "c25e459002096cdca2b2ea7c993898755df0b95c"
result: PASS
environment: "detached worktree .worktrees/verify-gui-149-c25e459002096cdca2b2ea7c993898755df0b95c on the Windows 11 workstation, Node 24, npm ci"
verified_at: "2026-09-03T20:00:28Z"
attempts: []
---
# Proof — GUI-149 (command-log)

Verified on merged `main` at `c25e459002096cdca2b2ea7c993898755df0b95c` (PR #313 squash merge) in the disposable detached worktree `.worktrees/verify-gui-149-c25e459002096cdca2b2ea7c993898755df0b95c` (detached, clean, exact SHA; not the board or implementation worktree).

## Deterministic checks

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npm ci` | verify worktree | 0 | dependencies installed |
| `TMP='C:\kt-tmp' TEMP='C:\kt-tmp' npm run verify` | verify worktree | 0 | PASS, 13 steps ending `plugin-sync OK — 41 tools match, bundle bytes match` (`C:\kt-tmp\gui149-verify-merged.log`) |
| Hosted `verify` on the push to `main` at `c25e4590` | GitHub Actions | — | run 33797108286 success (`verify` job success) |

`TMP`/`TEMP` outside the home folder is the MCP-056 workaround (the `~/.kanmer` endpoint registry is taken for a board root by the discovery in this tree); MCP-056 (PR #315) removes the need.

## Acceptance still owed

- Real-host acceptance in a scratch git repo with a board through the **installed** app (Connect ×3 → only `.gitignore` in `git status`; `claude mcp list` Connected; `claude -p` `get_status` → `rootSource: cwd-worktree`; a legacy `.mcp.json` reported `behind`): **INCONCLUSIVE** — no build containing this commit is installed. Owed at the 0.4.1 promotion acceptance (CORE-137), as for GUI-147.

## Result

**PASS** on the deterministic rail at the exact merge SHA (local and hosted). The real-host acceptance is recorded above as INCONCLUSIVE and owed at CORE-137; it does not contradict the deterministic result.
