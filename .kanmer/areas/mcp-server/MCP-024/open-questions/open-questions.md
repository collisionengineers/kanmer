# Open questions — MCP-024

All schema and workflow decisions are resolved.

- [x] **Where is the review record stored?** — `scratch/review.md`, addressed as `scratch/review`.
- [x] **How is it written?** — Whole-file `set_ticket_doc`, never `append_scratch`; use `expected_version` on rewrites.
- [x] **What is `plan_hash`?** — Exactly the content-version returned for `get_ticket_doc(doc:"plan")` (`plan/plan.md`).
- [x] **How are frontmatter fields parsed later?** — With `gray-matter`, never regex.
- [x] **What are the review top-level fields?** — `kind`, `pr`, `head_sha`, `verdict`, `reviewer`, `independent`, `plan_hash`, `ticket_updated`, `findings`.
- [x] **What finding dispositions exist?** — `open`, `fixed`, `rejected-with-reason`, `accepted-risk`, `deferred-to-ticket` with the documented reason/ticket requirements.
- [x] **Where is proof stored?** — `proof/proof.md`, addressed as bare `proof`.
- [x] **What are proof top-level fields?** — `kind`, `merged_sha`, `environment`, `verified_at`, `result`, `attempts`.
- [x] **Which proof results exist?** — `PASS`, `FAIL`, `INCONCLUSIVE`, `NOT_APPLICABLE`, `WAIVED_BY_OPERATOR`.
- [x] **May later success erase a failed attempt?** — No. Attempts remain chronological and retained.
- [x] **Do record contents become hard gates now?** — No. Gates remain existence-based; skills/gate consumers enforce choreography later.
- [x] **Which stale descriptions are corrected?** — Both MCP source blurbs and all tool-reference statements using `scratch-<slug>`.
- [x] **Does this ticket modify skills or FRD-006?** — No. SKILL-021 and DOC-011 own those changes.

## Parked (explicitly deferred)

No questions are parked.
