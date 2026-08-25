# CORE-107 plan

## Purpose

Recover from the immutable, incomplete v0.3.8 GitHub release by publishing v0.3.9 through the corrected single-build release path. Do not modify, delete, or retag v0.3.8; retain its missing `latest.yml` response as historical failure evidence.

## Implementation order

1. Start from exact `origin/main` after CORE-106 (`093f4b74882d56cac448a5b6513b5b0726401c89`) in the ticket worktree. Inspect the release script, release notes, FRD-021, and existing v0.3.8 remote assets before changing files.
2. Update the v0.3.9 release metadata and notes only. Describe the recovery release, the Windows installed-app fixes already merged, and the complete updater asset contract. Do not add product features.
3. Run the release dry-run/verification rail and all repository checks required by `npm run release -- 0.3.9 --ticket CORE-107 --dry-run`. Fix only release-preparation defects within this ticket; file unrelated defects separately.
4. Commit the preparation, push `core-107-release-0-3-9`, open a PR carrying `Kanmer: CORE-107`, obtain an independent exact-head review, resolve every finding, and require hosted checks to pass.
5. Merge through protected main. In a clean checkout of the exact merge SHA, run the publish phase once using the approved release credential. The release must be created as a draft, receive the one authoritative package set, pass local/remote digest verification, and only then become public/latest.
6. Confirm the v0.3.9 tag workflow is green and run strict external verification. Require all canonical artifacts, including `latest.yml`, to exist publicly and match the locally built bytes.
7. Install/update the public v0.3.9 Windows package. Confirm Check for updates no longer reports a missing manifest, the installed application starts, the packaged MCP identifies as v0.3.9, and Codex Connect/probe guidance works from the installed location.
8. Validate the configured Cloudflare remote route and OpenAI managed tunnel against the installed v0.3.9 runtime without recording secrets. Capture endpoint/runtime health and exact command exit codes in proof.
9. Write proof against the exact merge SHA, move CORE-107 one boundary at a time to Done, record the reachable merge commit/PR/deployment state, release the ticket, and remove its branch/worktree.
10. Reassess CORE-036, CORE-042, MCP-028, and CORE-103 using the new release evidence. Close only claims actually proved; preserve prior failed attempts and create follow-up tickets for genuine residual defects.

## Acceptance criteria

- v0.3.9 is public/latest and v0.3.8 remains unchanged as failed historical evidence.
- The public v0.3.9 release contains the complete canonical asset set with matching sizes and SHA-256 digests; `latest.yml` is downloadable without authentication.
- The protected-main preparation PR and tag workflow are green at their exact SHAs.
- A real installed v0.3.9 app starts, checks for updates without the v0.3.8 404 failure, exposes a packaged MCP reporting v0.3.9, and has working Codex Connect behavior.
- Cloudflare and OpenAI tunnel checks exercise the packaged runtime successfully, or any externally unavailable check is recorded as a failure rather than converted to PASS.
- Proof records every attempt and exit code; no secret value is written to the repository or board.
