# Post-implementation report — CORE-137 (prepare phase)

Steps 1–5 of the plan are done; steps 6–11 (review, merge, publish, release verification, promotion acceptance, channel completion) follow and are recorded in `scratch/promotion.md` and `proof/proof.md`.

## Cut-point census

All nine release tickets Done with `proof-record` PASS at merge SHAs that are ancestors of the cut `04a977516fcb29500b5df2fd6aacea24e2e3d54e`; nothing in Implementing/Review/Verifying before this ticket was taken; `counts.taken` 0; `.worktrees/` only `kanmer`; board pushed at `c3b76744`; hosted `verify` success at the cut (run 33843422690). Details in `scratch/promotion.md`.

## Files changed (release PR #319, head `6637239d2af844f9fae4c59bc572ec6535341509`)

| Commit | Content |
|---|---|
| `4fd6998a docs(release): add v0.4.1 notes` | `apps/gui/release-notes.md`: new `## 0.4.1` section (Fixed / Skills and policy / Proof / upgrading) above `## 0.4.0` |
| `6637239d release: v0.4.1` | script-generated: `package.json`, `apps/gui/package.json`, `package-lock.json`, `plugins/kanmer/.claude-plugin/plugin.json`, `plugins/kanmer/.codex-plugin/plugin.json`, `plugins/kanmer/plugin.json`, `mcpb/manifest.json`, `plugins/kanmer/mcp/kanmer-mcp.cjs` (version compiled into the bundle) |

Nothing else was edited by hand.

## Commands and exit codes

| Command | cwd | Exit | Result |
|---|---|---|---|
| `git clone … kanmer-release-0.4.1` + `npm ci` | fresh clone at `04a97751` | 0 / 0 | `C:kt-tmpcore137clone.log` |
| `bash notes-commit.sh` (insert + commit notes) | clone, local `main` | 0 | commit `4fd6998a` |
| `npm run release -- 0.4.1 --ticket CORE-137` | clone | 0 | 25 script commands: the shared rail (21 rail steps incl. golden step `20/20 scenarios passed in 16786 ms (budget 300000 ms)`), bump, bundle + MCPB rebuild, `plugin:check` → `plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.1, isolated MCP handshake lists 41 tools`, GUI build, commit, push `release/v0.4.1`, PR (`C:kt-tmpcore137prepare.log`) |

Script-run commands, in order: `npm run build`, `npm run build -w @kanmer/gui`, `npm test`, `npm run typecheck`, `npm run verify:docs`, `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:headless`, `npm run mcpb:check`, `npm run smoke:protocol`, `npm run smoke:discovery`, `npm run golden`, `npm run verify:skills`, `npm run verify:agents-block`, `npm run plugin:check`, `git switch -c release/v0.4.1`, `npm install --package-lock-only`, `npm run build`, `node scripts/build-plugin.mjs`, `node scripts/build-mcpb.mjs`, `npm run plugin:check`, `npm run build -w @kanmer/gui`, `git add -A`, `git commit -m "release: v0.4.1"`, `git push --set-upstream origin refs/heads/release/v0.4.1`, `gh pr create --base main --head release/v0.4.1 --title "release: v0.4.1" --body "Kanmer: CORE-137"`.

## Deviations from the plan

- The ticket was taken (`take_ticket`) with the release clone as its workspace and `release/v0.4.1` as its branch so the lease, not a convention, records where the release is being produced; CORE-136 ran untaken.
- The PR body written by the script (`Kanmer: CORE-137` only) was rewritten with a summary and the session attribution; the footer stays the last line.

## Not verified here

Publication, remote asset coherence, the installed-host promotion acceptance (10a–10m) and the rollback rehearsal. Reviewer note from CORE-119 F-002 applies to step 10j (launcher must carry `--root <copy dir>`).
