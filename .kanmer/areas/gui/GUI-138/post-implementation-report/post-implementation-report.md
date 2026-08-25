# Post-implementation report — GUI-138

## Result

The remote access manager now passes its owned, allowlisted Cloudflare readiness snapshot to the packaged doctor child. The snapshot contains only state, provider, attempt, timestamp, public endpoint, project fingerprint, and opaque auth generation; it contains no bearer, secret, credential content, or raw provider output.

## Files changed

- apps/gui/src/main/remoteAccess/manager.ts
- apps/gui/src/main/remoteAccess/manager.test.ts

## Verification attempts

1. FAIL — the first focused Vitest invocation used the repo-relative path after npm changed into the GUI workspace, so no test file was found.
2. FAIL — the first corrected focused run exposed a stale expected config generation in the new test; the test now refreshes the record after secret creation.
3. FAIL — the first GUI typecheck resolved stale workspace links and reported unrelated missing current core exports. Running npm ci in the ticket worktree restored worktree-local workspace links.
4. PASS — focused manager suite: 12/12 tests.
5. PASS — GUI workspace typecheck.
6. PASS — npm run build.
7. PASS — git diff --check.
8. PASS — full npm test: core 310/310, GUI 475/475, MCP HTTP/remote 102/102, scripts 111/111.
9. PASS — full npm run typecheck across all workspaces.

## Commit

9705b317 fix(gui): pass tunnel readiness to remote doctor

## Remaining verification

After independent review and merge, build and install the exact merge SHA, run the packaged public-mode doctor, and repeat the authenticated and unauthenticated public MCP probes.

## Review finding disposition

F-001 (major) — FIXED. Provider restart backoff now maps the manager to degraded rather than retaining ready/connected. The regression drives ready → restarting, asserts degraded manager state, and makes the doctor TUNNEL_PROCESS_READY result fail unless the snapshot is genuinely connected. Focused manager tests 12/12, GUI typecheck, full build, and git diff --check pass after the fix.

Additional commit: b9aad276 fix(gui): degrade tunnel state during restart

F-002 (major) — FIXED. The manager now retains the positive integer attempt emitted by its owned provider status and passes that exact attempt into the doctor snapshot. The restart regression emits attempt 2 and asserts the snapshot reports 2. Focused manager tests 12/12, GUI typecheck, and git diff --check pass.

Additional commit: b992a34e fix(gui): preserve tunnel restart attempt
