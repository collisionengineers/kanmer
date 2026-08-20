## 2026-08-20 — independent review

**Verdict: PASS.** This is an independent review of PR [#84](https://github.com/collisionengineers/kanmer/pull/84) at `43160fc4dbbcd85554ee7c2bc877c66f40af9333`.

### Changes reviewed

- Adds `docs/functional/frd/FRD-025-remote-access.md`: a 29-requirement remote-access contract for opt-in Streamable HTTP, one project per process, bearer-before-parsing, loopback/origin controls, bounded sessions, central remote exposure policy excluding dispatch, adapter lifecycle, and traceability to the EPIC-010 implementation and proof tickets.
- Adds `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md`: chooses one Streamable HTTP transport around the canonical registry, in-memory sessions, bearer-first remote mode, loopback/tunnel boundary, provider-neutral adapter/cloudflared first, and documents alternatives, consequences, and rollback.
- Updates `docs/README.md` only to index ADR-0017 and FRD-025. No implementation, secret, provider-registration, or generated-manual change appears in the diff.

### Checks and comments

- **Non-blocking / resolved:** The plan's FRD/ADR/index-only scope matches the exact three-file diff and the author report.
- **Non-blocking / resolved:** FRD-025 and ADR-0017 are uniquely numbered and indexed; standard docs/manual/script tests pass.
- **Non-blocking / resolved:** The transport contract agrees with the primary 2025-06-18 MCP transport source: one HTTP endpoint with POST/GET, optional session termination through DELETE, Origin validation, localhost binding, authentication, and stream/session behaviour delegated to the pinned SDK. The local bearer-first product policy and OAuth deferral are explicitly first-release product choices, not claims that OAuth is unavailable from the MCP specification.
- **Non-blocking / resolved:** No open questions remain, and there are no PR reviews, comments, or failing checks.
- **Known external limitation (not caused by this PR):** full typecheck remains blocked by the existing `packages/ui/src/demo.tsx` fixture missing `TicketDocsInfo.documentPaths`.

### Evidence

- `node scripts/check-doc-numbering.mjs` — PASS.
- `npm run check:manual` — PASS.
- `npm run test:scripts` — 50/50 PASS.
- `npm run verify:skills` — PASS.
- `git diff --check origin/main...HEAD` — PASS.
- PR metadata: clean merge state; no reviews/comments/check failures.

### Post-merge link ordering constraint

Do **not** call `link_doc` for dependent tickets while the new FRD/ADR exist only on the PR branch: MCP resolves repository document paths from its configured normal source checkout, where those paths do not yet exist. The correct order is: (1) merge PR #84; (2) fast-forward/pull the normal source checkout to the merge commit so its `repoRoot` contains both files; (3) freshly read each target ticket/version and its gates; (4) call `link_doc` with the merged paths; (5) reread targets/gates and record the result. No target-ticket link mutation was made during this review; DOC-012 itself moves only to Verifying and receives no proof/closeout here.
