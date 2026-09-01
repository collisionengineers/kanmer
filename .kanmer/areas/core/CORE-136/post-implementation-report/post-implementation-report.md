# Post-implementation report — CORE-136 (prepare phase)

## Outcome

Release PR #309 (`release: v0.4.0`) is open from `release/v0.4.0` at prepared commit `1d6720c9b31e4055bc83b1942db2f7e29740f339`, targeting `main` at `3a98bf7c270b590607aa0f4f158b1b0cc2704250` (contains CORE-127 merge `a744fd76` and GUI-146 merge `3a98bf7c`). The PR carries exactly: the notes commit `0085ca80` (`docs(release): add v0.4.0 notes`, rebased onto 3a98bf7c) and the script's release commit (version bump in `package.json`, `apps/gui/package.json`, `package-lock.json`, three plugin manifests, `mcpb/manifest.json`; regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`). No tag, release or asset exists yet.

## Attempts

| # | When (UTC) | Result | Evidence |
| --- | --- | --- | --- |
| 1 | 2026-09-01T20:25Z | refused — dirty tree (controller's own untracked log/pid files in the clone) | `scratch/notes.md` |
| 2 | 2026-09-01T20:26–20:38Z | FAILED at step 6 GUI build (`createHash` not exported by `__vite-browser-external`) after a green rail and green `plugin:check` at v0.4.0 | `C:\Users\Alex\Documents\KanmerBackups\release-prepare-0.4.0.log`; root cause fixed by [[GUI-146]] (PR #308, merged 3a98bf7c) |
| 3 | 2026-09-01T21:17–21:59Z | **prepared** | `C:\Users\Alex\Documents\KanmerBackups\release-prepare-0.4.0-attempt3.log` |

## Attempt 3 transcript summary (clone `C:\Users\Alex\Documents\GitHub\kanmer-release-0.4.0`, clean `main` 3a98bf7c + notes commit)

`npm run release -- 0.4.0 --ticket CORE-136`, exit 0:

1. Preflight: clean tree, branch `main`, notes mention 0.4.0, version 0.4.0 > 0.3.12, gh auth session.
2. Verify rail (`VERIFY_STEPS`, now including `npm run build -w @kanmer/gui`): `npm run build`, GUI build, `npm test` (core, GUI, `test:http` with one documented Windows skip, scripts), `typecheck`, `verify:docs`, stdio smoke, `smoke:headless`, `mcpb:check`, `smoke:protocol`, `smoke:discovery`, `verify:skills`, `verify:agents-block`, `plugin:check` — all exit 0.
3. `git switch -c release/v0.4.0`; bump of all manifests to 0.4.0; `npm install --package-lock-only`.
4. `npm run build`; `node scripts/build-plugin.mjs`; `node scripts/build-mcpb.mjs` → `dist/mcpb/kanmer-0.4.0.mcpb` (41 tools, 2 prompts); `npm run plugin:check` → "41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.0, isolated MCP handshake lists 41 tools".
5. `npm run build -w @kanmer/gui` exit 0 (the step that failed in attempt 2).
6. `git add -A && git commit -m "release: v0.4.0"` → `1d6720c9`; `git push --set-upstream origin release/v0.4.0`; `gh pr create --base main --head release/v0.4.0 --title "release: v0.4.0" --body "Kanmer: CORE-136"` → https://github.com/collisionengineers/kanmer/pull/309.

## What remains (controller-owned)

Independent review at exact head 1d6720c9 (diff-shape check: notes + generated version artifacts only), board push, `kanmer-gate`, merge; then `--publish --release-commit <merge sha>` from the clone's updated `main` with `GH_TOKEN`, remote-coherent asset verification, `release-verify` workflow, and the promotion acceptance in `plan.md` steps 8–10. GUI-146's exact-merge verification is in progress and gates the merge of this PR.

## Remediation — the one budgeted batch (2026-09-01T21:58Z)

Independent review at `1d6720c9` returned `needs-changes` on release-notes prose only (F-001 destructive `project.json` deletion advice, F-002 unconditional revision-refusal claim, F-004 CORE-128 described as a root-cause fix; minors F-003, F-005–F-009). No code, manifest or bundle finding. One prose commit `f519abac4cc1beece53f8a247d896ce93792cec3` on `release/v0.4.0` (10 lines changed in `apps/gui/release-notes.md`): rollback text now says older servers ignore the file and it must be left in place; revision text distinguishes callers that pass the revision from those that omit it; delivery text names the recorded states and the backport commit; step-packet text drops "approved" and makes symbols conditional; the finding list no longer reads as an enum; "/goal" became "a goal run (the kanmer-auto skill)"; the Windows section describes quarantine-or-fix truthfully; the upgrade note says to update the plugin for skills and run kanmer-setup for the AGENTS.md block. `review_round: 1` of `remediation_budget: 1` recorded by hand (0.3.12 server). Delta review follows at f519abac.
