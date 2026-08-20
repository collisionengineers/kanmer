# Plan — CORE-031: Create `npm run verify` wrapping one shared VERIFY_STEPS

## Objective

Create one dependency-free, import-safe verification definition that is executable as `npm run verify`, is consumed directly by the release script, and becomes the only command list from which PR and release verification are assembled.

## Starting state

- Root `package.json` exposes the individual verification leaves but no aggregate PR command.
- `scripts/release.mjs` owns a private `GATE` array, duplicates `check:manual`, omits discovery smoke, and orders the checks differently from the adopted roadmap.
- `scripts/check-plugin-sync.mjs` requires a prior build and a normal checkout, and must not be replaced with a mutating plugin rebuild.
- CORE-032 is blocked until this command exists.

## Approach

Add `scripts/verify.mjs` as the sole owner of an immutable ordered `VERIFY_STEPS` array. Make the module safe to import without executing anything, because `release.mjs` performs refusal checks before it may run verification. When invoked directly, the script resolves the repository root, prints each command, runs it synchronously with inherited stdio, and stops on the first non-zero exit. `release.mjs` imports the array and feeds it through its existing `run()` helper, preserving every release-specific step. This is smaller and safer than a new task runner, a duplicated npm script chain, or making release shell out to another opaque process.

## Governing docs

- No PRD, FRD, or ADR is currently linked in `refs`, and this ticket does not introduce a durable architecture decision requiring a new ADR.
- **EPIC-009 context:** met by creating the verification spine required before CI and branch protection; no lease, hierarchy, new stage, or other excluded mechanism is introduced.
- **MASTERPLAN S-01:** met literally by the exact step order, exclusions, shared-array design, release-rail wording, and main/standalone-checkout verification boundary below.

## Required changes

1. Add `scripts/verify.mjs` with only Node built-ins.
2. Export exactly one authoritative command array named `VERIFY_STEPS` with these entries in this order:
   1. `npm test`
   2. `npm run typecheck`
   3. `npm run build`
   4. `node packages/mcp-server/src/smoke.mjs`
   5. `npm run smoke:protocol`
   6. `npm run smoke:discovery`
   7. `npm run verify:skills`
   8. `npm run verify:agents-block`
   9. `npm run plugin:check`
3. Make importing `scripts/verify.mjs` side-effect free. Direct execution must be detected with an ESM/URL-safe comparison that works with Windows paths.
4. For direct execution, resolve the repository root from `import.meta.url`; do not depend on the caller’s current directory.
5. For each entry, print a blank line plus `$ <command>`, execute synchronously with `cwd` set to the repository root and `stdio: "inherit"`, and let the first command failure terminate the process non-zero.
6. Add `"verify": "node scripts/verify.mjs"` to the root `package.json`. Do not alter the component scripts.
7. In `scripts/release.mjs`, import `VERIFY_STEPS` from `./verify.mjs` near the other local imports.
8. Delete the private `GATE` declaration and replace `for (const step of GATE)` with iteration over `VERIFY_STEPS` using the existing release `run()` helper.
9. Rewrite comments immediately surrounding the release verification section so they describe the shared PR/release rail, the new order, discovery smoke, and the fact that `check:manual` is already inside `npm test`. Do not change release pre-flight or post-gate behaviour.
10. Update `AGENTS.md` §6:
    - add a command-table row for `npm run verify` describing it as the authoritative PR check;
    - state directly that `scripts/release.mjs` is the same verification rail followed by bump/package/publish/proof work;
    - state that contributors must extend the shared `VERIFY_STEPS` instead of creating a third pyramid.
11. Review the final diff specifically for accidental edits to release versioning, packaging, tag/push, publishing, repair, or asset-verification logic; revert any such change.

## Expected files

- Add: `scripts/verify.mjs`
- Modify: `package.json`
- Modify: `scripts/release.mjs`
- Modify: `AGENTS.md`

## Do not modify

