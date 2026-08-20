# Checklist — CORE-031

- [ ] Confirm the ticket branch/worktree contains no changes outside CORE-031 before editing.
- [ ] Add dependency-free `scripts/verify.mjs`.
- [ ] Export `VERIFY_STEPS` with exactly the nine approved commands in the approved order.
- [ ] Add an ESM direct-entry guard so importing `verify.mjs` performs no verification.
- [ ] Resolve the repository root from `import.meta.url`, not the caller’s current directory.
- [ ] Make the direct runner print each command, inherit stdio, and stop on the first non-zero exit.
- [ ] Add root `package.json` script `"verify": "node scripts/verify.mjs"` without changing component scripts.
- [ ] Import `VERIFY_STEPS` into `scripts/release.mjs`.
- [ ] Remove the release-local `GATE`/duplicate command list and iterate the imported array through the existing `run()` helper.
- [ ] Preserve the release gate’s position before dry-run return and before all version/file mutations.
- [ ] Update release comments for the new order, discovery smoke, and non-duplicated manual check.
- [ ] Add the `npm run verify` row and shared-rail/no-third-pyramid wording to AGENTS.md §6.
- [ ] Confirm `.github/workflows`, package-lock, plugin bundle, leaf scripts, and release publishing logic are unchanged.
- [ ] Run `node -e "import('./scripts/verify.mjs').then(m => console.log(JSON.stringify(m.VERIFY_STEPS)))"` and confirm no verification starts during import.
- [ ] Run `npm pkg get scripts.verify` and confirm the exact public command.
- [ ] In a clean standalone checkout of the ticket branch, run `npm ci`.
- [ ] In that standalone checkout, run `npm run verify` and retain the zero exit code/output for review.
- [ ] Run `git status --porcelain` after verification and confirm it is empty.
- [ ] Inspect `git diff -- scripts/verify.mjs package.json scripts/release.mjs AGENTS.md` for scope and release regressions.
- [ ] Open the PR with `Kanmer: CORE-031` in its body and name the shared rail as the production caller used by CORE-032/release.
- [ ] Stop at review readiness; do not merge or begin CORE-032.

## Progress notes

Append implementation evidence here; do not mark an item complete without the corresponding diff or command result.
