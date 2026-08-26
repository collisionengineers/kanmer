# Checklist — DOC-027

- [ ] Add PRD-002 with the authorized reliable-autonomy product rationale, success criteria and non-goals.
- [ ] Add FRD-028 through FRD-035, each with one end-state capability and its mapped acceptance criteria.
- [ ] Add ADR-0021 defining stable v0.3.12 control of the live board, candidate isolation, promotion and rollback.
- [ ] Update `docs/README.md` to index PRD-002, ADR-0021 and FRD-028–035.
- [ ] Inspect every added document for valid repository-relative links, honest draft status, single-capability scope and no machine-specific claims.
- [ ] Replace `docs_todo` with exact governing refs on DOC-027 and each HZN-008 member through Kanmer MCP.
- [ ] [pre-review] Run `rg --files docs/product/prd docs/functional/frd docs/architecture/adr`, `npm run verify:docs`, `npm run verify`, `git diff --check` and `git status --short`; record exact results.
- [ ] [pre-review] Write the post-implementation report with all document paths, refs and command evidence.
- [ ] [pre-review] Stop at the documentation PR boundary; do not merge or start any dependent HZN-008 ticket.

## Progress notes
