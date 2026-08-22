# CORE-038 post-implementation report

## Change summary

CORE-038 replaces the shell-dependent quoted scripts test glob with a dependency-free Node launcher. The launcher enumerates direct regular scripts/*.test.mjs files in deterministic filename order, invokes Node's built-in test runner with explicit paths and inherited stdio, and returns child status/errors without changing any test assertion or coverage policy.

## Files changed

- package.json — test:scripts now runs node scripts/test-scripts.mjs.
- scripts/test-scripts.mjs — new Node >=20 launcher; no third-party dependency.
- AGENTS.md — command-table convention now names the launcher.
- scripts/check-doc-numbering.mjs, scripts/check-doc-numbering.test.mjs, scripts/verify-release-assets.test.mjs — stale command references updated only.

MCP-041 supervisor code/tests, CORE-037 Git path assertions, GUI code/tests, CI workflow structure, and package dependencies were not changed.

## Governing-doc alignment

The ticket has docs_todo: true and no FRD/ADR ref. The change follows the repository AGENTS.md rule that verification commands must remain explicit and dependency-free, and updates the AGENTS command convention in the same PR. The existing scripts/verify.mjs VERIFY_STEPS list is unchanged; npm test consumes the repaired test:scripts command.

## Verification evidence

- PR #145 verify run 32542393121 / job 96954762665 is the pre-fix authority: Windows Git Bash with Node v20.20.2 executed node --test with the quoted scripts/*.test.mjs pattern, Node reported the literal path could not be found, and the job exited 1 after prior rails passed.
- Pre-build fresh worktree runs of direct launcher and npm run test:scripts exited 1 at 78/80 because generated packages/core/dist was absent; this first environmental failure is preserved, not disguised.
- npm run build: exit 0.
- After build, node scripts/test-scripts.mjs: exit 0, 80/80.
- After build, npm run test:scripts: exit 0, 80/80.
- After build, Git Bash npm run test:scripts: exit 0, 80/80.
- npm run typecheck: exit 0.
- git diff --check: exit 0.
- npm run verify: exit 1 at mcpb:check because node_modules/@anthropic-ai/mcpb/dist/cli/cli.js is absent (MODULE_NOT_FOUND). Before that stop, the shared run recorded build exit 0, core 263/263, GUI 352/352, HTTP 61/61, scripts 80/80, all-workspace typecheck exit 0, protocol smoke 224/224, and headless smoke PASS. This unrelated environment failure is preserved; no dependency was added.

The local Node v24.15 environment does not reproduce Node 20's literal-glob failure with the old command, so the GitHub log remains the exact pre-fix Windows evidence. The portable launcher passes in both PowerShell/npm and Git Bash/npm contexts.

## Risks and follow-up

The launcher intentionally includes only direct regular files whose names end in .test.mjs; nested files remain out of scope by the existing scripts/*.test.mjs contract. A future addition at that path is automatically included. The missing mcpb CLI is outside CORE-038 and remains for its owning remediation/environment setup; this PR does not absorb it.

## Merged-main verification

After merge, rerun npm run build, npm run test:scripts under Windows npm and Git Bash, npm run typecheck, git diff --check, and npm run verify. Confirm the scripts step remains 80/80 and preserve any independent mcpb or hosted-runner evidence exactly.
