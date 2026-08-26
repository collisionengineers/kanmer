# Checklist — DOC-027

- [x] Add PRD-002 with the authorized reliable-autonomy product rationale, success criteria and non-goals.
- [x] Add FRD-028 through FRD-035, each with one end-state capability and its mapped acceptance criteria.
- [x] Add ADR-0021 defining stable v0.3.12 control of the live board, candidate isolation, promotion and rollback.
- [x] Update `docs/README.md` to index PRD-002, ADR-0021 and FRD-028–035.
- [x] Inspect every added document for valid repository-relative links, honest draft status, single-capability scope and no machine-specific claims.
- [ ] Replace `docs_todo` with exact governing refs on DOC-027 and each HZN-008 member through Kanmer MCP after this documentation PR merges, because refs are validated against the integration checkout.
- [x] [pre-review] Run `rg --files docs/product/prd docs/functional/frd docs/architecture/adr`, `npm run verify:docs`, `npm run verify`, `git diff --check` and `git status --short`; record exact results.
- [x] [pre-review] Write the post-implementation report with all document paths, refs and command evidence.
- [ ] [pre-review] Stop at the documentation PR boundary; do not merge or start any dependent HZN-008 ticket.

## Progress notes

- 2026-08-26: Created PRD-002, FRD-028–035 and ADR-0021; updated `docs/README.md`. The final scope contains exactly those ten added docs plus the index.
- 2026-08-26: `npm run verify:docs` exited 0; `git diff --check` exited 0.
- 2026-08-26: First `npm run verify` attempt exited 1 before tests because this nested worktree inherited the dirty root checkout's `node_modules`; the worktree build resolved incompatible parent `@kanmer/core/dist` exports. Installed this worktree's lockfile dependencies with `npm ci --ignore-scripts` and retained the failure rather than masking it.
- 2026-08-26: Re-run `npm run verify` from the isolated DOC-027 worktree exited 0: build, 323 core tests, GUI tests, MCP/script smokes, typecheck, skill/AGENTS/plugin checks all passed.
- 2026-08-26: Wrote `post-implementation-report/post-implementation-report.md`; exact governing refs are intentionally deferred until merge makes the new documents available to the integration checkout.
