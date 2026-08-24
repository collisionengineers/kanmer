## 2026-08-24 dry-run refusal

- Clean clone at origin/main ef67c04e0f3a20145dcb88497fdcb97a53038ab6: `npm ci --ignore-scripts` exited 0.
- `npm run release -- 0.3.4 --ticket CORE-096 --dry-run` exited 1 before the shared verification gate.
- Exact refusal: `apps/gui/release-notes.md` does not mention 0.3.4. No release branch, tag, GitHub release, public asset, or source edit was created.
- This is an intentional release-script guard. The plan/file map/checklist must be revised to include an accurate v0.3.4 release-notes update before retrying.

## 2026-08-24 full dry-run attempt — environment failure retained

- After the release-notes correction, the full `npm run release -- 0.3.4 --ticket CORE-096 --dry-run` reached the shared test rail. Core passed 310/310 and the GUI integration rail completed, including the long real-Git files.
- The command exited 1 in `@kanmer/mcp-server` `test:http`: `remote-host.test.mjs` could not discover a Kanmer board from the independent clone. The exact refusal named the clone's own ancestors and instructed the operator to pass `--root` or set `KANMER_ROOT`; no production assertion was weakened.
- The release clone is intentionally a standalone clean clone, so it cannot see the outer repository's `.worktrees/kanmer` sibling by discovery. The canonical board already exists and will be supplied to the test process via `KANMER_ROOT` on the next bounded dry-run. No source, branch, tag, release, provider, or board state changed in this failed attempt.
