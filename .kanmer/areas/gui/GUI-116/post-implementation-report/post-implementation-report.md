# GUI-116 post-implementation report

## Outcome

Implemented GUI-116 at commit `d863f390cabf385e6a6889b3cfc0d0ba3edb3792` on branch `gui-116-closed-provider-refresh`, based on `core-043-protection-retarget` head `69ca8883f1acb7762926fb543791117967940ab1`. The branch is pushed and the PR targets `core-043-protection-retarget`.

After `ensureBoardWorktree` establishes a reopened project's board root and branch, `openProject` now runs the existing provider-owned reconciliation for Codex, Claude, and OpenCode. A malformed or failed provider registration is retained in the project's visible paused sync error. Per-project last-known branch state is persisted; a branch change observed while the project was closed records a durable Grok/Antigravity reconnect requirement. The Settings Git tab explains the user-scoped native boundary and explicit reconnect action. Successful explicit native Connect clears only that provider's requirement. No native CLI/plugin installation is invoked during reopen, and no other project is mutated.

## Verification evidence

- `npm exec vitest -- run apps/gui/src/main/index.sync.test.ts`: PASS, 7/7. This includes:
  - closed-project reopen reconciles a stale Claude registration and retains Grok/Antigravity reconnect state;
  - malformed closed-project registration pauses and surfaces the provider failure;
  - existing branch-change reconciliation remains green;
  - inherited Git mismatch/Retry/handoff regressions remain green.
- `npm exec vitest -- run apps/gui/src/main/settings.test.ts apps/gui/src/main/index.sync.test.ts`: PASS, 10/10.
- `npm run typecheck`: PASS for core, mcp-server, ui, and gui.
- `npm run build -w @kanmer/gui`: PASS.
- `npm run build -w @kanmer/core`: PASS.
- `npm run verify:docs`: PASS — manual current, links/fences/provider boundaries valid.
- `npm run test:scripts`: PASS, 89/89, after the required core build.
- `git diff --check`: PASS.
- Full `npm test -w @kanmer/gui`: exit 1 with 48 files and 425/426 tests passing. The sole failure is the pre-existing Windows cleanup race in `src/main/kanmerGit.test.ts`: `renameBoardBranch > is a no-op when the name already matches` timed out in its 10-second hook and then `rmSync` reported `EPERM, Permission denied: \\?\\C:\\Users\\Alex\\AppData\\Local\\Temp\\kanmer-git-0EipVt`. The GUI-116 focused file is green; no GUI-116 test failed.
- Native Grok/Antigravity live host installation, credentials, and functional proof remain INCONCLUSIVE by design. Reopen does not make that external claim or mutate user-scoped plugin state.

## Scope and review boundary

Changed only GUI reopen/provider status behavior, its production-caller regressions, shared status/settings types, and the two governing FRD clarifications. Native ownership, protected branch policy, unrelated project isolation, and provider installation semantics remain unchanged. Independent review is required; the author will not merge this PR.

## Post-merge proof

Intentionally not supplied in this author lane.
