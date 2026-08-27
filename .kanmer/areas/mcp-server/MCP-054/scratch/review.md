---
kind: review-attestation
pr: "292"
head_sha: "fe612e6d3d1c6fdcbdb54b439d5bd1eded6f03dc"
verdict: pass
reviewer: "claude-mcp054-independent-reviewer"
independent: true
plan_hash: "22c0ebcabc02a87b"
ticket_updated: "2026-08-27T19:51:42.108Z"
board_sha: "afa71613fae1831592c1669d17b6bcf1c71fdae5"
threads_snapshot:
  - thread: "PRRT_kwDOT2PEds6c9Vv2"
    comment: 3875322854
    finding: "F-001"
  - thread: "PRRT_kwDOT2PEds6c9Vv5"
    comment: 3875322860
    finding: "F-002"
  - thread: "PRRT_kwDOT2PEds6c9Vv-"
    comment: 3875322869
    finding: "F-003"
  - thread: "PRRT_kwDOT2PEds6c9VwD"
    comment: 3875322874
    finding: "F-004"
findings:
  - id: F-001
    severity: minor
    summary: "upsertEndpoint is a read-modify-write with no cross-process lock; concurrent GUI registrations could drop one another (Codex, project-registry.ts:325-335)"
    disposition: deferred-to-ticket
    ticket: GUI-144
    reason: "The writer is exported but unwired in this PR (no MCP tool, no GUI caller); GUI-144 is the only planned caller and owns the write path, so the lock/CAS belongs there."
  - id: F-002
    severity: minor
    summary: "endpointMatches compares project_id only, so several boards of one logical project would all report bound (Codex, project-registry.ts:197)"
    disposition: accepted-risk
    reason: "Allocation sets board_id equal to project_id (unit test asserts a.project.board_id === a.project.project_id); no code path yet produces two boards under one project_id. Revisit when a second-board flow exists."
  - id: F-003
    severity: minor
    summary: "isAbsolute accepts win32-style paths on POSIX so a foreign-style KANMER_ENDPOINT_REGISTRY value would be read relative to cwd (Codex, project-registry.ts:106-109)"
    disposition: accepted-risk
    reason: "The value is spawn-time operator configuration, never request-supplied, so AC5 is not weakened; the effect is a misconfigured registry read at a cwd-relative path reported as registry.error/exists=false. Cheap platform-native check for a follow-up."
  - id: F-004
    severity: minor
    summary: "claims() runs over includeArchived:false, so an archived-but-still-taken ticket's workspace is invisible (Codex, project-registry.ts:225)"
    disposition: accepted-risk
    reason: "Archived tickets are outside the active roster by board convention and ticketCount is documented as active; an archived live claim is an operator anomaly the registry view is not asked to surface by FRD-029."
  - id: F-005
    severity: note
    summary: "Readiness events (http-ready, remote-ready, owner file) gain project_id/board_id/identity while version stays 1"
    disposition: rejected-with-reason
    reason: "Not a defect: additive fields only; the sole consumer (apps/gui/src/main/remoteAccess/manager.ts:268-270, 689-690, 784-785) duck-types named fields and matches on projectFingerprint. No version bump required."
  - id: F-006
    severity: note
    summary: "Legacy-fingerprint fallback in endpointMatches cannot false-match two legacy boards at different paths"
    disposition: rejected-with-reason
    reason: "kanmer-proj-v1 hashes the canonical boardRoot (project-identity.ts:41,45); different paths yield different fingerprints and one path cannot host two boards."
  - id: F-007
    severity: note
    summary: "AGENTS.md line ~205 tree comment still says 20 tools (pre-existing; report deviation 5)"
    disposition: accepted-risk
    reason: "Pre-existing and unrelated to the roster count; the section 4 roster line is correct at 39."
---

# Review — MCP-054 (PR #292 @ fe612e6d)

Independent review; implementer was a different agent (`claude-code`). Reviewed the full diff `origin/main...fe612e6d` (16 files) against the plan (version 22c0ebcabc02a87b), FRD-029 AC4/AC5 and the post-implementation report.

