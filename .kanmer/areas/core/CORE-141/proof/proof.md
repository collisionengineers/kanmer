---
kind: proof-record
schema: 2
merged_sha: "7a6e437574fd653f4c49d0a3fa00e6b5e4904809"
environment: "Windows 11 / Node v24.15.0 / root checkout C:\\Users\\Alex\\Documents\\GitHub\\kanmer on main / release clone C:\\Users\\Alex\\AppData\\Local\\Temp\\kanmer-fresh-042 (deleted) / installed launcher %LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd / installed generation %LOCALAPPDATA%\\Kanmer\\mcp\\0.4.2-4920"
verified_at: "2026-09-05T19:55:00.000Z"
result: PASS
receipts:
  - kind: github-actions-run
    provider: github-actions
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33982388947
    job: verify
    head_sha: "7a6e437574fd653f4c49d0a3fa00e6b5e4904809"
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33982388947"
    covers: "push-to-main verify rail at the merge commit"
    observed_by: "claude-code (CORE-141 operator run)"
  - kind: github-actions-run
    provider: github-actions
    repo: collisionengineers/kanmer
    workflow: release.yml
    event: push
    run_id: 33983890950
    job: release-verify
    head_sha: "7a6e437574fd653f4c49d0a3fa00e6b5e4904809"
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33983890950"
    covers: "independent tag-triggered rail + packaged-updater build/check + published-asset verification for v0.4.2"
    observed_by: "claude-code (CORE-141 operator run)"
attempts:
  - attempted_at: "2026-09-05T17:23:12Z"
    command: "GH_TOKEN=... node scripts/release.mjs 0.4.2 --publish --release-commit 7a6e437574fd653f4c49d0a3fa00e6b5e4904809"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 1
    result: FAIL
    authority: supporting
    failure_class: transient
    summary: "B1 attempt 1: full verify rail and GUI build passed; electron-builder/signtool.exe packaging crashed under host resource pressure with no error trace (process tree disappeared mid NSIS signing). No tag or GitHub release existed at any point (confirmed via git tag/ls-remote and gh release view before retry); safe to retry."
  - attempted_at: "2026-09-05T18:04:34Z"
    command: "GH_TOKEN=... node scripts/release.mjs 0.4.2 --publish --release-commit 7a6e437574fd653f4c49d0a3fa00e6b5e4904809"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "B1 attempt 2 (retry): full rail, GUI build, electron-builder NSIS package, check-updater-package (8 checks), git tag v0.4.2 pushed, GitHub release created/uploaded (4 assets)/published non-draft-latest. Script's own post-publish verification: all 4 assets byte-identical, /releases/latest confirms v0.4.2."
  - attempted_at: "2026-09-05T18:23:37Z"
    command: "node scripts/verify-release-assets.mjs 0.4.2 --remote-coherent"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "PASS: v0.4.2 is complete and its public manifest matches the published installer bytes."
  - attempted_at: "2026-09-05T18:24:20Z"
    command: "release_channel acquire/record/complete (main@2)"
    cwd: "live Kanmer board"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "B2 release ledger: attempt main@2 recorded with 12 included PRs (#321-332), 11 included tickets, 4 asset sha256 digests, verification_state passed, then completed (terminal, lease cleared). get_status.release confirms."
  - attempted_at: "2026-09-05T18:25:26Z"
    command: "git clone + git checkout v0.4.2 + npm ci + npm run plugin:check + npm run mcpb:check + npm run test:http -w @kanmer/mcp-server"
    cwd: "C:/Users/Alex/AppData/Local/Temp/kanmer-fresh-042 (deleted after)"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "B3 fresh non-linked clone at v0.4.2 (7a6e4375...): npm ci exit 0; plugin:check exit 0 (41 tools match, manifests at v0.4.2); mcpb:check exit 0 (built kanmer-0.4.2.mcpb, 1796819 bytes, matches published asset exactly); test:http exit 0 (253 tests, 252 pass, 1 skip, 0 fail, 66.78s)."
  - attempted_at: "2026-09-05T19:28:05Z"
    command: "Kanmer-Setup-0.4.2.exe /S (direct, via bash exec)"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer/apps/gui/release"
    exit_code: null
    result: FAIL
    authority: supporting
    failure_class: implementation
    summary: "B4 manual install attempt 1: hung 7+ minutes with near-zero CPU and an unexpected visible 'Kanmer Setup' window (installer.nsh's customCheckAppRunning MessageBox guard did not auto-answer silently as expected). Killed the stuck installer process only (PID 14512, not an app/MCP process); no generation change resulted."
  - attempted_at: "2026-09-05T18:36:56Z"
    command: "Start-Process Kanmer-Setup-0.4.2.exe -ArgumentList '/S' (PowerShell)"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer/apps/gui/release"
    exit_code: 2
    result: FAIL
    authority: supporting
    failure_class: implementation
    summary: "B4 manual install attempt 2: exited quickly with no window, correctly refusing (the installer's own guard, by design, will not replace a running install root without interactive IDOK consent). No generation change, no app/MCP process touched. Both manual attempts withdrawn as the wrong instrument per operator decision; adoption proceeded via the app's own sanctioned updater instead."
  - attempted_at: "2026-09-05T19:41:00Z"
    command: "in-app electron-updater quitAndInstall (applied by the operator via the Restart-now banner); read-only poll for the resulting generation"
    cwd: "live host"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "B4 host adoption: 0.4.2-4920 generation created, current junction repointed, registry DisplayVersion 0.4.2, detected within ~5 min of a read-only 60s poll. Stable launcher --probe healthy. Fresh session via the new generation against the live board: server.version 0.4.2, sha256 20caa7551f8316524f9a54253597fa2826a9f9474962262c96cdc705e275a5bd, repo.upToDate true, delivery.verification present, proofValidation present (mode: report). Claude plugin/marketplace restaged: staging dir refreshed from the new generation's bundled plugin files, then `claude plugin update kanmer@kanmer` moved the installed cache 0.4.1 -> 0.4.2 (enabled, user scope)."
  - attempted_at: "2026-09-05T19:50:00Z"
    command: "get_status -> create_item -> set_ticket_doc(plan) -> get_doc_gates -> move_item(preparing) -> list_items -> update_item(archived:true) via the installed 0.4.2 server, --root <mkdtemp>"
    cwd: "C:/Users/Alex/AppData/Local/Temp/kanmer-m5-b5-run2 (deleted after)"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "B5 M5/AT-37 disposable mutation through the installed route: all 7 steps confirmed correct (TICK-001 created, doc set, gates read, moved to preparing, found on readback, archived). No live board touched."
  - attempted_at: "2026-09-05T19:55:00Z"
    command: "current junction repoint 0.4.2-4920 -> 0.4.1-7432 -> 0.4.2-4920 (installer's own GUI-106 mklink/RMDir/Rename mechanism, reproduced via PowerShell); fresh get_status each direction"
    cwd: "live host / live board"
    exit_code: 0
    result: PASS
    authority: authoritative
    summary: "B6 rollback drill (AT-38): rollback to 0.4.1 confirmed via fresh session (server.version 0.4.1, sha256 3f7af329..., live board reachable with unchanged counts 398 tickets/383 done); forward to 0.4.2 re-confirmed identically. 0.4.1-7432 retained on disk throughout, never uninstalled. This is the final authoritative attempt: every step of B1-B6 passed (two non-authoritative FAILs above were the withdrawn wrong-instrument manual-install attempts, both non-destructive and superseded by the sanctioned in-app-updater path that did succeed)."
