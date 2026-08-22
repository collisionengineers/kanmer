# Files — CORE-044 source-fetch remediation

## Change map

| Path / module | Planned change | Main risk and proof |
|---|---|---|
| packages/core/src/types.ts | Make source URL/selector constraints canonical: safe URL normalization, no query-bearing llms.txt declarations, duplicate identity, and the chosen empty-selector contract. Export the schema pieces needed by MCP. | Board round-trip must reject secret-bearing/duplicate entries without changing unrelated config; core tests prove exact parsed output and errors. |
| packages/core/src/sources.ts | Align selector matching and source keys with the canonical contract; keep unavailable/unknown states explicit. | Empty/global selectors and equivalent URLs must resolve deterministically; pure tests prove no host/file/network access. |
| packages/core/src/io.ts, index.ts, store.ts, board.ts | Expose/reuse atomic cache-safe persistence and add a content/version CAS seam for board mutations, including set_sources. Add board cache ignore/reconciliation if this is the existing setup seam. | Two writers must not silently overwrite a newer board or expose partial cache JSON; injected races and atomic-write tests prove failures surface. |
| packages/mcp-server/src/sources.ts | Implement manual bounded redirects with per-hop origin/public-destination checks; use validated final URL for relative links; reject query-bearing linked URLs; filter images and normalize fragments; require content type; enforce aggregate bytes including failed reads; revalidate linked documents or retain explicit freshness state; use core-backed atomic/cache coordination and redacted diagnostics. | This is the trust boundary. Injected redirect, DNS, stream, content-type, validator, URL, and concurrent-write fixtures prove fail-closed behavior and byte/page/time limits. |
| packages/mcp-server/src/index.ts | Derive set_sources input from core; carry board-content/version CAS; keep expected_project guard; make fetch_source local-only or enforce public destination checks at every request; preserve exact read/write annotations. | Tool schemas and concurrency errors must match core and never overwrite unrelated board edits; MCP protocol tests cover annotations and structured failures. |
| packages/mcp-server/package.json / root package.json / scripts/verify.mjs | Register sources.test.mjs in the authoritative MCP test path and ensure verify invokes the same suite once. | A source regression must fail npm test/verify; command output and exit code are recorded. |
| plugins/kanmer/skills/kanmer-research/SKILL.md | State that only availability=available declarations are consulted and unknown/unavailable entries are recorded as skipped with provenance. | Skill prose must match resolver output; verify-skills/plugin-sync pass. |
| plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md and AGENTS.md managed roster | Keep the 37-tool canonical roster and source-tool descriptions synchronized with registered tools. | Plugin sync and managed-block verification prove no tool drift. |
| .kanmer board setup/reconciliation seam and generated ignore policy | Keep .kanmer/data/sources local/derived and out of board Git staging/history; clean retired cache entries within bounded scope. | Synthetic board sync/ignore fixture proves cache files are not staged while declarations remain. |
| docs/functional/frd/FRD-027-project-declared-sources.md and docs/architecture/adr/ADR-0020-project-declared-source-trust.md | Only if required by review reconciliation, clarify that GUI/setup preserves declarations and the MCP set_sources surface is the explicit editor for this release; do not add a GUI feature. | Governing traceability is reviewed against the final diff; no silent acceptance-contract change. |
| packages/core/src/* tests and packages/mcp-server/src/sources.test.mjs / smoke tests | Add regression cases for all selected boundaries, including F-001/F-002 and mandatory suite registration. | Exact exits, no weakened assertions, and full relevant rails. |

## Context files an implementer must read

| Context | Constraint |
|---|---|
| FRD-027 and ADR-0020 | Preferences are not authority; bounded same-origin documentation is not a crawler; no install/auth/enable/auto-trust. |
| packages/core/src/types.ts, board.ts, store.ts, io.ts | Core is the single schema/store/atomic-write authority; preserve unrelated board fields and use optimistic content versions. |
| packages/mcp-server/src/index.ts and expected-project guard | Mutations must retain write annotations and project guard; remote exposure is a security boundary. |
| packages/mcp-server/src/sources.ts and current source tests | Existing F-001/F-002 fixes, cache format, validator semantics, and injectable fetch seam must remain intact. |
| package scripts, scripts/verify.mjs, .github workflows | The new source suite must be part of the authoritative rail, not a manual side command. |
| kanmer-research SKILL.md and tool-reference.md | Agents consult available declarations only; tool roster and choreography are generated/synchronized contracts. |
| CORE-026 packet and PR #163 comments | The 21-finding matrix in research.md is the bounded acceptance inventory; no unrelated GUI/provider redesign. |

## Ripple effects

- Core schema/store changes affect board fixtures, GUI setup reconciliation, MCP set_sources, browser-safe build, and expected-project tests.
- Fetch boundary changes affect source cache files, protocol smoke, HTTP exposure policy, and plugin bundle bytes.
- Test-script changes affect npm test, npm verify, hosted PR checks, and the post-implementation report.
- Skill/tool roster changes affect generated plugin synchronization and AGENTS managed-block verification.

## Deliberately out of scope

- New GUI source editor/discovery UX, provider registration migration, installation/authentication/enablement, OAuth, remote transport redesign, arbitrary filesystem reads, general web crawling, or unrelated CORE-026 feature work.
- A live external-site or packaged-update claim; those remain INCONCLUSIVE unless independently available.

## Execution base

The implementation worktree is based exactly on CORE-026 review head `b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477` (PR #163), not bare origin/main. The remediation branch is `core-044-source-fetch-remediation` in .worktrees/core-044. This keeps the remediation diff reviewable against the still-unmerged CORE-026 implementation.
