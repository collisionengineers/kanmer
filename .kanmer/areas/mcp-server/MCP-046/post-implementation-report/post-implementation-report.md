---
kind: post-implementation-report
ticket: MCP-046
result: PASS
---

## Outcome

The native Antigravity descriptor uses a quote-free delayed-expansion command: `cmd.exe /d /v:on /s /c setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\Kanmer\\bin&&call kanmer-mcp.cmd`. This keeps the agy-compatible argv form while making a local-appdata path containing spaces safe. It captures the provider workspace before the temporary pushd; the installer-owned shim restores that workspace before MCP starts, preserving ADR-0012 board discovery. GUI Connect derives and validates the same invocation; Codex's separate quoted contract is unchanged.

## Verification

The embedded-quoted form failed a real agy bound session because cmd.exe received the quote characters literally. A direct unquoted path failed a Windows command test with a spaced LOCALAPPDATA. The delayed-expansion descriptor reached a disposable shim at that path and reported both the original provider workspace marker and KANMER_ARGV_SPACE_OK. A regression executes the shipped installer shim logic with a disposable resolver/child and proves its final CWD is the provider workspace. The earlier final installed native plugin proof called the real Kanmer get_status tool and returned exactly KANMER_AGY_FINAL_PUSHDCALL_OK. Deterministic checks pass: Antigravity config regression 4/4, installer launcher tests 4/4, GUI connect tests 35/35, script rail 98/98, plugin:check, GUI typecheck, and git diff --check. The full GUI Vitest rail was attempted and failed with unrelated Windows EPERM cleanup/timeouts in index.sync.test.ts and kanmerGit.test.ts; that failure remains recorded rather than hidden.

## Scope and residuals

The implementation changes the Antigravity provider helper, its GUI fixtures, the native descriptor, installer launcher cwd restoration, plugin-sync validator, dependency-free regressions, FRD-012, ADR-0018, and AGENTS.md. Claude/Grok descriptors and Codex's quoted launcher remain unchanged. The proof used no credentials or board content and left no temporary fixture.
