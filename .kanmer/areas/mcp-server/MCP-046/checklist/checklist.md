# Checklist — MCP-046

- [x] Update the native Antigravity descriptor to the exact agy-compatible launcher argv.
- [x] Add plugin-sync validation and regression coverage for accepted and rejected quoting forms, including a spaced LOCALAPPDATA command test.
- [x] Preserve the provider workspace cwd across the quote-free temporary pushd and prove the shipped installer shim restores it before MCP launch.
- [x] Run the real agy bound get_status probe with the final installed plugin and launcher/runtime; retain safe output.
- [x] Run plugin:check, focused script tests, typecheck/build, and git diff --check.
- [x] Write the post-implementation report and link the exact evidence.
- [ ] Stop at Review for independent review; do not self-merge.

## Evidence notes

- Shipped quoted descriptor: real agy bound session failed before MCP initialize because cmd.exe received the embedded quote characters literally.
- Direct unquoted launcher: Windows command test failed when LOCALAPPDATA contained spaces.
- Delayed-expansion descriptor: Windows command test reached a disposable shim under a spaced LOCALAPPDATA path and reported the original provider workspace marker plus KANMER_ARGV_SPACE_OK.
- Shipped installer shim regression: disposable resolver/child proved final CWD and provider marker both remain the provider workspace after the temporary pushd.
- Final installed plugin plus bound agy get_status: exact KANMER_AGY_FINAL_PUSHDCALL_OK, with --dangerously-skip-permissions used only to avoid the non-interactive permission prompt.
- Focused config regression: 4/4; installer launcher tests: 4/4; GUI connect.test.ts: 35/35; script rail: 98/98; plugin:check: PASS; GUI typecheck: PASS; git diff --check: PASS.
- Full GUI Vitest attempted; unrelated Windows EPERM cleanup/timeouts in index.sync.test.ts and kanmerGit.test.ts are retained as a failed rail.
