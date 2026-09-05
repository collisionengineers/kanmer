## Cut sequence

1. Clean `main` at `410bfd22` (== `origin/main`): `git fetch origin && git status --porcelain` empty, `git rev-parse HEAD` == `git rev-parse origin/main`.
2. `npm ci && npm run verify` — one local rail on clean main.
3. `npm run golden` then `npm run golden:promotion -- --candidate 0.4.2 --dry-run`; if clean, the real rehearsal on a **copied** board (never the live one).
4. CORE-129 proof census (report/strict decision, see below) via `migrate_board` dry run on a **copy** of the live board.
5. `node scripts/release.mjs 0.4.2 --ticket CORE-141 --dry-run` from clean main (runs the full `VERIFY_STEPS` rail even in dry-run; requires `apps/gui/release-notes.md` to mention `0.4.2`, clean tree, branch `main`, `guiPkg.version` (0.4.1) < `0.4.2`).
6. Real preparation: `node scripts/release.mjs 0.4.2 --ticket CORE-141` — creates `release/0.4.2` from main, bumps every manifest (`apps/gui/package.json`, root `package.json`, both plugin manifests + `plugins/kanmer/plugin.json`, `mcpb/manifest.json`), rebuilds `plugins/kanmer/mcp/kanmer-mcp.cjs`, commits, pushes, opens the release PR against `main`.
7. Merge the release PR through the normal protected route (review + required checks); update local `main`.
8. Publish: `node scripts/release.mjs 0.4.2 --publish --release-commit <post-merge-sha>` with `GH_TOKEN` set — tags `v0.4.2`, creates the draft GitHub release from `apps/gui/release-notes.md`, uploads assets, verifies digests, flips `--latest`.
9. Fresh non-linked clone: `npm ci && npm run plugin:check && npm run mcpb:check && npm run test:http -w @kanmer/mcp-server`.
10. Install the 0.4.2 MCPB/plugin in the host; `get_status` reports `0.4.2` and the intended skill set.
11. Disposable mutation on a `mkdtemp --root` board through the installed route: `get_status → create_item → set_ticket_doc → get_doc_gates → move_item → list_items → archive`.
12. Rollback drill: point the host at the retained 0.4.1 generation, confirm it answers, then switch back to 0.4.2.
13. Write `HZN-009/closeout.md` (file 11 §5 template) with M1–M5 as PASS/PROCEDURAL/FAIL/INCONCLUSIVE/NOT RUN; update `contracts/release-resumption-gate.json` in the pack.

If step 10, 11 or 12 fails: **keep 0.4.1 as the live control plane**, do not flip `--latest` (or revert it if already flipped is not possible — pull the release from `latest` manually), and record M5 truthfully as FAIL/INCONCLUSIVE, not PASS.

## Merged roster for 0.4.2 (source `c088be13..origin/main`, HEAD `410bfd22`)

| Ticket | Title | Merge SHA | PR |
|---|---|---|---|
| DOC-028 | Route work by purpose in the managed block and name the configured integration branch | `bd368549` | #321 |
| GUI-152 | Focus Board scopes, bounded columns and sidebar | `32aa54fc` | #323 |
| CORE-140 | Build each rail artifact once and refuse a stale already-built step | `94165031` | #322 |
| DOC-026 | Retire CLOSEOUT_PLAN.md, add the operating index, fix stale AGENTS.md pointers | `37b83b14` | #326 |
| MCP-057 | Consult the bound post-merge verify run before creating a verification worktree; record receipts in proof | `e474f317` | #325 |
| CORE-138 | Stop PR body edits cancelling verify; gate advisory on drafts; regate waits for in-progress runs | `9945b1f2` | #324 |
| CORE-144 | Make the build-once guard see through the runner scripts; harden the dirty digest | `de5bace9` | #327 |
| CORE-145 | Build core before the standalone HTTP tests on a fresh checkout | `58718455` | #328 |
| CORE-129 | Validate typed proof records; add a report/strict board proof policy with a census-bound cutover | `410bfd22` | #329 |

CORE-129's PR is merged (`410bfd22`) but the ticket is still in **Review** on the live board (verify/closeout has not run against it yet) — treat it as merged code, not yet Done, in the closeout report.

## Strict-cutover decision rule (CORE-129 report/strict proof policy)

Run `migrate_board` dry run on a **copy** of the live board to get the proof census (`valid` / `invalid` / `legacy` counts). Decide:

- If `invalid == 2` and both are the known unparseable **GUI-133 / GUI-135** legacy records (pre-typed-proof, free-prose, no `attempts[]`) — these are accepted as legacy, not a blocker.
- **Recommendation: keep the live board in `report` policy for 0.4.2.** Record the census numbers in the plan/closeout either way. Do not flip the live board to `strict` in this cut.
- Strict cutover on the live board is a **deliberate, later, separate operator step** — not bundled into the 0.4.2 release. It requires the operator to explicitly re-run the census against the then-current live board immediately before flipping, because the census is only valid for the board state it was taken against.

## Rollback procedure

Retained generation: `%LOCALAPPDATA%\Kanmer\mcp\0.4.1-7432` (sha256 `3f7af329…`, the current live control plane). To roll back from a bad 0.4.2 adoption: point the host's provider registration back at the 0.4.1 generation folder (or reinstall `Kanmer-Setup-0.4.1.exe` from the `main@1` release ledger asset manifest), confirm `get_status.server.version` reads `0.4.1` again, and re-run a disposable mutation to confirm the board is still readable. No board migration is needed either direction — 0.4.2 introduces no board-format bump. Do not delete the 0.4.1 generation folder until 0.4.2 has been live and stable for at least one full verification cycle.

## Stop conditions

- Any hard refusal from `scripts/release.mjs` (dirty tree, wrong branch, stale manifests, missing/stale release notes, dirty build stamp, missing `GH_TOKEN` in publish mode) — fix the named cause, do not bypass.
- `npm run verify`, `npm run golden`, or `npm run golden:promotion` fails on clean main — do not proceed to release preparation.
- Step 10 (host install), 11 (disposable mutation) or 12 (rollback) fails — keep 0.4.1 live, do not flip `--latest`, record M5 as FAIL/INCONCLUSIVE.
- The live-board proof census shows `invalid` records beyond the known GUI-133/GUI-135 pair — stop and investigate before recording the strict-cutover decision; do not accept unknown invalid records as legacy by default.
- Any step requires touching `.worktrees/kanmer` or the root `main` checkout's tracked files outside the dedicated `.worktrees/CORE-141` release worktree — stop; that is out of scope for this ticket's preparation phase.
