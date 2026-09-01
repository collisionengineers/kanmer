---
kind: proof-record
merged_sha: "7e114cd117ef720c20797e2bf9f5cf58643a94e6"
environment: "Windows 11 10.0.26200 / Node v24.15.0 / release clone C:\\Users\\Alex\\Documents\\GitHub\\kanmer-release-0.4.0 at 7e114cd1 (publish) / installed launcher %LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd (promotion) / copied board %TEMP%\\kanmer-board-copy-0.4.0"
verified_at: "2026-09-01T23:05:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-01T20:25:00Z"
    command: "npm run release -- 0.4.0 --ticket CORE-136"
    cwd: "kanmer-release-0.4.0"
    exit_code: 1
    result: FAIL
    summary: "Prepare attempt 1 refused: working tree not clean (controller's own untracked log/pid files in the clone). Retained; no Git or remote state written."
  - attempted_at: "2026-09-01T20:26:00Z"
    command: "npm run release -- 0.4.0 --ticket CORE-136"
    cwd: "kanmer-release-0.4.0"
    exit_code: 1
    result: FAIL
    summary: "Prepare attempt 2: verify rail, bump, bundle, MCPB and plugin:check at v0.4.0 all green, then step-6 GUI build failed: createHash not exported by __vite-browser-external (renderer runtime import of @kanmer/core). Root cause fixed by GUI-146 (PR #308, merge 3a98bf7c). Clone reset; no branch, PR or tag created."
  - attempted_at: "2026-09-01T21:17:00Z"
    command: "npm run release -- 0.4.0 --ticket CORE-136"
    cwd: "kanmer-release-0.4.0"
    exit_code: 0
    result: PASS
    summary: "Prepare attempt 3 on main 3a98bf7c + notes commit: full rail incl. GUI build green; release/v0.4.0 pushed; PR #309 opened at 1d6720c9."
  - attempted_at: "2026-09-01T22:32:13Z"
    command: "gh pr merge 309 --squash"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Merged as 7e114cd117ef720c20797e2bf9f5cf58643a94e6 after independent review (needs-changes on notes prose at 1d6720c9; one prose remediation f519abac; delta review pass), hosted verify success and kanmer-gate success."
  - attempted_at: "2026-09-01T22:33:49Z"
    command: "npm run release -- 0.4.0 --publish --release-commit 7e114cd117ef720c20797e2bf9f5cf58643a94e6"
    cwd: "kanmer-release-0.4.0"
    exit_code: 0
    result: PASS
    summary: "Verify rail green; GUI built; tag v0.4.0 -> 7e114cd1 pushed; one --publish never package; draft release created, 4 assets uploaded and verified byte-identical, published: https://github.com/collisionengineers/kanmer/releases/tag/v0.4.0 (published 2026-09-01T22:47:35Z, non-draft, non-prerelease, /releases/latest = v0.4.0)."
  - attempted_at: "2026-09-01T22:55:00Z"
    command: "node scripts/verify-release-assets.mjs 0.4.0 --remote-coherent"
    cwd: "kanmer-release-0.4.0"
    exit_code: 0
    result: PASS
    summary: "PASS: v0.4.0 is complete and its public manifest matches the published installer bytes (4 assets)."
  - attempted_at: "2026-09-01T22:55:00Z"
    command: "node scripts/check-updater-package.mjs --out apps/gui/release"
    cwd: "kanmer-release-0.4.0"
    exit_code: 0
    result: PASS
    summary: "updater package OK (8 checks)."
  - attempted_at: "2026-09-01T22:56:00Z"
    command: "KANMER_SMOKE=1 KANMER_OPEN=<copied board> KANMER_SMOKE_CAPTURE_PATH=<png> apps/gui/release/win-unpacked/Kanmer.exe --user-data-dir=<fresh>"
    cwd: "kanmer-release-0.4.0"
    exit_code: 0
    result: PASS
    summary: "Packaged boot smoke: renderer reached ready-to-show; 118,602-byte PNG captured."
  - attempted_at: "2026-09-01T22:56:00Z"
    command: "KANMER_ROOT=<copied board> npm run smoke:headless"
    cwd: "kanmer-release-0.4.0"
    exit_code: 0
    result: PASS
    summary: "Standalone 0.4.0 bundle against the copied board: explicit root reported, headless write/read, host files untouched."
  - attempted_at: "2026-09-01T22:59:00Z"
    command: "gh run watch 33567978927 (release.yml release-verify on tag v0.4.0)"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Tag workflow release-verify: success."
  - attempted_at: "2026-09-01T23:00:00Z"
    command: "Kanmer-Setup-0.4.0.exe /S (attempt 1, GUI still running)"
    cwd: "."
    exit_code: 2
    result: FAIL
    summary: "Installer refused while three Kanmer.exe processes remained under the install root (customCheckAppRunning fails closed, GUI-064). Retained as evidence of the installer gate; nothing was modified."
  - attempted_at: "2026-09-01T23:01:00Z"
    command: "taskkill /F /IM Kanmer.exe; Kanmer-Setup-0.4.0.exe /S"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "GUI ignored the graceful close (no main window handle) and was force-stopped (file store is crash-safe); installer exit 0 in 18 s; %LOCALAPPDATA%\\Kanmer\\mcp\\current -> 0.4.0-33768; launcher --probe healthy."
  - attempted_at: "2026-09-01T22:57:00Z"
    command: "mcp-call.mjs <copied board> get_status / list_projects / create_item / take_ticket take+renew+stale-renew+release / create_item(review) / move_item review->implementing without attestation / move_item with operator: reason / reconcile_ticket GUI-141 / release_channel acquire+complete"
    cwd: "KanmerBackups/tools"
    exit_code: 0
    result: PASS
    summary: "Installed 0.4.0 launcher on the copied board: server 0.4.0 packaged, format 3, project.json allocated once on first write; list_projects bound to the logical project; lease acquired (lease_id, revision 1, 30-min expiry), renew -> revision 2, stale renew refused (lease revision conflict), release ok; unattested review->implementing refused with REVIEW_RETURN_NEEDS_ATTESTATION, operator: reason authorised it and review_round became 1; reconcile_ticket dry-run returned EVIDENCE_INCONCLUSIVE (copied board has no Git/GitHub context) and wrote nothing; release_channel acquire minted main@1 with candidate identity, complete cleared the lease and retained the immutable attempt."
  - attempted_at: "2026-09-01T23:03:00Z"
    command: "Kanmer-Setup-0.3.12.exe /S; launcher get_status (live repo); Kanmer-Setup-0.4.0.exe /S; launcher get_status (live repo)"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Rollback rehearsal: 0.3.12 installer exit 0, current -> 0.3.12-17560, live board served at 0.3.12 with fingerprint kanmer-proj-v1:5dbaab31... and 375 tickets, board worktree clean; 0.4.0 installer exit 0, current -> 0.4.0-28216, live board served at 0.4.0 with the same fingerprint and count."
  - attempted_at: "2026-09-01T23:05:00Z"
    command: "npm run verify:agents-block; launcher get_status (live repo) .repo"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "31/31 checks passed; installed 0.4.0 reports repo upToDate: true (board-config compensated only), so no kanmer-setup refresh is required."
