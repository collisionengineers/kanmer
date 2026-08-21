# Independent post-hoc review — MCP-019 / PR #87

## Scope and evidence

This is an independent post-hoc review of merged PR #87 against the complete MCP-019 ticket packet, linked governing reference `docs/functional/frd/FRD-022-mcp-server-surface.md`, the merged diff and PR discussion, and current `main` at `1962f02` (PR #104 merge). No stage, merge, ticket, or source changes were made.

Packet documents read: `MCP-019.md`, research, files, plan, checklist, open-questions, post-implementation-report, proof, and existing scratch notes. The packet records PR #87 merge commit `23c42e06...`, the additive single/batch contract, explicit downstream `MCP-023` deferral, and explicit legacy-layout/injected-I/O fixture deferrals.

The merged implementation was inspected in core document resolution, MCP request validation/handler code, tests, smoke/protocol coverage, tool-reference documentation, and the committed plugin bundle. Current checks:

- core `docs.test.ts`: 50/50 passed on current main
- core and mcp-server typechecks: passed
- `npm run build`: passed
- MCP stdio smoke: 184/184 passed
- discovery smoke: 13/13 passed
- protocol smoke: 42/42 passed across all supported protocol versions
- `npm run plugin:check`: passed (30 tools, bundle bytes, skill frontmatters/manifests)
- `git diff --check`: passed
- working tree remained unchanged apart from pre-existing untracked `skills-lock.json`

## Findings and dispositions

### P2 — format-1 legacy boards skip path validation (remediation candidate)

In current `packages/core/src/store.ts`, `getDocsWithVersions` returns the all-missing response for a located format-1 item before calling `docPathIn` on the requested document ids. This means an unsafe id can be accepted on a supported unmigrated legacy board, contrary to the packet's whole-request validation contract and the single/batch safety claim.

I reproduced this on current main with a temporary format-1 board and:
`get_ticket_doc({id:"TICK-001",docs:["plan","../../escape"]})`.
The call returned success and two normal missing entries, including `"../../escape"`, rather than rejecting the request before reads. The prior PR discussion contains the same concrete P2 concern.

Disposition: remediation needed as a follow-up candidate; no fix was made in this review. The packet explicitly deferred legacy-layout fixture coverage, but that deferral does not make the observed contract gap PASS.

### Accepted/deferred scope — not MCP-019 failures

The packet explicitly defers consuming the shared helper to `MCP-023`, and defers non-ticket/legacy-layout and injected-I/O fixture harness work. Those are recorded follow-ups rather than regressions in the merged additive batch behavior. The local plugin dependency-comment path variation is also documented as an environment artifact; the committed merged bundle is authoritative and `plugin:check` passes.

## Verdict

**PASS WITH FINDING** — the requested single/batch feature is wired and passes the current checks, with one independently reproduced P2 legacy-layout validation gap requiring follow-up.