## Scope and lanes

Diff touches only `packages/mcp-server/**`, docs, the plugin bundle, and the generated manual mirror `apps/gui/src/renderer/src/manual/chapters.generated.ts` (regeneration required by the plan). No `packages/core` source and no GUI source changed (CORE-115/GUI-144 lanes respected).

## Scrutiny points

1. `project-registry.ts`: registry path only from `KANMER_ENDPOINT_REGISTRY` or `<home>/.kanmer/endpoints.json` (`registryLocation`, 108-117); `parseRegistry` enforces `schema: 1` and object `endpoints`; invalid entries are kept and reported as `health: "invalid"` (`invalidObservation`, `observeEndpoint` 210-211). `observeEndpoint` uses a throw-away `KanmerStore` and calls only `exists`, `detectFormat`, `getBoardWithSource`, `getProject`, `listItemsWithWarnings` — verified in core that all are read-only (`store.ts:201,266,347,356,541`; `readProjectRecord` project.ts:49; `readBoardWithSource` board.ts:252); no `init()`/`ensureProject`. The unit test's before/after snapshot walks the whole fixture home (paths, sizes, contents) and is asserted after every observation kind. `writeRegistry`/`upsertEndpoint` are imported nowhere in `index.ts`.
2. `index.ts`: `list_projects` is the 39th tool, `readOnlyHint: true`, input `{ name?: string }` only; handler calls `resolveProject()` (own project) and `observeRegistry` with fresh stores — `lastProject` untouched. `boundProject()` resolves root then `resolveProject()`. `resolveLocationFor` is root-parameterised; `resolveLocation` delegates so `get_status` output is unchanged.
3. Readiness: additive, `version: 1` unchanged — acceptable (F-005).
4. Fingerprint fallback: no cross-path false match (F-006).
5. Smoke AC4 block spawns a second stdio server on `sandboxB`; the cross-project check asserts `WRONG_PROJECT` on both endpoints and byte-identity of both `TICK-001` (A) and the B ticket file; the no-path-schema check runs `tools.tools.every(...)` over the full roster with 8 path-like keys and pins `list_projects` properties to exactly `name`.
6. Deviation 1: `smoke-http.mjs` now deep-equals the sorted remote roster to `remoteHttpToolNames()` and asserts `list_projects` in / `dispatch_task` out — strictly stronger than the stale `=== 30` literal.
7. Docs: tool-reference row present; AGENTS.md section 4 = 39 and gotcha 16 added; connect.md 39 + "Named endpoint registry" subsection; manual chapter regenerated; `plugin:check` reports 39 tools, bytes match.
8. Core/GUI lanes untouched (see Scope).

## Independent verification (cwd `.worktrees/mcp-054`, head fe612e6d)

| Command | Result |
| --- | --- |
| `npm run build -w @kanmer/mcp-server` | 0 |
| `node --test packages/mcp-server/src/project-registry.test.mjs` | 5/5, 0 |
| `node packages/mcp-server/src/smoke.mjs` | 290/290, 0 |
| `npm run smoke:protocol` | 50/50, 0 |
| `npm run test:http -w @kanmer/mcp-server` | 0 on first run (no ETIMEDOUT quirk reproduced) |
| `npm run smoke:http` | 0 |
| `npm run plugin:check` | 0 — 39 tools match, bundle bytes match |
| `npm run typecheck` | 0 |

## Checks

Run 33109883385 at fe612e6d: `verify` success; `kanmer-gate` initially FAILURE (ran 19:44Z, before the board push that moved MCP-054 to Review at 19:51Z); reran failed jobs → `kanmer-gate` success. Both required checks (`verify`, `kanmer-gate`) green. Branch protection requires conversation resolution; the four Codex threads are dispositioned above and resolved with a reply.

## Residual risk

Registry writer concurrency (F-001) and the POSIX path check (F-003) are the real residuals; neither weakens AC4/AC5 since the writer is unwired and the path is operator-supplied at spawn time.
