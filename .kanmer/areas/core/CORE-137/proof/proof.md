---
kind: proof-record
merged_sha: "4e94ad806d5f74dbfdc9b0789190624addf4cbdd"
environment: "Windows 11 / Node v24.15.0 / detached exact-merge worktree / release clone C:\\Users\\Alex\\Documents\\GitHub\\kanmer-release-0.4.1 / installed launcher %LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd / copied board C:\\kt-tmp\\core137\\board-copy-20260904T1101Z"
verified_at: "2026-09-04T11:43:57.180Z"
result: PASS
attempts:
  - attempted_at: "2026-09-04T09:59:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-137-4e94ad806d5f74dbfdc9b0789190624addf4cbdd"
    exit_code: 0
    result: PASS
    summary: "Detached worktree resolved exactly to merge SHA 4e94ad806d5f74dbfdc9b0789190624addf4cbdd and installed the locked dependency graph."
  - attempted_at: "2026-09-04T10:00:00Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-137-4e94ad806d5f74dbfdc9b0789190624addf4cbdd"
    exit_code: 0
    result: PASS
    summary: "Authoritative exact-merge rail passed: core 876, GUI 553, MCP 242 pass plus one Windows-not-applicable skip, scripts 180, smoke 384, protocol 54, discovery 15, golden 20, skills, AGENTS block and plugin consistency."
  - attempted_at: "2026-09-04T11:01:00Z"
    command: "npm run release -- 0.4.1 --publish --release-commit 4e94ad806d5f74dbfdc9b0789190624addf4cbdd"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 0
    result: PASS
    summary: "Protected publisher rail passed; tag v0.4.1 pushed; draft received four byte-verified assets and was published latest."
  - attempted_at: "2026-09-04T11:02:00Z"
    command: "node scripts/verify-release-assets.mjs 0.4.1 --remote-coherent"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 0
    result: PASS
    summary: "Public manifest and the four release assets are coherent and byte-identical."
  - attempted_at: "2026-09-04T11:07:00Z"
    command: "Kanmer-Setup-0.4.1.exe /S; launcher --probe; optional app.asar.unpacked/package.json inspection"
    cwd: "C:/Users/Alex/Documents/KanmerBackups/installers/0.4.1"
    exit_code: 1
    result: FAIL
    summary: "Installer and launcher probe both exited 0 and activated 0.4.1-48196; the wrapper's final optional Get-Content targeted a nonexistent unpacked package.json and made only the wrapper exit 1. Retained without misclassifying the successful install."
  - attempted_at: "2026-09-04T11:08:00Z"
    command: "KANMER_SMOKE=1 KANMER_OPEN=<copied-board> Kanmer.exe; KANMER_ROOT=<copy> KANMER_SERVER=<candidate> npm run smoke:headless"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 0
    result: PASS
    summary: "Packaged renderer reached ready-to-show and captured a 1264x755 PNG; standalone/headless smoke exited 0; installed launcher served the copied logical project at format 3."
  - attempted_at: "2026-09-04T11:12:00Z"
    command: "temporary Electron ESM Connect harness"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: null
    result: FAIL
    summary: "Harness module load failed with Dynamic require of fs is not supported before connectAgent loaded. Exact harness process tree was terminated; no product, registration, plugin or board state changed."
  - attempted_at: "2026-09-04T11:16:00Z"
    command: "CommonJS Electron harness: connectAgent('claude', source, live-board)"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 0
    result: PASS
    summary: "Production Connect returned ok:true, wrote the portable installer-owned project registration, installed plugin 0.4.1 and reported hostError null."
  - attempted_at: "2026-09-04T11:17:00Z"
    command: "claude -p --output-format json --dangerously-skip-permissions <single get_status prompt>"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Fresh Claude session called mcp__kanmer__get_status exactly once without a shell or shim and returned the complete nested payload from packaged server 0.4.1."
  - attempted_at: "2026-09-04T11:18:00Z"
    command: "gh run view 33865938392 --repo collisionengineers/kanmer"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Tag release-verify job completed success at exact head SHA 4e94ad806d5f74dbfdc9b0789190624addf4cbdd; authoritative rail, updater package and public assets all passed."
  - attempted_at: "2026-09-04T11:21:00Z"
    command: "point Claude marketplace at removed directory; claude plugin list --json; skillsStatus"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Fault injection reproduced v0.4.1 enabled plus Marketplace kanmer failed to load: cache-miss; GUI status marked updateAvailable true and surfaced the same host error."
  - attempted_at: "2026-09-04T11:22:00Z"
    command: "connectAgent('claude') repair pass 1"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 1
    result: FAIL
    summary: "Connect returned ok:false after Claude 2.1.260 removed the plugin as a side effect of marketplace removal, leaving its next explicit uninstall redundant. The failure was shown rather than rounded to connected."
  - attempted_at: "2026-09-04T11:23:00Z"
    command: "connectAgent('claude') repair pass 2; claude plugin list --json"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 0
    result: PASS
    summary: "Second repair installed enabled Kanmer 0.4.1 from the stable staged marketplace and cleared hostError."
  - attempted_at: "2026-09-04T11:24:00Z"
    command: "Connect Claude, OpenCode and Codex three times each in C:/kt-tmp/core137/connect-scratch"
    cwd: "C:/kt-tmp/core137/connect-scratch"
    exit_code: 0
    result: PASS
    summary: "All nine passes returned ok:true; Git showed only .gitignore; every registration and project skills path was ignored, portable, branch-bound and free of root arguments."
  - attempted_at: "2026-09-04T11:27:00Z"
    command: "golden-promotion.mjs with launcher arguments forwarded to installer-owned shim"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 1
    result: FAIL
    summary: "Launcher refuses provider arguments by contract; the harness timed out waiting for initialize. Transcript retained at golden-promotion-0.4.1.json."
  - attempted_at: "2026-09-04T11:28:00Z"
    command: "golden-promotion.mjs with direct shim plus root arguments"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 1
    result: FAIL
    summary: "Second invalid launcher form likewise timed out; transcript retained at golden-promotion-0.4.1-retry.json."
  - attempted_at: "2026-09-04T11:29:00Z"
    command: "golden-promotion.mjs with KANMER_ROOT-bound installed launcher"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 1
    result: INCONCLUSIVE
    summary: "Automated workflow-acceptance passed; overall script correctly stayed INCOMPLETE because its other nine steps are operator-owned and had not yet been appended."
  - attempted_at: "2026-09-04T11:30:00Z"
    command: "installed launcher full copied-board workflow acceptance"
    cwd: "C:/kt-tmp/core137/board-copy-20260904T1101Z"
    exit_code: 0
    result: PASS
    summary: "get_status, list_projects, create, lease lifecycle with stale CAS refusal, review-return refusal and operator override, reconcile dry-run and copied release-channel lifecycle all passed without touching the live board."
  - attempted_at: "2026-09-04T11:31:00Z"
    command: "kanmer-setup reconciliation; Pegasus documentation lane; npm run verify:agents-block"
    cwd: "C:/Users/Alex/Documents/GitHub"
    exit_code: 0
    result: PASS
    summary: "Kanmer and Pegasus boards already format 3 and both report repo.upToDate true; Pegasus Markdown placement, 125-file link check and UI catalogue passed; AGENTS block passed 31/31."
  - attempted_at: "2026-09-04T11:34:00Z"
    command: "Kanmer-Setup-0.4.0.exe /S; launcher get_status live; Kanmer-Setup-0.4.1.exe /S; launcher get_status live"
    cwd: "C:/Users/Alex/Documents/KanmerBackups/installers"
    exit_code: 0
    result: PASS
    summary: "0.4.0 generation 0.4.0-14236 served the unchanged live fingerprint and 383 tickets; 0.4.1 generation 0.4.1-7432 restored the same fingerprint and count with repo.upToDate true."
  - attempted_at: "2026-09-04T11:38:00Z"
    command: "node scripts/core137-complete-promotion.mjs <three transcripts> <complete transcript>"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer-release-0.4.1"
    exit_code: 0
    result: PASS
    summary: "C:/kt-tmp/core137/golden-promotion-0.4.1-complete.json evaluates PASS with no problems and 22 retained attempts."
  - attempted_at: "2026-09-04T11:39:00Z"
    command: "release_channel record verification passed and asset digests; release_channel complete; observe terminal state"
    cwd: "live Kanmer board"
    exit_code: 0
    result: PASS
    summary: "Attempt main@1 is terminal released at v0.4.1 with the four published SHA-256 digests; the release-channel lease is clear."
  - attempted_at: "2026-09-04T11:43:30Z"
    command: "stop four retained kanmer-mcp.exe session processes; start a fresh installed launcher get_status"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "All four session-scoped processes launched through the prior current generation stopped without force; a fresh packaged 0.4.1 process served the same live fingerprint and 383 tickets, with release channels empty and main@1 terminal released."