---

## Outcome

Release PR https://github.com/collisionengineers/kanmer/pull/332 ("release: v0.4.2") merged at `7a6e437574fd653f4c49d0a3fa00e6b5e4904809`. v0.4.2 is the public latest release at tag `v0.4.2` and this exact merge SHA. Release ledger attempt `main@2` is terminal `released`.

0.4.2 is now the live control plane on this host: installed generation `0.4.2-4920` (sha256 `20caa7551f8316524f9a54253597fa2826a9f9474962262c96cdc705e275a5bd`), stable launcher resolves it, Claude plugin/marketplace restaged to 0.4.2, live board (`kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`) unchanged in fingerprint and reachable throughout every adoption/rollback step. Rollback to the retained `0.4.1-7432` generation was proven and reversed.

CORE-129 proof census (copied board, run twice, deterministic): `valid 2 / legacy 319 / invalid 2 (GUI-133, GUI-135) / absent 105 / total 428`, digest `proof-census-v1:59830aa1862824e92b79e670dd81b8fd21be11ad7573e99b3dd4028ac5afe818`. Decision: the live board stays in `report` (non-strict) proof-validation policy for 0.4.2 — confirmed live via `proofValidation.mode: "report"`.

Full HZN-009 closeout report: group doc `HZN-009/closeout.md`. Full command-by-command transcript: ticket `scratch/cut-log.md`.

## Acceptance mapping

| Requirement | Evidence |
| --- | --- |
| Publish, tag, public release, coherent assets | attempts 1-3 |
| Release ledger | attempt 4 |
| Fresh-clone rebuild parity | attempt 5 |
| Host adoption (installed route) | attempts 6-8 |
| M5/AT-37 disposable mutation | attempt 9 |
| Rollback drill AT-38 | attempt 10 (authoritative) |
| Independent CI (push-to-main verify, tag release-verify) | receipts 1-2 |