---

## Outcome

v0.4.0 is the public latest release at tag `v0.4.0` = `7e114cd117ef720c20797e2bf9f5cf58643a94e6`, and the packaged 0.4.0 runtime is installed as the live control plane (`%LOCALAPPDATA%\Kanmer\mcp\current -> 0.4.0-28216`; launcher `get_status` on the live board reports `server.version 0.4.0`, fingerprint `kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`, format 3, 375 tickets). The release commit contains every HZN-008 merge through CORE-127 (`a744fd76`) and GUI-146 (`3a98bf7c`).

## Acceptance mapping

| Box | Evidence |
| --- | --- |
| Release public with four assets; `--remote-coherent` exit 0; `release.yml` green | attempts 5, 6, 10 |
| Promotion acceptance steps 1–6 recorded | step 1 backup: `kanmer-board-20260901T223247Z.zip` sha256 `90fbb8438ef0ea6aad2226837de1b38b9f4dbea597e017bf75c6e14be2ef6539` at board commit `41f795f9` (scratch/notes.md); step 2 attempts 7–9; step 3 attempts 11–12; step 4 attempt 13; step 5 attempt 14; step 6 attempts 14–15 |
| Live `get_status.server.version` is 0.4.0 | attempts 14–15 |

## Notes

- Installer gate evidence (attempt 11) is the two-version updater path CORE-042 parked for: an install over a running 0.3.12 fails closed, and the silent install over a stopped 0.3.12 completes in ~18 s, staging a new immutable runtime generation and repointing `current`. Prior generations (0.3.12-35044 serving the controller's own MCP session) kept running throughout.
- The rollback rehearsal is FRD-035 AC4 in miniature: the previous stable installer restores 0.3.12 serving the untouched live board; no board file changed across either direction (worktree clean).
- `reconcile_ticket` on the copied board returned EVIDENCE_INCONCLUSIVE because the copy has no repository or GitHub context; the tool wrote nothing. Live-board reconciliation is Phase 4 of the programme plan and runs against the real repository.
- The GUI was force-stopped for the install after ignoring a graceful close; the GUI is not relaunched by a silent install. The operator's Claude Code MCP session still runs the retained 0.3.12 generation until the session reconnects (`/mcp`), after which it serves 0.4.0.
- Not attempted: GUI-141's packaged runtime-alias/live ChatGPT check (needs a configured OpenAI tunnel profile and credentials); recorded on GUI-141.
