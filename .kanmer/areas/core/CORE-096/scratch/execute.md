## 2026-08-24 dry-run refusal

- Clean clone at origin/main ef67c04e0f3a20145dcb88497fdcb97a53038ab6: `npm ci --ignore-scripts` exited 0.
- `npm run release -- 0.3.4 --ticket CORE-096 --dry-run` exited 1 before the shared verification gate.
- Exact refusal: `apps/gui/release-notes.md` does not mention 0.3.4. No release branch, tag, GitHub release, public asset, or source edit was created.
- This is an intentional release-script guard. The plan/file map/checklist must be revised to include an accurate v0.3.4 release-notes update before retrying.

## 2026-08-24 full dry-run attempt — environment failure retained

- After the release-notes correction, the full `npm run release -- 0.3.4 --ticket CORE-096 --dry-run` reached the shared test rail. Core passed 310/310 and the GUI integration rail completed, including the long real-Git files.
- The command exited 1 in `@kanmer/mcp-server` `test:http`: `remote-host.test.mjs` could not discover a Kanmer board from the independent clone. The exact refusal named the clone's own ancestors and instructed the operator to pass `--root` or set `KANMER_ROOT`; no production assertion was weakened.
- The release clone is intentionally a standalone clean clone, so it cannot see the outer repository's `.worktrees/kanmer` sibling by discovery. The canonical board already exists and will be supplied to the test process via `KANMER_ROOT` on the next bounded dry-run. No source, branch, tag, release, provider, or board state changed in this failed attempt.

## 2026-08-24 — corrected release dry run

Ran `npm run release -- 0.3.4 --ticket CORE-096 --dry-run` from the isolated release checkout with `KANMER_ROOT` bound to the existing canonical board worktree so the MCP discovery smoke test has a real board and creates none.

Result: PASS (exit 0). The full release verification gate completed: Core tests (310/310), GUI tests (468/468), MCP discovery tests, script checks (98/98), typecheck, skill-prose verification, AGENTS block verification, and plugin sync. The dry run reported it would create `release/v0.3.4`, write manifests/artifacts, build, commit, push the release branch and open a PR, then stop before tag or release-asset publication. It reported no Git or remote release state was written.

This proves the gate is healthy in the correct board-root environment. Before the non-dry preparation command, the working tree must be clean; the pending release-notes change cannot be silently carried into that command, so it requires a separate governed documentation PR/ticket rather than an author-side direct-main commit.
