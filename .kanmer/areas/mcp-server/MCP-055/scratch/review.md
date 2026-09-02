---
kind: review-attestation
pr: "310"
head_sha: "e9ff3a5366a2a024df25223fc526c8058e242d14"
verdict: pass
reviewer: "independent-review-subagent"
independent: true
plan_hash: "d35d34571b93f06a"
ticket_updated: "2026-09-02T01:37:30.418Z"
board_sha: "bd4383a454483b75f9ff98eda62025ee9ac67cc8"
expected_reviewers:
  - "independent-review-subagent"
threads_snapshot:
  - source: github
    id: "IC_kwDOT2PEds8AAAABSAGG3A"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-006
findings:
  - id: F-001
    severity: note
    summary: "get_status's own tool description (index.ts:690) still says only that every result carries structuredContent.project; it does not mention the new structuredContent.result."
    disposition: accepted-risk
    reason: "The sentence remains truthful after the change, the plan's Step 1 explicitly bounded index.ts to the ok() builder, and the agent-facing contract document that clients read (tool-reference.md:98) was updated with the new shape. Recorded as residual documentation risk, not a defect."
  - id: F-002
    severity: note
    summary: "Successful responses roughly double in size: the payload now travels in both content[0].text and structuredContent.result (get_status measured at 3580 text bytes, so ~7 KB on the wire)."
    disposition: accepted-risk
    reason: "Declared and accepted in the plan's Constraints section as residual risk, and required by the MCP specification's guidance that a structured result SHOULD be mirrored in a text block. Large payloads (fetch_source, get_execution_packet, list_items) are affected proportionally; no tool has a size ceiling that this crosses, and both smokes plus the HTTP test pass unchanged at head."
  - id: F-003
    severity: note
    summary: "structuredContent is now always present on a successful result, where previously it was omitted entirely when lastProject was null. That is an externally visible shape change beyond the new field."
    disposition: accepted-risk
    reason: "Specified by the plan and disclosed in the post-implementation report. Independently confirmed no consumer depends on its absence: a repository-wide grep for structuredContent outside the generated bundle finds only mcp-server tests, errors.ts and index.ts, and SDK 1.30.0 validates structuredContent on neither the server (mcp.js:196 is reached only inside the tool.outputSchema branch) nor the client (client/index.js:485-496 is gated on tool.outputSchema); no tool declares one. All four negotiated protocol versions, including 2024-11-05, pass in smoke-protocol.mjs."
  - id: F-004
    severity: note
    summary: "Plan Step 4's live in-host Claude Code rendering observation was not performed; a raw JSON-RPC transcript against the rebuilt bundle stands in its place."
    disposition: deferred-to-ticket
    ticket: CORE-137
    reason: "An MCP server is bound at session start, so a session cannot observe a bundle rebuilt inside it. The deferral is stated truthfully and not claimed as done: the post-implementation report's Deviations item 1 says the observation 'was not performed; it is deferred', the checklist item carries the same adjustment note verbatim, and the report's 'For kanmer-verify' section item 7 carries the check forward. Recorded against CORE-137 (v0.4.1 release and promotion), which owns the promotion acceptance."
  - id: F-005
    severity: note
    summary: "Plan Step 2 asked for the smoke-protocol.mjs check to run on 'both transports'; that file's loop iterates protocol versions, not transports, so the new check runs four times over stdio only."
    disposition: accepted-risk
    reason: "Verified independently: PROTOCOLS is ['2025-11-25','2025-06-18','2025-03-26','2024-11-05'] and the file has no HTTP transport. The plan's intent is met by the file that actually exercises HTTP: the new assert.deepEqual(status.structuredContent.result, statusPayload) in http.test.mjs runs against the official SDK StreamableHTTP client. Both transports are covered; the plan's file attribution was simply wrong, and the deviation is disclosed in the report."
  - id: F-006
    severity: note
    summary: "Codex GitHub review bot posted a review-summary comment on the reviewed head (e9ff3a5) reporting its code review completed with no inline findings; there are zero inline review threads on the PR."
    disposition: accepted-risk
    reason: "The bot is not an expected reviewer and never a gate (kanmer-review 'Expected reviewers and the settle rule'; HZN-008 context.md, corrected 2026-09-01). Its comment raises no defect to remediate, and a GitHub issue comment has no resolvable thread state; branch protection's required_conversation_resolution counts review threads, of which the head has none. Recorded as evidence."
---

# Independent review — MCP-055, PR #310

Reviewed at head `e9ff3a5366a2a024df25223fc526c8058e242d14` against board tip
`bd4383a454483b75f9ff98eda62025ee9ac67cc8` (board worktree clean, local tip equal to
`origin/kanmer-board` at gather time), plan version `d35d34571b93f06a`, and ticket
`updated: 2026-09-02T01:37:30.418Z`. I am not the author; the code was reviewed from
`origin/MCP-055-structured-content-result` and executed in a disposable detached worktree
(`.worktrees/review-mcp-055`, removed after the run). Consolidated review, `review_round` 0.

## What changed

