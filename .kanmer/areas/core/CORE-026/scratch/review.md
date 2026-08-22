---
kind: review-attestation
pr: "163"
head_sha: "8eff8482926d29f7c80211b768fcffbb22d399d5"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T09:00:21.497Z"
findings:
  - id: F-001
    severity: blocker
    summary: "fetch_source validates an enriched ResolvedSource against the strict declaration schema"
    disposition: open
    reason: "The handler passes the object returned by resolveSources (which includes availability, reason, and declarationOrder) to validateLlmsSource; SourceDeclarationSchema.strict rejects those keys. A temp-board MCP invocation confirmed every valid fetch_source call returns isError with unrecognized_keys before network access. Validate only the kind/id declaration or make the validator accept the resolved shape, and add an MCP fetch_source regression."
  - id: F-002
    severity: major
    summary: "llms.txt aggregate byte policy is enforced after downloading linked responses"
    disposition: open
    reason: "fetchLlmsTxt calls fetchText for each candidate before checking bytes + response size against maxBytes. A deterministic fixture with a root at roughly 2 MiB plus one linked 2 MiB response downloaded 4194301 bytes against a 2097152-byte policy, although the linked document was then discarded. Enforce the remaining budget while reading the response and add an over-budget network-byte regression."
  - id: F-003
    severity: minor
    summary: "Research packet still names superseded FRD-026 and ADR-0019 after renumbering"
    disposition: open
    reason: "research/research.md says FRD-026 and ADR-0019 were created, but the linked/current governing docs and plan are FRD-027 and ADR-0020. This stale traceability conflicts with the report's statement that renumbering was corrected; update the research record to the current refs."
---
# Independent review — CORE-026

## Verdict

NEEDS-CHANGES. The source schema/resolver shape, guarded MCP registration, setup-preserving board schema path, tool-reference and skill synchronization, and declared-source trust boundary are scoped correctly. However, the fetch MCP surface is not operationally valid yet (F-001), and the bounded aggregate network policy is exceeded before enforcement (F-002). The research packet also needs a stale governing-document reference cleanup (F-003).

## Hosted evidence

- PASS: repaired head `8eff8482926d29f7c80211b768fcffbb22d399d5`; GitHub Actions run `32563742650` — `verify` PASS (2m26s), `kanmer-gate` PASS (55s).
- Preserved prior hosted failure: run `32563585675` failed `verify` because `packages/mcp-server/src/smoke.mjs` still expected 34 tools while the server exposed 37; `kanmer-gate` passed. The current head includes the smoke-count repair.

## Local evidence

- PASS (exit 0): focused core source tests, 5/5.
- PASS (exit 0): bounded MCP source tests, 5/5.
- PASS (exit 0): full `npm test`: core 288/288, GUI 382/382, MCP HTTP 68/68, scripts 88/88; manual freshness included.
- PASS (exit 0): `npm run typecheck` for core, MCP, UI, and GUI.
- PASS (exit 0): core/browser build and MCP server/standalone build.
- PASS (exit 0): protocol smoke 46/46, plugin synchronization, manual freshness, docs/skills verification, and `git diff --check`.
- FAIL/blocked behavior reproduced: a temp-board MCP call to `fetch_source` with a valid declared HTTPS source returns Zod `unrecognized_keys` for `availability`, `reason`, and `declarationOrder` before network access.
- FAIL/blocked budget behavior reproduced: a deterministic root-plus-link fixture caused 4194301 downloaded bytes against the 2097152-byte aggregate limit; the linked document was discarded only after the download.

## External boundaries

Connected-provider, installed-plugin, packaged-update, live external llms.txt, and visual GUI evidence remain INCONCLUSIVE; this review makes no claim for those boundaries.

No merge, move, or cleanup was performed.
