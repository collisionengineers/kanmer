# Checklist — CORE-026

- [ ] Add and test validated BoardConfig source declarations/selectors with kind-specific HTTPS and duplicate checks.
- [ ] Add and test pure selector/priority/availability resolution with explicit connected MCP and installed plugin observations.
- [ ] Add guarded get_sources and set_sources MCP tools with exact read/write annotations and expected-project behavior.
- [ ] Implement and test guarded bounded llms.txt fetch/cache with same-origin depth/page/byte/timeout/validator limits.
- [ ] Prove removed declarations are absent from effective resolution even when old bounded cache bytes remain.
- [ ] Update MCP tool reference and research/planning skills with source lookup, provenance, and no implementation-time re-invocation.
- [ ] Add MCP protocol/smoke/plugin-sync coverage for the new tools and published surface.
- [ ] Run focused core/MCP tests and record exact exits in scratch/report.
- [ ] Run core/browser build, MCP typecheck/build, relevant full rails, and diff checks; preserve first failures.
- [ ] Write post-implementation report, push branch, open ticket-linked PR, confirm gates, and move only Implementing→Review.

## Progress notes

Research and governing-doc decisions are recorded in research/research.md and open-questions/open-questions.md.
