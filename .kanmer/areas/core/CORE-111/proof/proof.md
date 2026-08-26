---
kind: proof-record
merged_sha: "7eed70ebdb7aa0c8bd5838d0cbd2a9e277c0f223"
environment: "Windows release controller; isolated clean main clone; installed per-user Kanmer runtime"
verified_at: "2026-08-26T20:53:58.977Z"
result: PASS
attempts:
  - attempted_at: "2026-08-26T20:20:00.000Z"
    command: "npm run release -- 0.3.12"
    cwd: "C:/Users/Alex/AppData/Local/Temp/kanmer-core111-release-0.3.12"
    exit_code: 1
    result: FAIL
    summary: "Preflight refused before mutation because preparation mode requires --ticket CORE-111."
  - attempted_at: "2026-08-26T20:37:00.000Z"
    command: "npm run release -- 0.3.12 --publish --release-commit 7eed70ebdb7aa0c8bd5838d0cbd2a9e277c0f223"
    cwd: "C:/Users/Alex/AppData/Local/Temp/kanmer-core111-release-0.3.12"
    exit_code: 1
    result: FAIL
    summary: "Preflight refused before mutation because no GitHub token was exported to the release process."
  - attempted_at: "2026-08-26T20:44:22.000Z"
    command: "npm run release -- 0.3.12 --publish --release-commit 7eed70ebdb7aa0c8bd5838d0cbd2a9e277c0f223"
    cwd: "C:/Users/Alex/AppData/Local/Temp/kanmer-core111-release-0.3.12"
    exit_code: 0
    result: PASS
    summary: "Full release rail passed; v0.3.12 tag and public latest release were created only after four assets were uploaded and byte-verified."
  - attempted_at: "2026-08-26T20:45:00.000Z"
    command: "node scripts/verify-release-assets.mjs 0.3.12"
    cwd: "C:/Users/Alex/AppData/Local/Temp/kanmer-core111-release-0.3.12"
    exit_code: 0
    result: PASS
    summary: "Independent post-publication verification passed for kanmer-0.3.12.mcpb, installer, installer blockmap, and latest.yml."
  - attempted_at: "2026-08-26T20:49:28.000Z"
    command: "gh run watch 33011927987 --repo collisionengineers/kanmer --exit-status"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Tag-triggered Release verification passed: locked dependencies, authoritative rail, packaged updater, and published assets."
  - attempted_at: "2026-08-26T20:51:00.000Z"
    command: "normal CloseMainWindow followed by silent v0.3.12 installer"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 3
    result: FAIL
    summary: "Normal window close removed the renderer and remote CLI but the invisible installed main process remained; installer was deliberately not started or forced in this attempt."
  - attempted_at: "2026-08-26T20:53:58.977Z"
    command: "installer-owned stable launcher MCP smoke: initialize; tools/list; get_status"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "After installer exit 0, launcher probe passed and the packaged v0.3.12 external runtime initialized, listed 37 tools, and returned the live board fingerprint."
---

# v0.3.12 release proof

## Release identity

- Release tag and target: `v0.3.12` → `7eed70ebdb7aa0c8bd5838d0cbd2a9e277c0f223`.
- Released from PR [#284](https://github.com/collisionengineers/kanmer/pull/284), merged 2026-08-26T20:36:59Z, following release-notes preparation in [#283](https://github.com/collisionengineers/kanmer/pull/283), merged 2026-08-26T20:18:52Z.
- The clean release main proved merge commits [#281](https://github.com/collisionengineers/kanmer/pull/281) (`6d5e68f`) and [#282](https://github.com/collisionengineers/kanmer/pull/282) (`7b3d7e1`) are ancestors of the release commit.

## Public-release evidence

The release tool created `v0.3.12`, uploaded exactly the MCPB, Windows installer, installer blockmap, and `latest.yml`, verified each uploaded byte against the local package, then made the release public and latest. The independent asset verifier passed again afterwards. GitHub Actions run `33011927987` / job `98320134699` passed its tag verification rail.

## Installed control-plane evidence

The signed-by-release installer completed with exit 0 after the installer-owned process guard cleared the prior install tree. The stable `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` probe passed. A real stdio session through that launcher reported a **packaged v0.3.12** server at external runtime generation `0.3.12-35044`, completed MCP initialize, listed 37 tools, and returned the expected live project fingerprint `kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`.

The non-PASS preflight and graceful-install attempts above are retained as factual history; neither created or altered a release, tag, asset, or application tree.