- `.github/workflows/*`
- `package-lock.json` unless an unrelated tool unexpectedly rewrites it; adding an npm script does not require a lock update.
- `plugins/kanmer/mcp/kanmer-mcp.cjs`
- Any leaf smoke/test/verification script
- Electron builder configuration or release assets

## Ordered implementation steps

1. Create `scripts/verify.mjs` and enter the exact nine commands once, as `VERIFY_STEPS`.
2. Add the import-safe direct-entry guard before wiring any caller; confirm importing the module prints/runs nothing.
3. Add the direct runner and confirm a deliberately failing injected shell command is not added to production code; failure semantics are provided by `execSync` throwing.
4. Add the root npm script and use `npm pkg get scripts.verify` to confirm the public command value.
5. Replace the release-local array with the import, without moving the gate relative to pre-flight or dry-run handling.
6. Update only the now-stale release comments.
7. Update the AGENTS.md §6 command contract.
8. Run static/import checks in the ticket worktree.
9. Run the full rail in a normal standalone checkout of the ticket branch, because `plugin:check` deliberately refuses in linked worktrees.
10. After the PR is merged, reproduce `npm run verify` from the canonical main checkout for proof; the implementation agent must not update or repurpose the main checkout while coding.

## Acceptance checks

- `scripts/verify.mjs` contains the exact nine commands once and exports them as `VERIFY_STEPS`.
- `node -e "import('./scripts/verify.mjs').then(m => console.log(JSON.stringify(m.VERIFY_STEPS)))"` prints the array and does not begin verification.
- `npm pkg get scripts.verify` returns `"node scripts/verify.mjs"`.
- `scripts/release.mjs` imports `VERIFY_STEPS` and contains no second `GATE`/verification command array.
- The release gate still executes before the dry-run return and before any version/file mutation.
- `npm run verify` exits zero in a normal standalone checkout and leaves `git status --porcelain` empty.
- `npm run verify` includes discovery smoke and executes `check:manual` only indirectly through `npm test`.
- AGENTS.md §6 contains the authoritative-command and no-third-pyramid wording.

## Verification

Run from a clean standalone checkout of the ticket branch:

```bash
npm ci
node -e "import('./scripts/verify.mjs').then(m => console.log(JSON.stringify(m.VERIFY_STEPS)))"
npm pkg get scripts.verify
npm run verify
git status --porcelain
```

Then inspect the release diff:

```bash
git diff -- scripts/release.mjs package.json AGENTS.md scripts/verify.mjs
```

The post-merge verifier repeats `npm ci && npm run verify` on the merged SHA/main checkout and records the command exit codes.

## Risks / open questions

- **Import-time execution:** importing an unguarded script would run verification before release pre-flight. Mitigation: mandatory direct-entry guard and explicit import-only check.
- **Dirty-tree verification:** `plugin:build` or an unexpected write would invalidate the rail. Mitigation: it is excluded, and verification ends with an empty `git status --porcelain` assertion.
- **Linked-worktree false failure:** `plugin:check` intentionally refuses there. Mitigation: full acceptance runs in a standalone checkout; ordinary development may still run the earlier leaf commands in the ticket worktree.
- **Release regression:** replacing more than the array could alter publishing. Mitigation: constrained file diff and explicit preservation check.
- No unresolved question remains.

## Failure and deviation rules

- Stop immediately if any command in the shared rail fails; do not delete, reorder, or weaken it to obtain green output.
- If a command is impossible in a normal clean checkout, report the exact command, exit code, and output rather than substituting another check.
- Do not add caching, parallelism, conditionals, dependencies, CI, or package/release behaviour. File follow-up work instead.
- Do not merge the PR or start CORE-032.

## Stop condition

Stop when the four expected files contain only the scoped changes, the exact shared array is import-safe and consumed by release, `npm run verify` passes in a clean standalone checkout without dirtying it, and the PR is ready for independent review. Do not merge and do not begin CORE-032.
