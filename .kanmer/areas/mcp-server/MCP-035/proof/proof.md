# Proof — MCP-035

## Verified merge

- Main HEAD: ed8d390541a9564cdbdda609f493c953b27ed0c8.
- PR #110 merged the validation fix to main at cb35e7f424a2c187e4b66be40160942375c0f7d7.

## Passed evidence

- Author-targeted legacy/current invalid-ID regressions — PASS, 2/2.
- Core docs/store suites — PASS, 132/132.
- npm test on merged main — PASS, core 256/256 and all other suites green.
- npm run typecheck, npm run build, npm run plugin:check — PASS.
- node packages/mcp-server/src/smoke.mjs — PASS, 184/184.
- node packages/mcp-server/src/smoke-protocol.mjs — PASS, 42/42.
- node packages/mcp-server/src/smoke-discovery.mjs — PASS, 13/13.
- git diff --check — PASS.
- Independent review PASS recorded; merged diff was limited to the packet-listed store and regression-test files.

## Result

Format-1 and current-layout document reads validate unsafe absolute, traversal, and backslash IDs before any file access while preserving safe missing-document behavior and atomic batch rejection.
