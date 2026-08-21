# Checklist — DOC-018

## Scope

- [x] Cherry-pick the reviewed hardening onto merged PR-122 main.
- [x] Keep changes limited to the three manual/verifier surfaces and generated artifact.
- [x] Preserve provider-neutral boundaries; MCP-028 remains deferred.

## Verification

- [x] `npm run build` passes.
- [x] `npm run verify:docs` passes with 26 ids, links/anchors, fences, canary, and provider-boundary checks.
- [x] `npm test` passes: core 256, GUI 337, HTTP 61, scripts 66.
- [x] `npm run typecheck`, GUI build, and `git diff --check` pass.
- [x] Independent review passed and merged-main proof is recorded.
