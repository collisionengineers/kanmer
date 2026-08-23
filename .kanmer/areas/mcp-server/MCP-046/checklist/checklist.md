# Checklist — MCP-046

- [x] Update the native Antigravity descriptor to the exact agy-compatible launcher argv.
- [x] Add plugin-sync validation and regression coverage for accepted and rejected quoting forms.
- [x] Run the real agy bound get_status probe with the installed launcher/runtime and retain safe output.
- [x] Run plugin:check, focused script tests, typecheck/build, and git diff --check.
- [x] Write the post-implementation report and link the exact evidence.
- [ ] Stop at Review for independent review; do not self-merge.

## Evidence notes

- Shipped quoted descriptor: real agy bound session failed before MCP initialize because cmd.exe received the embedded quote characters literally.
- Temporary corrected descriptor plus the exact installer-owned launcher: agy plugin install succeeded and a bound session returned KANMER_AGY_GET_STATUS_OK with exit 0.
- Focused config regression: 2/2; plugin:check: PASS; typecheck: PASS; test:scripts: 96/96; build: PASS; git diff --check: PASS.
