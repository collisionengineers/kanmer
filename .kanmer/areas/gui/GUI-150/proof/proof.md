---
kind: proof-record
merged_sha: "59ded74b823d18c19d51241c4bc8434fb9c6ac02"
environment: "detached worktree .worktrees/verify-gui-150-59ded74b823d18c19d51241c4bc8434fb9c6ac02 on the Windows 11 workstation, Node 24, npm ci, default TMP"
verified_at: "2026-09-04T01:04:59Z"
result: PASS
attempts: []
---
# Proof — GUI-150 (command-log)

Verified on merged `main` at `59ded74b823d18c19d51241c4bc8434fb9c6ac02` (PR #317 squash merge, reviewer attestation `678ab7bcb7774e8e`) in a disposable detached worktree (detached, clean, exact SHA; not the board or an implementation worktree).

## Deterministic checks

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npm ci` | verify worktree | 0 | dependencies installed (`C:\kt-tmp\gui150\npmci-merged.log`) |
| `npm run verify` (default `TMP`) | verify worktree | 0 | PASS, 13 steps ending `plugin-sync OK — 41 tools match, bundle bytes match` (`C:\kt-tmp\gui150\verify-merged.log`); includes `apps/gui` `connect.test.ts` (JSON and text parse cases, Connect failure on `errors[]` and `enabled:false`, `skillsStatus.hostError`) through the GUI build |
| Hosted `verify` on the push to `main` at `59ded74b` (run 33823246243) | GitHub Actions | — | success (`verify: success`, `regate: success`) |

## Acceptance census (from the plan)

| Check | Evidence |
|---|---|
| Claude's check runs `claude plugin list --json`; parser returns `{version, scope, enabled, errors}` for the user-scope `kanmer@kanmer` entry, text transcript as fallback | `connect.test.ts` parse cases (healthy, errors, disabled, absent, other plugin, two scopes, missing `enabled`; text `Status:`/`Error:`), 64/64 in the reviewer's independent run and in the rail |
| Connect fails (`ok:false`, pasteable repair, host error quoted) on non-empty `errors` or `enabled:false` even when the version matches | `connect.test.ts` Connect cases; reviewer confirmed the failure text carries the host's words and the uninstall+install repair |
| `SkillsStatus.hostError` set only for the marketplace host; Settings shows the load error | `skillsStatus` cases (failed, disabled, healthy); reviewer confirmed no "Update skills" leak to project-scope hosts and the version hint renders only when versions differ |
| No test runs a real `claude` command | every new case stubs `hostVersionRunner`, `claudePluginStateDir`, `LOCALAPPDATA` (reviewer check, gotcha 24) |
| `plugins/**`, `packages/core/**` untouched; bundle unchanged | `plugin-sync OK` at the merge SHA |

## Not verified here

Real-host acceptance (a deliberately broken marketplace makes Connect fail with the repair; Settings shows the error; the repair clears it) needs an installed build carrying this commit and is owed to the 0.4.1 promotion acceptance (CORE-137 step 10f).

## Result

**PASS** on the deterministic rail at the exact merge SHA (local with default TMP, and hosted); the acceptance census above is covered by the suites the rail runs.
