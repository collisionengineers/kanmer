# Post-implementation report — CORE-141

## What this PR carries

This PR contains **only** `apps/gui/release-notes.md`, adding the `## 0.4.2` ("Delivery Recovery") section ahead of the existing `## 0.4.1` section, in the file's established per-release format. No manifest version bump, no tag, no publish, and no other tracked file is touched.

## What it does not do

- Does **not** bump `apps/gui/package.json`, root `package.json`, either plugin manifest, `plugins/kanmer/plugin.json`, or `mcpb/manifest.json`.
- Does **not** create a `release/0.4.2` branch, a `v0.4.2` tag, or a GitHub Release.
- Does **not** run `scripts/release.mjs` in any mode.

Those steps happen via `node scripts/release.mjs 0.4.2 --ticket CORE-141` (preparation) and `node scripts/release.mjs 0.4.2 --publish --release-commit <sha>` (publish), run by the operator **after** this PR merges, per the cut sequence recorded in `plan/plan.md`. `scripts/release.mjs` checks that `apps/gui/release-notes.md` mentions the target version before it will proceed — that is the sole purpose of this PR: to have correct, reviewed notes in place on `main` before the real release preparation is run.

## Roster covered by the notes

The notes credit the ten HZN-009 tickets merged into 0.4.2 (all confirmed Done on the live board): DOC-028 (`bd368549`), CORE-140 (`94165031`), GUI-152 (`32aa54fc`), DOC-026 (`37b83b14`), MCP-057 (`e474f317`), CORE-138 (`9945b1f2`), CORE-144 (`de5bace9`), CORE-145 (`58718455`), CORE-129 (`410bfd22`), CORE-147 (`4a1c3a23`). See `plan/plan.md` for the full roster table with SHAs and PRs.

## Verification performed for this PR

- `git diff origin/main --stat` in `.worktrees/CORE-141` confirms `apps/gui/release-notes.md` is the only changed file.
- Content reviewed against the coordinator's corrections (receipt-rejection-demo scope limited to MCP-057, CORE-146 marked scheduled for 0.5.0/HZN-010, PR-handoff mechanisms described as two separate mechanisms, smoke flake referenced as MCP-058).
- No build, test, or release-rail command was run for this documentation-only change; the full rail runs as a required check on the PR and again inside `scripts/release.mjs` at the real cut.
