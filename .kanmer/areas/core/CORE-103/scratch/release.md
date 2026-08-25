2026-08-25 release dry-run FAIL preserved. `npm run release 0.3.8 -- --ticket CORE-103 --dry-run` from the clean release clone reached MCP HTTP tests, then exited 1 because that process had no canonical `KANMER_ROOT`; the server reported no Kanmer board. No v0.3.8 tag, release, asset, or source commit was created. Release is additionally paused on newly reproduced installed-runtime defects [[GUI-132]], [[GUI-133]], [[MCP-049]], and [[SKILL-034]]. Do not retry preparation or publication until those blockers are independently verified Done and the next clean invocation binds `KANMER_ROOT` to the canonical board.

2026-08-25 clean-clone dry-run attempt: FAIL (exit 1). Build, core 310/310, and GUI 477/477 passed. MCP HTTP rail failed 9 tests because a genuine clean clone has no discoverable .kanmer board; remote-host tests and packaged doctor CLI implicitly inherited the developer repository board. No version, branch, tag, release, or asset was created. Filed a bounded blocking fix; do not inject this machine board path into the release proof.

Release preparation succeeded: v0.3.8 commit b79259e8a180d0ae5c500866ebcbcfd3c7dbb71e pushed as release/v0.3.8; PR #269 opened. No tag or release assets created.

v0.3.8 publisher attempt (single authorized invocation) FAILED after immutable tag push.

- Tag v0.3.8 points to exact release merge 8c8fdb868aed3677b3603b9ba360f304139aee6f.
- Full pre-publish verification passed.
- electron-builder began the installer and blockmap upload, but concurrent release creation returned GitHub 422 already_exists for tag_name.
- The public release became visible with only Kanmer-Setup-0.3.8.exe uploaded.
- The publisher then failed its local updater-package check because latest.yml was absent; exit code 1.
- Strict public verifier exit 1: missing kanmer-0.3.8.mcpb, Kanmer-Setup-0.3.8.exe.blockmap, and latest.yml.
- No manual upload, retag, retry, or repair was performed.
- Tag workflow run 32831367125 is being allowed to reach its terminal verification result.
