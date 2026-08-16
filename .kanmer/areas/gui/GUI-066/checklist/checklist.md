# Checklist — GUI-066

*Derived from plan.md, one box per step.*

- [x] Write `scripts/verify-release-assets.mjs`: `expectedAssets({version, localDir})` (version-filtered, space→dash renamed, `latest.yml` always required-present, sanity floor), `verifyAssets({expected, assets})` pure → `{ok, problems[]}`, `fetchReleaseAssets({owner, repo, tag, token, fetchImpl})` with distinct 404 / rate-limit / malformed-JSON error kinds, `formatProblems()`. Dependency-free.
- [x] Add the CLI entry: `node scripts/verify-release-assets.mjs <version> [--dir <localDir>]`, non-zero exit on hard failure.
- [x] Write `scripts/verify-release-assets.test.mjs` (`node:test`): golden fixtures v0.3.0 FAIL / v0.3.1 PASS / v0.3.2 PASS, plus `state:"starter"`, 412-byte exe, size mismatch, digest mismatch, `digest:null` degrade, space-named asset, extra asset informational, empty-set sanity floor, and stubbed `fetchImpl` for 404 / rate-limit / malformed JSON.
- [x] Wire the runner: root `package.json` gains `"test:scripts": "node --test scripts/*.test.mjs"`, folded into `"test"`. No devDependency, no lockfile change, no new config file.
- [x] Rewrite `release.mjs` §9 to use the module; keep the `/releases/latest` `tag_name` check; on a gap run exactly ONE repair `npx electron-builder --win --publish always` in `guiDir`, re-verify, then `refuse()` with the problem list and the manual demote command as the fix. Do not demote.
- [x] Set `process.env.EP_GH_IGNORE_TIME = "true"` near the top of `release.mjs`, before both packs, with the comment explaining why it is load-bearing.
- [x] Update the dry-run narration (step 7 line) and the residual manual checklist so neither promises the weaker behaviour.
- [x] Update `AGENTS.md` §6 (command table) and §8 gotcha 11.
- [x] Add an "Amended — GUI-066" section to `docs/functional/frd/FRD-021-auto-update.md` recording R3's as-built behaviour.
- [x] Verification run: `npm test`, `npm run typecheck`, plus `node scripts/verify-release-assets.mjs 0.3.2` (PASS) and `node scripts/verify-release-assets.mjs 0.3.0` (FAIL: blockmap) — this box produces proof.md. DO NOT run the release script.

## Progress notes

**Two design details the plan did not anticipate, both resolved in-file.**

1. **`process.exit()` after a `fetch()` crashes libuv on Windows.** The first run
   of the CLI against v0.3.0 printed the correct FAIL and then died with
   `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\win\async.c:76`
   and **exit code 127**, not 1 — the undici connection pool still holds a handle
   when `process.exit()` fires. A caller reading the exit code would have seen
   neither PASS nor FAIL. Fixed by setting `process.exitCode` and letting the
   loop drain; the reason is a comment in the file so nobody "simplifies" it back.
   Found only because the integration proof runs the real CLI — a unit test of
   `verifyAssets` would never have caught it.

2. **`node --test scripts/` does not do directory discovery here** (Node 24
   resolves the bare path as a module and fails with `MODULE_NOT_FOUND`). The
   working form is the glob: `node --test "scripts/*.test.mjs"`. That is what is
   wired into `test:scripts`.

**Sanity floor earned its place immediately.** `verify-release-assets.mjs 0.9.9`
(no local artifacts for that version) refuses with "the expected set contains no
.exe" rather than passing vacuously against an empty expected set — which is
precisely the failure mode `files.md` warned about.

**Rail results.** `npm run typecheck` clean, all four workspaces named.
`test:scripts` 41/41. `@kanmer/core` 193/193.

**Pre-existing failure found on origin/main, NOT caused by this ticket:**
`apps/gui/src/main/kanmerGit.test.ts` fails non-deterministically — a different
test in the file each run (`renameBoardBranch > keeps the history…`, then
`ensureBoardWorktree reconciliation > moves a worktree left on the old branch…`).
Every test in that file shells out to real `git` and takes **4.6–8.7 s** against
vitest's **5 s** default `testTimeout`, so whichever one loses the race times
out, and the `afterEach` `rmSync` then throws `EPERM`/`ENOTEMPTY` on the Windows
temp dir. **Reproduced with this branch's changes stashed and from the main
checkout**, so it is origin/main's, not GUI-066's — this change touches nothing
under `apps/gui/` or `packages/core/`. Filed separately rather than fixed here.

---

## Closeout — GUI-066

- [x] PR merge verified (`gh pr view 45 --json state,mergedAt` → `MERGED`, 2026-08-16T23:07:38Z, merge commit `0c4ffda`)
- [x] proof.md finalised (written on merged main `0c4ffda`; carries the PR URL and merge date)
- [x] Moved to final stage (Done, 2026-08-16T23:11:02Z)
- [x] Outcome recorded in ticket body (PR link, follow-up [[GUI-085]])
- [x] cd out of worktree; `git worktree remove .worktrees/gui-066`
- [x] `git branch -D gui-066-verify-release-assets` (`-D` required: squash-merged, so the branch commits are not ancestors of main — merge state was verified in step 0)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
