---
kind: proof-record
merged_sha: "4f785781e7f1993fbcde5e474640db509737c0bd"
environment: "merged origin/main / Windows / Node v24.15.0"
verified_at: "2026-08-22T03:07:14.534Z"
result: PASS
attempts:
  - attempted_at: "2026-08-22T03:07:14.534Z"
    command: "npm run --silent test -w @kanmer/gui -- --run apps/gui/src/main/updater.test.ts apps/gui/src/main/mcp-sessions.test.ts apps/gui/src/renderer/src/lib/update.test.ts"
    cwd: "."
    exit_code: 1
    result: FAIL
    summary: "Malformed focused invocation: npm changed into the GUI workspace and the repo-root paths matched no test files; Vitest reported No test files found."
  - attempted_at: "2026-08-22T03:07:14.534Z"
    command: "npm run --silent test -w @kanmer/gui -- --run src/main/mcp-sessions.test.ts src/shared/mcp-sessions.test.ts src/renderer/src/lib/update.test.ts"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "3 files, 40/40 updater/session tests passed."
  - attempted_at: "2026-08-22T03:07:14.534Z"
    command: "npm run --silent test -w @kanmer/gui -- --run"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "38 files, 355/355 GUI tests passed on merged main."
  - attempted_at: "2026-08-22T03:07:14.534Z"
    command: "npm run typecheck"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Core, MCP server, UI, and GUI workspace typechecks passed."
  - attempted_at: "2026-08-22T03:07:14.534Z"
    command: "npm run dist:check"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Windows NSIS package built and updater package OK (8 checks)."
  - attempted_at: "2026-08-22T03:07:14.534Z"
    command: "git diff --check"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "No whitespace errors on merged main."
  - attempted_at: "2026-08-17T01:42:48.000Z"
    command: "controlled packaged 0.3.2 to 0.3.3 app-driven update with a live MCP session"
    cwd: "installed Windows release environment"
    exit_code: 0
    result: PASS
    summary: "Existing evidence records no manual installer step, no uninstallFailed: 2, installed MCP identity changed to packaged 0.3.3 sha 03196057, and the session required the expected reconnect afterward."
  - attempted_at: "2026-08-22T03:07:14.534Z"
    command: "live installed refusal dialog, forced uncleared holder, screenshot, and respawn timing"
    cwd: "."
    exit_code: null
    result: INCONCLUSIVE
    summary: "No disposable installed release/feed or reliable Electron-window capture path was available; no negative-case, visual, or timing result was fabricated."
---
GUI-068 verifies the already merged GUI-064 updater on current main (4f785781e7f1993fbcde5e474640db509737c0bd). The deterministic merged-main updater/session tests, full GUI suite, all-workspace typecheck, Windows NSIS dist:check, and diff check pass. The exact malformed first focused invocation remains recorded as a failed attempt. Existing controlled packaged 0.3.2 to 0.3.3 app-driven update evidence is retained as the happy-path PASS. Refusal-dialog, forced-holder negative-case, screenshot, and numerical respawn-timing proof remain explicitly INCONCLUSIVE because the required disposable host/capture path was unavailable.

This evidence-only ticket produced no source commit or PR. The GUI-064 implementation under verification is merged by PR #29 (merge e293df03; follow-up c8b94a4), and the current main SHA above is the verification target.
