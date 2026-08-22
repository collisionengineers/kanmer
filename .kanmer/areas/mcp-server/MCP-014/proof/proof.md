# MCP-014 proof

## Merged implementation

- PR #132 merged squash on main as cb8fa1f0; implementation commit ff41f518b5805b1c308ab251ab8305e3b1ae1e9d is reachable from main.
- Scope: Grok native user-scoped plugin registration, functional inspect/get_status proof before cleanup, symmetric uninstall checks, and legacy Kanmer residue cleanup. MCP-015 dispatch/binding scope was not changed.

## Deterministic verification

- Focused providers/connect tests: 92/92 PASS.
- GUI build: PASS.
- GUI typecheck: PASS.
- check:manual: PASS (22 chapters up to date).
- verify:skills: PASS (all checks).
- git diff --check: PASS.
- Execution lane reported full GUI 350 tests, scripts, workspace typecheck, build, and manual rails PASS.

## Evidence boundary

A clean authenticated Grok host install plus functional get_status call and unambiguous post-uninstall inspect were unavailable: no XAI_API_KEY was available and pre-existing user plugin state makes host inspection ambiguous. Status: INCONCLUSIVE (not claimed as PASS). Keep MCP-014 in Verifying until named-host acceptance evidence is supplied.

## Merged-main verification rerun — 2026-08-22

- PR #132 merge commit cb8fa1f0a746b2c47722eb0ca644bf4d91599a77 is reachable from main af61144ce743f74b2aba92fb0778588b0b9bedd0; source commit ff41f518b5805b1c308ab251ab8305e3b1ae1e9d remains reachable.
- npm test -w @kanmer/gui — PASS, 37 files / 352 tests.
- npm test -w @kanmer/core -- --testTimeout=30000 — PASS, 12 files / 263 tests.
- npm run typecheck — PASS.
- npm run build — PASS (core and MCP server/standalone).
- npm run plugin:check — PASS: 34 tools, bundle bytes and manifests synchronized.
- npm run check:manual — PASS, manual up to date (22 chapters).
- npm run verify:skills — PASS.
- git diff --check — PASS.
- Aggregate npm test — FAIL: 351/352 GUI tests; kanmerGit.test.ts no-op branch test timed out and its temporary directory cleanup hit Windows EPERM. The separate GUI rerun passed 352/352. The failure is preserved and no assertion was weakened.

## Evidence boundary

The real Grok clean-project install plus authenticated get_status call and unambiguous post-uninstall inspect remain INCONCLUSIVE. No XAI_API_KEY was available, and pre-existing user plugin state reports Kanmer after uninstall. Inspect/list output alone is not functional proof. MCP-014 remains Verifying pending named-host acceptance; no Done move or release was performed.
