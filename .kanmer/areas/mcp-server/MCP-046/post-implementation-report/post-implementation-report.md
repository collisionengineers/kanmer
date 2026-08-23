---
kind: post-implementation-report
ticket: MCP-046
result: PASS
---

## Outcome

The native Antigravity descriptor uses the quote-free `pushd %LOCALAPPDATA%\Kanmer\bin && call kanmer-mcp.cmd` token. This keeps the agy-compatible argv form while changing into the installer-owned directory first, so a local-appdata path containing spaces is safe. GUI Connect derives and validates the same invocation; Codex's separate quoted contract is unchanged.

## Verification

The embedded-quoted form failed a real agy bound session because cmd.exe received the quote characters literally. A direct unquoted path failed a Windows command test with a spaced LOCALAPPDATA; the final pushd/call token reached a disposable shim at that path and returned KANMER_ARGV_SPACE_OK. The final installed native plugin was then exercised with `agy --dangerously-skip-permissions --add-dir <project> --print ...`; it called the real Kanmer get_status tool and returned exactly KANMER_AGY_FINAL_PUSHDCALL_OK. Deterministic checks pass: Antigravity config regression 3/3, GUI connect tests 35/35, plugin:check, GUI typecheck, and git diff --check. The full GUI Vitest rail was attempted and failed with unrelated Windows EPERM cleanup/timeouts in index.sync.test.ts and kanmerGit.test.ts; that failure remains recorded rather than hidden.

## Scope and residuals

The implementation changes the Antigravity provider helper, its GUI fixtures, the native descriptor, plugin-sync validator, dependency-free regression, FRD-012, and AGENTS.md. Claude/Grok descriptors, Codex's quoted launcher, installer implementation, and board selection remain unchanged. The proof used no credentials or board content and left no temporary fixture.
