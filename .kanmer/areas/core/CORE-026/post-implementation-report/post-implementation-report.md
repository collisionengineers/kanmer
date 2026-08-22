# Post-implementation report — CORE-026

## Outcome

Implemented project-declared research sources on branch `core-026-project-declared-sources`, commit `fab7b4994b5b0c4f2eaf07a919cf6b6e06e7e763`. Pull request #163 is open: https://github.com/collisionengineers/kanmer/pull/163.

The project board now accepts validated `mcp`, `plugin`, and HTTPS `llms-txt` declarations with area/label selectors and priority ordering. Core resolution is pure and only treats explicitly observed connected/installed MCP/plugin capabilities as available. The MCP surface adds read-only `get_sources`, guarded `set_sources`, and guarded `fetch_source`; the latter writes only bounded cache data under `.kanmer/data/sources`. Retrieval enforces HTTPS, same-origin final redirects, depth one, at most 32 direct pages, 2 MiB aggregate bytes, 10-second request bounds, content checks, validator-aware 24-hour cache, SHA-256 metadata, serialized cache writes, and surfaced failures.

Governing documents are linked as `docs/functional/frd/FRD-027-project-declared-sources.md` and `docs/architecture/adr/ADR-0020-project-declared-source-trust.md`. Research/planning skill guidance and the MCP tool reference describe source provenance and explicitly prohibit installation, authentication, enablement, auto-trust, and implementation-time re-invocation.

## Scope and deviations

- In scope: board schema/resolver, MCP source tools, bounded llms.txt cache, deterministic tests/smokes, governing docs, tool/skill reference updates.
- Deliberately out of scope: GUI source editor, provider registration scanning/migration, external auto-trust/install/auth, remote transport changes, and arbitrary/unbounded crawling.
- External connected-provider, installed-plugin, packaged-update, and live external llms.txt evidence is INCONCLUSIVE in this local run; no claim is made for those boundaries.

## Verification (exact commands and exits)

- PASS (exit 0): `npm run typecheck` (core, MCP, UI, GUI).
- PASS (exit 0): `npm run build:core` including browser check; `npm run build:server`.
- PASS (exit 0): `npm test` — manual freshness, core 288/288, GUI 382 tests, MCP HTTP 68 tests, scripts 88/88.
- PASS (exit 0): `node --test packages/mcp-server/src/sources.test.mjs` — 5/5, including same-origin redirect, aggregate/cache bounds, validator handling, concurrent cache writes, and no-cache 304 failure.
- PASS (exit 0): `npm run smoke:protocol` — 46/46 across protocol versions; new tool annotations/count checked.
- PASS (exit 0): `npm run smoke:headless`.
- PASS (exit 0): `npm run verify:docs`, `npm run verify:skills`, `node scripts/check-plugin-sync.mjs`, and `git diff --check`.

## Preserved initial failures and dispositions

- `npm run test:scripts` first returned exit 1 because the new governing document was initially numbered FRD-026 while an existing FRD-026 already existed. The document was renumbered to FRD-027 with ADR-0020, board refs/plan were relinked, and the rerun passed 88/88.
- The first bounded-source test run returned exit 1 because Node rejects a body-bearing native Response with status 304. The fixture was corrected to a protocol-shaped 304 response; the rerun passed 5/5.
- `npm run smoke:protocol` first returned exit 1 (42/46) because its legacy assertion expected 34 tools after the three scoped tools were added. The assertion now checks 37 tools and the new annotations; rerun passed 46/46.
- `node scripts/check-plugin-sync.mjs` first returned exit 1 for the expected stale generated bundle. `npm run plugin:build` regenerated it; the final sync check passed.

## Review handoff

Status should move only one boundary to Review after the final `get_doc_gates CORE-026` readback. Author must not self-review or merge PR #163. Hosted GitHub checks were queued at handoff; their final outcome remains an independent-review/hosted-evidence responsibility.


