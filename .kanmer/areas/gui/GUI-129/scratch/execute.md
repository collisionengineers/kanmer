2026-08-24 — Execution packet obtained from the current origin/main bundled MCP because the installed packaged v0.3.3 server does not expose get_execution_packet. Packet was ready for GUI-129; worktree .worktrees/gui-129 at origin/main 9a75bd690a80bf070bb8ddc372b3a95fa03ec789, branch gui-129-windows-settings-rename-retry.

Baseline: npm test -w @kanmer/gui -- --run src/main/settings.test.ts (cwd .worktrees/gui-129) exited 0: 1 file, 5 tests passed. This is a clean focused baseline; it does not reproduce the intermittent external Windows lock.
