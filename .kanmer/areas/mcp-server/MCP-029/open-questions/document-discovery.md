# Open questions — MCP-029

All implementation-shaping questions are resolved for planning.

- [x] **Should a bare type read concatenate named files?** — No. Preserve it as the conventional index read; discovery must return paths so content and version identity remain explicit.
- [x] **Where should discovery appear?** — Reuse the ticket-document metadata already computed for summaries, provided the MCP response can add it compatibly; otherwise use a small read-only listing surface rather than changing explicit reads.
- [x] **Does this overlap MCP-019?** — It complements it: this ticket supplies paths; MCP-019 reads selected paths efficiently.

## Parked (explicitly deferred)

- [ ] **Directory listings for arbitrary references/assets** — not part of typed pipeline-document discovery; revisit with attachment/reference browsing work.
