# Open questions

No unresolved implementation or user-choice question remains for this ticket.

## Resolved decisions

- [x] **Can Codex use a repo-relative path to the installed bundle?** No. The bundle is outside the repo and OpenAI Docs does not document an MCP config-file-relative base.
- [x] **What exact committed registration is used?** `cmd.exe /d /s /c "\"%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd\""`.
- [x] **Why not a bare `kanmer-mcp.cmd` on PATH?** A bare name can be shadowed by the trusted repository cwd and PATH changes are not visible to existing processes.
- [x] **Why not a native launcher executable?** It adds a new native toolchain without solving anything the fixed installer-owned shim and OS `cmd.exe` cannot solve.
- [x] **How does the shim find a custom installation directory?** HKCU `Software\Kanmer\InstallDir`, written and removed by the per-user NSIS lifecycle.
- [x] **Are `--root` and `--repo-root` retained?** No. Codex's workspace cwd feeds ADR-0012 discovery; real `get_status` proof is mandatory.
- [x] **Does Connect set `cwd`?** No. Omitting it preserves the host workspace cwd; setting it to the shim/install location would break discovery.
- [x] **Does Connect set `ELECTRON_RUN_AS_NODE`?** Not in committed TOML. The machine-local shim sets it for the installed child.
- [x] **What happens in GUI dev mode?** Codex Connect uses the installed shim if its `--probe` succeeds; otherwise it refuses without writing an absolute fallback.
- [x] **Do other providers migrate to the shim?** No. Their existing invocation and files remain unchanged and are pinned by regression tests.
- [x] **Does legacy cleanup need a new algorithm?** No expected production change. Old global entries retain roots; project registration presence is already the replacement signal. Add regression coverage.
- [x] **Does staleness detection need new behavior?** No expected production change. Rootless discovery registrations are already non-stale. Add an exact portable fixture.
- [x] **Is the portable file cross-platform?** It is portable across supported Windows installations. macOS/Linux are explicitly outside this Windows-only product ticket.
- [x] **When may `.codex/config.toml` be unignored?** Only in the same change after packaged two-location Codex tool-call proof passes.
- [x] **Who updates Pegasus?** A later consumer-repo change after release; GUI-094 never edits or commits Pegasus.

## Parked (explicitly deferred)

None.
