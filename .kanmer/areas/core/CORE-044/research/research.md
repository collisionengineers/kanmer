# Research — CORE-044: CORE-026 source-fetch remediation

## Question

Which smallest, evidence-backed remediation closes the unresolved CORE-026 / PR #163 correctness, security, persistence, and verification findings without adding a new source feature, GUI redesign, provider migration, or broader crawler?

## Baseline and authoritative context

- CORE-044 is a Preparing fix ticket linked to and blocking CORE-026. CORE-026 is Review at PR #163, head b5ae6f36; its prior F-001 enriched-resolver validation and F-002 streaming aggregate-budget fixes are already present and locally/hosted verified, but the source test file is not part of the authoritative npm test:http list.
- FRD-027 defines project-declared MCP, plugin, and llms.txt preferences; declarations are not authority, installation, authentication, or enablement. It requires HTTPS, same-origin, depth-one, 32-page, 2 MiB, timeout, content checks, validator-aware cache, redacted diagnostics, GUI/setup preservation, and deterministic rails.
- ADR-0020 makes the preference-not-authority boundary binding: host observations remain outside board trust, llms.txt is bounded documentation retrieval, removed declarations are excluded immediately, and skills do not become a second contract.
- Current packages/mcp-server/src/sources.ts follows redirects automatically and checks only the final response URL; it parses markdown links before applying a direct-page cap, rejects fragments instead of normalizing them, permits missing content type, writes cache JSON with a process-local promise map, and does not return a final URL for relative-link resolution. Current set_sources reads and rewrites a whole board without a board-content CAS. packages/mcp-server/package.json test:http omits sources.test.mjs.
- Current packages/core/src/types.ts owns the declaration schema, while packages/mcp-server/src/index.ts recreates a looser input schema. Current core resolver treats empty selector arrays as matching nothing, and duplicate detection uses raw declaration strings.

## Review-finding inventory (PR #163)

The following 21 automated findings were read from the PR comments and mapped to the packet. F-001 and F-002 from the prior independent review are already fixed on b5ae6f36; the equivalent remaining comments are still covered by regression and rail work below.

| Finding | Evidence / risk | CORE-044 disposition |
|---|---|---|
| Per-hop redirect validation | redirect: follow can issue a cross-origin hop before the final URL check | Fix with bounded manual redirects; validate every Location before issuing the next request. |
| set_sources board concurrency | whole-board read/write can overwrite a GUI or agent edit | Fix with a board-content/version CAS at the core/store seam and a guarded MCP input. |
| Cache atomicity | process-local serialization does not protect two MCP processes or a crash | Fix with the shared core atomic-write primitive plus cross-process lock/claim and bounded stale-lock recovery. |
| Canonical tool roster | AGENTS/tool reference and generated surface need the three source tools | Fix the canonical roster and synchronization evidence in this ticket. |
| Aggregate while reading | the first remaining-budget fix can spend the budget and then leave bytes unchanged on failure | Fix by charging consumed bytes or terminating the candidate walk after an over-budget read; add network-byte evidence. |
| Root credential-bearing query | query strings can persist signed/token URLs in board/cache data | Reject query-bearing declared llms-txt URLs in the shared schema; do not attempt redaction of unknown secrets. |
| Linked credential-bearing query | linked candidates can reintroduce token-bearing URLs | Reject query-bearing linked candidates before fetching or persisting them. |
| Root 304 and linked freshness | root 304 currently extends all cached linked documents indefinitely | Fix with bounded linked-document revalidation or explicit per-document freshness metadata; never claim fresh linked content from root-only 304. |
| Board Git cache leakage | source cache bytes under .kanmer/data can be staged and retained in history | Add the cache directory to board ignore/reconciliation and bounded cleanup; cache remains local derived state. |
| Remote SSRF | authenticated remote fetch_source can read private or loopback HTTPS targets | Fix with local-only policy or a per-request public-destination preflight that rejects loopback, link-local, private, and otherwise non-global addresses; preserve same checks across redirects. |
| Empty selector arrays | accepted empty arrays currently match no context despite the global-selector contract | Treat present empty selector arrays as absent/global, or reject them; choose one shared schema contract and test it. |
| Canonical URL identity | equivalent URL spellings can evade duplicate detection and share cache identity | Normalize safe HTTPS URLs before duplicate keys/cache identity; retain one canonical representation. |
| Redirect-relative links | links are resolved against the declared URL, not the validated final root URL | Return the validated final URL from fetchText and use it as the root link base. |
| Image page-budget consumption | image syntax is included before the 32-page slice | Match documentation links only, or filter images before applying the page cap. |
| Fragment links | fragment-bearing links are discarded before fragment removal | Remove fragments, then same-origin-check and deduplicate the page URL. |
| Unavailable-source skill use | research prose can tell agents to use unknown/unavailable entries | Say available entries are consulted and unavailable/unknown entries are recorded as skipped. |
| Source test rail | sources.test.mjs is not in test:http or verify | Add it to the mandatory MCP test command and record its exit in the report. |
| Duplicated MCP schema | server input schema can drift from core declaration constraints | Derive the registered tool input from the exported core schema, preserving one authority. |
| Missing content type | an absent Content-Type is accepted as document text | Require a supported text/JSON content type for fetched documents. |
| GUI acceptance ambiguity | automated review reads criterion 7 as requiring a GUI editor | Reconcile the contract: set_sources is the explicit headless/agent surface, GUI/setup must preserve declarations; no new editor is added here unless governance changes. |

## Implications

- The implementation is a bounded hardening pass across the existing core schema/store, MCP fetch/cache boundary, board reconciliation, skills/tool reference, and deterministic test rail. It does not add discovery, provider migration, GUI source editing, authentication, or arbitrary filesystem/network access.
- Security boundaries must fail closed before bytes or credentials are persisted. A query-bearing source is rejected rather than “redacted” because the system cannot know which query fields are secrets.
- Cache state is derived local data, not board intent. Atomic writes, cross-process coordination, ignore/reconciliation, and cleanup must be tested separately from declaration resolution.
- F-001/F-002 existing fixes remain baseline evidence but must be retained in the new mandatory source suite; this ticket does not revert or duplicate them.

## Evidence limits

- No live external llms.txt site, private-network probe, multi-process GUI race, crash-at-write, or packaged update is available in this preparation environment. Deterministic injected fetch, DNS, filesystem, and concurrent-writer fixtures will prove the bounded contracts; any live or packaged boundary remains INCONCLUSIVE.
