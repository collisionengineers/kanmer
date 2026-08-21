# Checklist — CORE-031

- [x] Confirm the ticket branch/worktree contains no changes outside CORE-031 before editing.
- [x] Add dependency-free `scripts/verify.mjs`.
- [x] Export `VERIFY_STEPS` with exactly the nine approved commands, build first so a clean checkout has generated package exports before tests.
- [x] Add an ESM direct-entry guard so importing `verify.mjs` performs no verification.
- [x] Resolve the repository root from `import.meta.url`, not the caller’s current directory.
- [x] Make the direct runner print each command, inherit stdio, and stop on the first non-zero exit.
- [x] Add root `package.json` script `"verify": "node scripts/verify.mjs"` without changing component scripts.
- [x] Import `VERIFY_STEPS` into `scripts/release.mjs`.
- [x] Remove the release-local `GATE`/duplicate command list and iterate the imported array through the existing `run()` helper.
- [x] Preserve the release gate’s position before dry-run return and before all version/file mutations.
- [x] Update release comments for the new order, discovery smoke, and non-duplicated manual check.
- [x] Add the `npm run verify` row and shared-rail/no-third-pyramid wording to AGENTS.md §6.
- [x] Confirm `.github/workflows`, package-lock, plugin bundle, leaf scripts, and release publishing logic are unchanged.
- [x] Run `node -e "import('./scripts/verify.mjs').then(m => console.log(JSON.stringify(m.VERIFY_STEPS)))"` and confirm no verification starts during import.
- [x] Run `npm pkg get scripts.verify` and confirm the exact public command.
- [x] In a clean standalone checkout of the ticket branch, run `npm ci`.
- [x] In that standalone checkout, run `npm run verify` and retain the zero exit code/output for review.
- [x] Run `git status --porcelain` after verification and confirm it is empty.
- [x] Inspect `git diff -- scripts/verify.mjs package.json scripts/release.mjs AGENTS.md` for scope and release regressions.
- [x] Open the PR with `Kanmer: CORE-031` in its body and name the shared rail as the production caller used by CORE-032/release.
- [x] Stop at review readiness; do not merge or begin CORE-032.

## Progress notes

- Implemented and committed `2a0d489e23c4c6ebce46eb2e5e4e85cef7461d03`: a dependency-free, import-safe shared array used by both the new root command and release gate.
- Import-only check printed the exact nine commands without executing them; `npm pkg get scripts.verify` returned `"node scripts/verify.mjs"`.
- In clean standalone checkout `C:\\Users\\Alex\\AppData\\Local\\Temp\\kanmer-core-031-4b88edce460f479abe9b366398005bb7`, `npm ci` passed and left no tracked changes.
- **Resolution:** the rail now builds first, then runs the full test/typecheck/smoke sequence. A clean standalone clone ran `npm ci && npm run verify` to exit 0; the HTTP tests used a disposable `KANMER_ROOT` fixture and the checkout remained clean. Branch is pushed and PR is ready for independent review; no merge or CORE-032 work was started.
