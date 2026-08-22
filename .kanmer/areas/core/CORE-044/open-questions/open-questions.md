# Open questions — CORE-044 source-fetch remediation

All product questions that would otherwise block planning are resolved or explicitly parked below. No unchecked question remains above the parked section.

## Resolved bounded choices

- [x] **Query-bearing URLs:** Reject query strings on declared and linked llms.txt URLs instead of attempting field-level redaction; this is the only deterministic way to keep unknown credentials out of board/cache/provenance data.
- [x] **Redirect policy:** Follow only a bounded number of same-origin HTTPS redirects, validating each Location before the next request; reject cross-origin, credential-bearing, fragment, and non-HTTPS targets.
- [x] **Remote exposure:** Keep fetch_source usable through the existing local stdio path, but fail closed for loopback, link-local, private, and otherwise non-global destinations when remote HTTP exposure is enabled. The same policy applies after every redirect.
- [x] **Empty selectors:** Treat an explicitly empty areas/labels selector as absent/global, matching FRD-027 and existing packet wording; one shared core schema owns this behavior.
- [x] **Content type:** Require a supported text/* or application/json media type; missing or unsupported types fail before caching.
- [x] **Source suite:** Add sources.test.mjs to the mandatory MCP test script rather than relying on a separate manual command.

## Parked (explicitly deferred)

- [x] **Live public/private DNS and rebinding proof:** A deterministic injected resolver will prove policy decisions; real DNS rebinding and private-network reachability remain INCONCLUSIVE because no safe external network fixture is authorized in preparation.
- [x] **Crash/kill-at-the-exact-write proof:** Atomic temp-plus-rename and cross-process lock tests prove the contract; a process killed at every OS write instruction is deferred because it would require a separate harness and offers no additional product behavior evidence.
- [x] **GUI source editor:** The current FRD/ADR scope requires GUI/setup preservation and explicit confirmation for discovery, while set_sources is the shared MCP/headless declaration surface. A GUI editor would be a separate UX ticket unless governance is amended; no GUI feature is silently claimed here.
- [x] **Cache migration/history erasure:** Existing cache files are treated as derived local data and ignored/cleaned going forward; retroactively rewriting prior Git history or migrating every user cache is deferred as an operational release task.
- [x] **Full linked-document freshness protocol:** Revalidate bounded linked pages where validators are available and retain explicit stale/failure metadata; a complete independent validator model for every linked site is deferred because it would exceed this remediation's bounded contract.