`ok()` in `packages/mcp-server/src/index.ts` now returns
`structuredContent: { result: data, ...(lastProject ? { project: lastProject } : {}) }` in place of
`...(lastProject ? { structuredContent: { project: lastProject } } : {})`. Six files, +44/-4:
the builder and its doc comment, three test files (additions only), one sentence in
`tool-reference.md`, and the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`.

The nesting under `result` rather than a top-level spread is the right call and I verified the
stated reason rather than accepting it: `ok()` has 50 call sites, `index.ts:957` passes a bare
array (`ok(warnings.length ? { items: summaries, warnings } : summaries)`) which cannot be spread
into a keyed object, and `get_status` (`:759`) and `get_execution_packet` (`:1173`) each build
their own richer `project` field inside the payload that a top-level spread would silently
overwrite. No call site passes `undefined`, `null` or a primitive, so the Step 1 deviation stop
does not trigger.

## Scope and do-not-modify list

Both honoured. `packages/mcp-server/src/errors.ts` is absent from the diff; no `outputSchema` was
added to any `registerTool` call; the `ToolResult` type is unchanged; there is no special-case
branch for `get_status` or `get_execution_packet`. `git diff main...HEAD` on
`smoke.mjs`, `smoke-protocol.mjs` and `http.test.mjs` produces zero removed lines, so no existing
assertion was weakened, moved or removed. FRD-029 is met: `structuredContent.project` keeps its
exact previous key, value and top-level position on both success and error paths.

## Acceptance checks, verified independently

All commands run by me at the PR head in `.worktrees/review-mcp-055` after `npm install`:

| Command | Result |
|---|---|
| `npm run build` | exit 0 |
| `node --test packages/mcp-server/src/http.test.mjs` | exit 0 |
| `node packages/mcp-server/src/smoke.mjs` | exit 0 — 383/383 |
| `node packages/mcp-server/src/smoke-protocol.mjs` | exit 0 — 54/54 |
| `npm run plugin:check` | exit 0 — `plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.0, isolated MCP handshake lists 41 tools` |

The four new checks appeared by name and passed: `an error result's structuredContent carries no
result key (MCP-055)` reporting `["error","project"]`; `structuredContent.result mirrors the text
payload for a read, a write and get_status (MCP-055)` reporting `[true,true,true]`; and the
`get_status structuredContent.result mirrors its text payload` check on each of `2025-11-25`,
`2025-06-18`, `2025-03-26` and `2024-11-05`, each reporting `["result","project"]`.

I confirmed the new checks are load-bearing rather than vacuous: each compares a `JSON.stringify`
of the parsed text block against `JSON.stringify(structuredContent.result)`, so on the pre-change
shape the right side is `undefined` and the check fails.

The regenerated bundle is genuine, not hand-edited: extracting `ok()` from
`plugins/kanmer/mcp/kanmer-mcp.cjs` at head yields exactly the new shape, at `main` exactly the
old one, and `plugin:check` reports `bundle bytes match` against a fresh build of the source.

Required checks on the exact head: `verify` **pass** (8m56s, run 33580084971).
`kanmer-gate` failed on that run for exactly two reasons, both artefacts of gathering before this
record existed — `WRONG_STAGE` (the remote board still showed `implementing`) and
`NO_REVIEW_RECORD` — with every other gate check passing, including `WRONG_TARGET`,
`DEPENDENCY_BLOCKED` and `COMMITS_UNREACHABLE`. It is re-run after this attestation is pushed.

## Findings and dispositions

Six findings, all `note`, none open. F-001 (the `get_status` description sentence), F-002
(doubled response bytes), F-003 (`structuredContent` now unconditional), F-005 (the
`smoke-protocol.mjs` transport-vs-version deviation) and F-006 (the Codex bot comment) are
accepted risk with the reasons recorded in the frontmatter. F-004 (the deferred in-host Claude
Code rendering observation) is deferred to CORE-137.

On the three author-reported deviations I was asked to check rather than accept: all three are
stated truthfully. The in-host observation is described in the report as "was not performed; it is
deferred" and the checklist item carries that note verbatim instead of claiming the observation
happened — it is not passed off as done. The `smoke-protocol.mjs` transport claim holds up: the
HTTP path is genuinely covered by the new `http.test.mjs` assertion against the official SDK HTTP
client. The always-present `structuredContent` change is disclosed in both the plan and the
report, and I confirmed no repository consumer or SDK code path depends on its absence.

No blocker or major finding, no security, data-loss or destructive risk, and nothing out of the
ticket's packet scope. Verdict `pass`.

## Residual risk carried forward

Successful responses are roughly twice the bytes they were (F-002). `structuredContent` is now
unconditional on success (F-003). The in-host Claude Code rendering confirmation — the observation
that closes the loop on the reported symptom — is still owed at promotion under CORE-137 (F-004),
and the report's `For kanmer-verify` section carries it as item 7. Adding an `outputSchema` later
would turn this shape into a validated contract across all 41 tools; that remains a deliberate
future decision, out of scope here.
