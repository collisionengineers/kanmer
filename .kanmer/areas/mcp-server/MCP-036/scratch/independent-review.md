# Independent review — MCP-036 PR #108 (2026-08-21)

## Changes reviewed

PR #108 is based on MCP-025's transport branch and changes only `packages/mcp-server/src/http.ts` and `http.test.mjs`. It moves canonical project fingerprint resolution before `httpServer.listen()`, reuses the captured fingerprint in readiness, wraps bind/address failures in rollback, and adds a no-board child-process regression. The change does not touch bearer authentication, tunnel adapters, GUI behavior, tool schemas, or unrelated lifecycle semantics.

## Checks

- PASS — `npm run test:http -w @kanmer/mcp-server`: 7/7, including the no-board child-process regression.
- PASS — `npm run build`: core and MCP ESM/standalone builds.
- PASS — `node packages/mcp-server/src/smoke-http.mjs`.
- PASS — `node packages/mcp-server/src/smoke.mjs`: 184/184.
- PASS — `node packages/mcp-server/src/smoke-protocol.mjs`: 42/42.
- PASS — `node packages/mcp-server/src/smoke-discovery.mjs`: 13/13.
- PASS — `npm run typecheck`: exit 0 across core, MCP, UI, and GUI.
- PASS — `git diff --check origin/mcp-025-streamable-http-finish...HEAD`.
- PASS — worktree is clean after builds.

## Blocking comment

1. **Blocking — pre-bind resolution failure still leaks the constructor timer.** `start()` now calls `const fingerprint = await projectFingerprint()` before entering the `try/catch` that invokes `rollbackStart()`. When project/root resolution rejects, the listener is correctly absent, but `rollbackStart()` is bypassed and the constructor-created sweep interval remains active. Direct runtime probe against PR #108 from a boardless temporary cwd reported `httpServer.listening === false` and `sweepTimer._destroyed === false`. This violates MCP-036's own plan step 3/acceptance (“no resource remains”), the checklist's “roll back every partial startup resource,” and the bounded lifecycle requirements in FRD-025/ADR-0017. The failed host must destroy the timer and remain safely/idempotently closeable; add a regression for the failure path.

   Disposition: filed blocking review-follow-up ticket [[MCP-037]], which blocks MCP-036. No merge or stage move performed.

## Non-blocking observations

- The main defect from the MCP-025 review—binding before project resolution—is fixed by this PR.
- Bind/address failures inside the new `try/catch` correctly invoke rollback.
- The child-process regression proves clean process exit/no readiness, but it does not observe the host's timer, so it missed this embedded-host leak.

## Verdict

**NEEDS CHANGES — do not merge PR #108 until MCP-037 is fixed, independently reviewed, and verified.**
