# Open questions — CORE-031

All load-bearing decisions are already fixed by MASTERPLAN S-01 and the ticket contract.

- [x] **What is the authoritative command order?** — Use, in order: `npm run build`; `npm test`; `npm run typecheck`; `node packages/mcp-server/src/smoke.mjs`; `npm run smoke:protocol`; `npm run smoke:discovery`; `npm run verify:skills`; `npm run verify:agents-block`; `npm run plugin:check`.
- [x] **Should `check:manual` also appear explicitly?** — No. `npm test` already executes it; a second entry would recreate duplicated verification.
- [x] **Should the shared rail rebuild committed plugin bytes?** — No. It runs `plugin:check` only, after `npm run build`; `plugin:build` remains a deliberate implementation/release operation.
- [x] **Should the release script invoke `npm run verify` as a subprocess or consume the same definition?** — Consume the exported `VERIFY_STEPS` array directly, preserving release-specific logging and post-gate flow while maintaining one command source.
- [x] **Does this ticket introduce CI or protection?** — No. CORE-032 adds the workflow and CORE-033 configures protection.

## Parked (explicitly deferred)

No questions are parked.
