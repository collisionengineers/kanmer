---
kind: post-implementation-report
ticket: MCP-046
result: PASS
---

## Outcome

The native Antigravity descriptor now passes the installer-owned launcher as one unquoted percent-variable argv token, matching agy's Windows command runner. plugin:check validates the exact command/argv shape and the dependency-free regression rejects the former embedded-quote form.

## Verification

The real host experiment retained the failure of the merged quoted form and the success of the corrected form: with the exact launcher present, agy plugin install processed one MCP server and a bound agy --add-dir session invoked the real Kanmer get_status tool, returning KANMER_AGY_GET_STATUS_OK with exit 0. Deterministic checks passed: config tests 2/2, plugin:check, build, workspace typecheck, test:scripts 96/96, and git diff --check.

## Scope and residuals

Only plugins/kanmer/mcp_config.json, scripts/check-plugin-sync.mjs, and the dependency-free config regression changed. The launcher path, board-branch environment, Claude/Grok descriptor, GUI provider code, and installer implementation remain unchanged. The temporary launcher/runtime used for proof was removed after the run; no credential or board content is retained.