---

## Outcome

PR https://github.com/collisionengineers/kanmer/pull/319 merged at 2026-09-04T09:58:23Z as 4e94ad806d5f74dbfdc9b0789190624addf4cbdd.

v0.4.1 is the public latest release at tag `v0.4.1` and exact merge SHA `4e94ad806d5f74dbfdc9b0789190624addf4cbdd`. The final installed packaged generation is `0.4.1-7432`; live `get_status` reports server 0.4.1, SHA-256 `3f7af329d5e634f4d90cf4aa65cea53f72c1b92117e5307329a9bd31d63c9d90`, format 3, repository current, and the unchanged logical project fingerprint `kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`.

## Acceptance mapping

| Requirement | Evidence |
| --- | --- |
| Exact-merge verification | attempts 1–2 |
| Public release, coherent assets and tag workflow | attempts 3–4 and 10 |
| Packaged/copy/install acceptance | attempts 5–6 and 18 |
| Claude complete payload, Connect health and fault recovery | attempts 7–13 |
| Three-host portable registration/idempotence | attempt 14 |
| Golden workflow and retained failures | attempts 15–19 |
| Setup, documentation rail, rollback and final cut-over | attempts 19–21 and 23 |
| Live release serialization | attempt 22; `main@1` terminal released, lease cleared |

## Notes

- The temporary ESM harness error was outside the packaged application and occurred before production Connect loaded; it changed no user or board state.
- Claude Code 2.1.260 auto-removes a plugin while removing its marketplace. This made the first fault-repair pass stop at a redundant uninstall, but it remained safely red and a second Connect restored the supported healthy state. The failed pass is retained above.
- The two golden driver timeouts were launcher-invocation mistakes. The installed launcher then passed the automated copied-board workflow and the completed typed transcript evaluated PASS after all operator steps were observed.
- Pegasus's source artefacts are current, but its board worktree was four commits behind `origin/kanmer-board`; setup did not mutate or push that protected board branch.
