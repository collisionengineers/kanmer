# CORE-039 post-implementation report

## Change summary

The release-notes regression test now runs against a disposable fixture representing documented ticket CORE-027/PR #96 instead of assuming the operator's .worktrees/kanmer board exists. The release-notes script accepts KANMER_BOARD_ROOT only as an explicit isolated-board override; default main-checkout discovery remains unchanged for release operators.

## Files changed

- scripts/release-notes.mjs — opt-in KANMER_BOARD_ROOT override, default behavior unchanged.
- scripts/release-notes.test.mjs — creates and removes a temp board fixture with the documented CORE-027 Done/PR #96 data, passes the override, and preserves both canonical-link assertions.

No package dependencies, board data, release publishing behavior, or unrelated CI rails changed.

## Governing-doc alignment

docs_todo is true. This is a bounded test-rail repair under AGENTS.md's clean-environment verification rule; no new FRD/ADR is needed. The production path remains main-checkout .worktrees/kanmer discovery unless the explicit environment seam is supplied.

## Verification evidence

- Hosted pre-fix PR #145 run 32543323809 / job 96957305137: clean Windows checkout reached scripts/release-notes.test.mjs and failed with "No board at D:\\a\\kanmer\\kanmer\\.worktrees\\kanmer — nothing to draft from."; 79/80 script tests passed.
- Pre-build local launcher run: 78/80 because generated core dist was absent; preserved as environmental first failure.
- npm run build: exit 0.
- node --test scripts/release-notes.test.mjs: exit 0, 1/1.
- npm run test:scripts: exit 0, 80/80.
- npm run typecheck: exit 0.
- git diff --check: exit 0.
- npm run verify: exit 1 at mcpb:check because @anthropic-ai/mcpb/dist/cli/cli.js is unavailable in this environment; prior rails passed core 263/263, GUI 352/352, HTTP 61/61, scripts 80/80, typecheck, protocol 224/224 and headless smoke. This failure is preserved and not weakened.

## Risks and follow-up

The environment override is opt-in and resolves relative paths against the script checkout; normal release invocations cannot silently switch boards. The fixture is deleted in a finally block even when assertions or the child process fail.

## Merged-main verification

After merge, rerun npm run build, npm run test:scripts, npm run typecheck, git diff --check, and npm run verify on clean Windows and Git Bash contexts. Confirm release-notes remains 80/80 and preserve any independent mcpb or hosted-runner failures.
