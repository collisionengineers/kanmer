# Checklist — CORE-026

- [x] Add and test validated BoardConfig source declarations/selectors with kind-specific HTTPS and duplicate checks.
- [x] Add and test pure selector/priority/availability resolution with explicit connected MCP and installed plugin observations.
- [x] Add guarded get_sources and set_sources MCP tools with exact read/write annotations and expected-project behavior.
- [x] Implement and test guarded bounded llms.txt fetch/cache with same-origin depth/page/byte/timeout/validator limits.
- [x] Prove removed declarations are absent from effective resolution even when old bounded cache bytes remain.
- [x] Update MCP tool reference and research/planning skills with source lookup, provenance, and no implementation-time re-invocation.
- [x] Add MCP protocol/smoke/plugin-sync coverage for the new tools and published surface.
- [x] Run focused core/MCP tests and record exact exits in scratch/report.
- [x] Run core/browser build, MCP typecheck/build, relevant full rails, and diff checks; preserve first failures.
- [x] Write post-implementation report, push branch, open ticket-linked PR, confirm gates, and move only Implementing→Review.

## Progress notes

Research and governing-doc decisions are recorded in research/research.md and open-questions/open-questions.md.


## Final verification notes

- Commit fab7b499 is pushed on core-026-project-declared-sources; PR #163 is open and linked.
- PASS: focused core source tests 5/5; full core tests 288/288.
- PASS: bounded MCP source tests 5/5; full npm test (manual, core, GUI 382 tests, MCP HTTP 68 tests, scripts 88 tests) exit 0.
- PASS: core and MCP typechecks, core/browser and MCP builds, protocol smoke 46/46, headless smoke, verify-docs, verify-skills, plugin-sync, and git diff --check.
- Initial failures were retained and corrected: duplicate FRD-026 numbering (test:scripts exit 1, fixed with FRD-027/ADR-0020); invalid 304 fixture (source tests exit 1, fixed); stale bundle/plugin sync (exit 1, regenerated); protocol smoke expected 34 instead of 37 tools (42/46, assertion corrected).
- External connected-provider, installed-plugin, packaged-update, and live external llms.txt evidence are INCONCLUSIVE; no auto-trust, installation, authentication, or unbounded crawl is claimed.

- Hosted follow-up: e0a046be documents the bounded cache edge cases; PR #163 remains at Review while the corrected footer event is checked.

- Hosted verify remediation: corrected packages/mcp-server/src/smoke.mjs tool-count assertion from 34 to 37 in 8eff8482; focused local rails pass; hosted rerun pending.

- Hosted rerun 32563742650: kanmer-gate PASS (97009200164); verify PASS (97009200250); no scratch/review.md warning is expected for an author handoff.