## Hosted gate follow-up

- The first hosted run for PR #163 failed before source evaluation because the PR body sent literal backslash-n characters, so the event payload did not contain a standalone footer. The body was corrected to real newlines with a final standalone Kanmer: CORE-026 line; the existing event was retriggered, and the subsequent edge-case documentation commit e0a046be records the 304-without-cache and serialized-cache-write contract.
- New head: e0a046be; the PR remains Review-only and no merge/self-review/cleanup is authorized. Hosted verify/gate outcome is being observed after the fresh synchronize event.


## Hosted verification follow-up — 2026-08-22

- Hosted run 32563585675 initially failed in the authoritative verify job because packages/mcp-server/src/smoke.mjs still asserted the pre-source-tools count of 34 while tools/list correctly returned 37. This was a stale smoke assertion, not a source behavior failure.
- Fixed the assertion in commit 8eff8482 (tools/list returns 37), pushed to PR #163, and reran the focused smoke/prose/plugin rails locally: smoke:protocol 46/46, smoke:headless PASS, verify:docs PASS, verify:skills PASS, plugin-sync PASS, git diff --check PASS.
- Hosted kanmer-gate passes on the corrected PR body with standalone Kanmer: CORE-026; its no-scratch/review warning is expected because the author must not self-review. Hosted verify is awaiting the new head's result; no merge/self-review/cleanup is authorized.


## Hosted verification result — 2026-08-22

- Fresh hosted run 32563742650 for head 8eff8482926d29f7c80211b768fcffbb22d399d5 passed both jobs: kanmer-gate job 97009200164 PASS and verify job 97009200250 PASS (authoritative verification rail, 2m26s). The gate warning that no scratch/review.md attestation exists is expected because the author must not self-review.
- PR #163 is Review-ready at 8eff8482. CORE-026 remains Review-only for independent review; no merge, self-review, or cleanup performed.


## Independent review remediation — 2026-08-22

- F-001 fixed: fetch_source now strictly validates only the declaration fields from a resolver-enriched source, and regression coverage accepts the enriched ResolvedSource shape. The declaration schema remains strict; resolver metadata is not persisted or treated as declaration input.
- F-002 fixed: the bounded reader receives the remaining aggregate byte budget and enforces it while consuming response chunks; linked responses are cancelled once the total budget is exceeded rather than downloaded and discarded afterward. Added a deterministic over-budget stream regression.
- F-003 fixed: research traceability now names FRD-027 and ADR-0020 consistently; FRD-026 remains the unrelated OpenAI tunnel document.
- New source-focused rail: node --test packages/mcp-server/src/sources.test.mjs — 7/7 PASS. Full npm test — exit 0 (core 288/288, GUI 382/382, MCP HTTP 68/68, scripts 88/88); full npm run typecheck — exit 0. Rebuilt standalone/plugin bundle, smoke protocol 46/46, smoke headless, plugin sync, and diff check all pass locally.


## Review remediation handoff — 2026-08-22

- New head b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477 (PR #163) fixes review findings F-001/F-002: strict validation now projects declaration fields from resolver-enriched results, and fetch response chunks are bounded by the remaining aggregate byte budget. New focused source coverage is 7/7 PASS.
- F-003 research traceability is corrected to FRD-027/ADR-0020 via MCP. Final board gates remain passable for Review; hosted checks for b5ae6f36 are pending. Stop for independent re-review; no self-review/merge/cleanup.


## Hosted remediation verification — 2026-08-22

- Fresh run 32564155523 on b5ae6f36 passed kanmer-gate job 97010200239 (50s) and verify job 97010200322 (2m22s). The gate reported the prior independent review attestation head 8eff8482 did not match the remediation head; this is an expected stale-attestation warning until independent re-review refreshes it, not a source-rail failure.
- PR #163 remains Review-only for independent re-review. No self-review, merge, or cleanup performed.
