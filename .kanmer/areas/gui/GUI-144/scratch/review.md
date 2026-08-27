---
kind: review-attestation
pr: "294"
head_sha: "50ff61cce20c0ad76a443160716d817f724d30fb"
verdict: needs-changes
reviewer: "claude-gui144-delta-reviewer"
independent: true
plan_hash: "0c1490e992725887"
ticket_updated: "2026-08-27T21:05:55.479Z"
board_sha: "2f3b832e16432ac209ff0c423694e5b39f9f29e1"
threads_snapshot:
  total: 12
  unresolved: 3
  ids: [PRRT_kwDOT2PEds6c-TE2, PRRT_kwDOT2PEds6c-TE8, PRRT_kwDOT2PEds6c-TFC, PRRT_kwDOT2PEds6c-TFH, PRRT_kwDOT2PEds6c-TFN, PRRT_kwDOT2PEds6c-TFP, PRRT_kwDOT2PEds6c-TFT, PRRT_kwDOT2PEds6c-TFa, PRRT_kwDOT2PEds6c-TFd, PRRT_kwDOT2PEds6c-tpD, PRRT_kwDOT2PEds6c-tpF, PRRT_kwDOT2PEds6c-tpI]
  unresolved_ids: [PRRT_kwDOT2PEds6c-tpD, PRRT_kwDOT2PEds6c-tpF, PRRT_kwDOT2PEds6c-tpI]
findings:
  - id: F-001
    severity: major
    summary: "Required check `verify` red at the merge commit: fixture hand-injected lease_* keys the CORE-115 store already writes (duplicate YAML key, ticketCount 1 not 2)."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "'Open project' on a non-selected card called window.kanmer.openProject directly; App tab/board state never updated. (Codex PRRT_kwDOT2PEds6c-TE2)"
    disposition: fixed
  - id: F-003
    severity: minor
    summary: "registryRename/Remove/SetPolicy handlers accepted any endpoint name; selected-project rule was renderer-only. (Codex PRRT_kwDOT2PEds6c-TFH)"
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "redactRemoteOrigin diverged from the server's project-identity.ts for SCP origins; kanmer-loc-v1 fingerprints differed from list_projects. (Codex PRRT_kwDOT2PEds6c-TFC)"
    disposition: fixed
  - id: F-005
    severity: minor
    summary: "registryAddProject persisted the preference branch as boardBranch for non-git projects. (Codex PRRT_kwDOT2PEds6c-TFd)"
    disposition: fixed
  - id: F-006
    severity: minor
    summary: "Add-this-project used upsert, silently replacing an existing endpoint name. (Codex PRRT_kwDOT2PEds6c-TFN)"
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "claims() counted expired claims as 'Active controllers'. (Codex PRRT_kwDOT2PEds6c-TFP)"
    disposition: fixed
  - id: F-008
    severity: minor
    summary: "Writer uses an open-coded tmp+rename without core's Windows EPERM/EBUSY retry. (Codex PRRT_kwDOT2PEds6c-TFT)"
    disposition: accepted-risk
    reason: "writeFileAtomic (packages/core/src/io.ts) is not exported from @kanmer/core; importing it is a core change outside this GUI-only lane. The stale-edit guard refuses the rename on a changed file; a spurious EPERM surfaces as a retryable error."
  - id: F-009
    severity: note
    summary: "Renderer repeats the endpoint-name regex in JSX (ProjectRegistry.tsx:176). (Codex PRRT_kwDOT2PEds6c-TFa)"
    disposition: accepted-risk
    reason: "Main re-validates with assertEndpointName at the IPC boundary; the renderer copy only gates button enablement and the contract test pins the grammar against the server module."
  - id: F-010
    severity: note
    summary: "Mutations baseline on a fresh read, not the registry version shown; in-process queue does not serialise two GUI instances. (Codex PRRT_kwDOT2PEds6c-TE8)"
    disposition: accepted-risk
    reason: "Queue plus re-read guard resolves the single-writer race MCP-054 F-001 named; cross-instance and stale-UI windows affect registry metadata only, never a board."
  - id: F-011
    severity: note
    summary: "GUI mirrors the server registry contract rather than importing it."
    disposition: accepted-risk
    reason: "Server package ships no d.ts and the GUI's composite tsconfig refuses cross-package source imports; contract tests load both server source modules at runtime and prove parity. Parked in open-questions."
  - id: F-012
    severity: note
    summary: "AGENTS.md section 8 gotcha 16 still describes the server writer helpers as being for the GUI."
    disposition: accepted-risk
    reason: "Documentation-only wording outside the packet's file list; one-line follow-up when AGENTS.md is next touched."
  - id: F-013
    severity: major
    summary: "Regression from the F-002 fix: Settings stays mounted across App.openProject with `draft` initialised once from project A (Settings.tsx:80, no key/reset in App.tsx:1942-1960); Save then writes A's board config into the newly active project B through saveBoard (App.tsx:753-755). The path also bypasses requestOpen's dirty-editor guard (App.tsx:696-702). A registry card thereby enables a cross-project board mutation, which FRD-029 forbids. (Codex PRRT_kwDOT2PEds6c-tpD)"
    disposition: open
  - id: F-014
    severity: minor
    summary: "assertSelectedEndpoint (projectRegistry.ts:370) takes the first `selected` endpoint only; when the registry validly names the same logical project twice, controls on the later selected card always fail with REGISTRY_NOT_SELECTED. Accept any selected match or refuse duplicate logical registrations. (Codex PRRT_kwDOT2PEds6c-tpF)"
    disposition: open
  - id: F-015
    severity: minor
    summary: "'Open project' stays enabled for health `missing-board`/`invalid` (ProjectRegistry.tsx:98); openProjectLocked calls store.init() (main/index.ts:698ff) so a stale registry pointer silently becomes a fresh empty board at that path. Disable unless the board is observable. (Codex PRRT_kwDOT2PEds6c-tpI)"
    disposition: open
---

# Review — GUI-144 (PR #294 at 50ff61cc), delta round

Independent delta review by a fresh reviewer (not the implementer, not the prior reviewer). Ticket in Review; plan version `0c1490e992725887`; ticket `updated` 2026-08-27T21:05:55.479Z. Branch rebased onto origin/main 3dd48d37 (f811952f) plus remediation 50ff61cc. Diff vs main: 13 files, all in `apps/gui/**` and `docs/manual/**`; nothing under `packages/*` or `plugins/*`. The `App.tsx` change is exactly one prop (`onOpenProject={openProject}`, App.tsx:1959).

## Prior findings verified at 50ff61cc

- F-001: `projectRegistry.test.ts:66-76` captures the record `takeTicket(..., provider: "claude-code")` returns and `:215-228` asserts the observed lease equals it field by field (id, revision 1, phase implementing, workspace, heartbeat, expiry); the expired legacy claim strips minted `lease_*` (`:83`). Health assertions unchanged (`:197` ok, `:232` unassigned, `:271` both). Controllers assertion tightened, not weakened. Hosted `verify` success.
- F-002: `ProjectRegistry.tsx:105-111` requires `onOpenProject`; `:174` calls it; `Settings.tsx:60-61,78,254` threads it; `App.tsx:1959` passes `openProject`. Renderer test `ProjectRegistry.test.tsx:50-52` makes the raw bridge throw, `:93-95` and `:147-165` prove the App path is used and the section follows the new `projectId`.
- F-003: `main/index.ts:1149-1168` — handlers take non-null `projectId`, `assertRemoteProjectId`, `requireCtx`, then `assertSelectedEndpoint(await registryView(projectId), name)`; `projectRegistry.ts:369-373` throws `REGISTRY_NOT_SELECTED`. Unit test `:319-333`, renderer refusal test `:167-175`.
- F-004: `projectRegistry.ts:150-163` is byte-identical logic to `packages/mcp-server/src/project-identity.ts:56-72`; probe is `git config --get remote.origin.url` in the board path (`:167`), same as server `index.ts:274`. Contract test `:137-163` imports the server module, asserts equality on 10 probes and identical `kanmer-loc-v1` fingerprints for three origins.
- F-005: `entryForContext` (`projectRegistry.ts:380-388`) records `boardBranch` only when `available && boardRoot && branch`; test `:335-344`.
- F-006: `ProjectRegistryWriter.add` (`:444-450`) throws `REGISTRY_NAME_EXISTS`; handler uses it (`index.ts:1141`); test `:382-390`.
- F-007: `classifyLease` (`:217-231`) uses core `leaseState` with `claimState` fallback; only `state === "live"` populates controllers (`:246`); `heartbeatStale` surfaced (`ipc.ts:228-229`, card `:39`); test `:296-315`.
- F-008..F-012: accepted-risk unchanged; corresponding Codex threads replied to and resolved.

## Local verification (cwd `.worktrees/gui-144`, head 50ff61cc)

- `npm run typecheck -w @kanmer/gui` exit 0.
- `npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx --root apps/gui` 22/22 pass.
- `npm test -w @kanmer/gui` 52 files / 515 tests pass, exit 0; no kanmerGit host flakiness observed.
- `npm run check:manual` exit 0 (22 chapters up to date); `npm run verify:docs` exit 0 (PASS).

## Checks (required: `verify`, `kanmer-gate`; conversation resolution required)

Run 33115961602 at 50ff61cc: `verify` success, `kanmer-gate` success after the controller's re-run with the board in Review, `regate` skipped (not required). Both required checks are green. PR `mergeStateStatus: BLOCKED` because three review threads remain unresolved (F-013..F-015).

## New findings

Codex posted three threads against the new head. F-013 is confirmed by reading the code and is a regression introduced by the F-002 remediation: `Settings` is rendered unkeyed with `draft` from `useState(() => structuredClone(board))`, so after "Open project" switches the active client, pressing Save writes the previous project's board configuration into the newly opened one. Because this is exactly the cross-project mutation the ticket's "Why" and FRD-029 rule out, it is major and blocks merge. A minimal fix is in App.tsx (close Settings and route the open through `requestOpen`, or key `Settings` by `root`), with a renderer/App test proving Settings does not survive the switch with a stale draft. F-014 and F-015 are minor and straightforward to fix in the same pass.

## Verdict

`needs-changes`. Not merged; ticket stays in Review. Re-review requires a new head fixing F-013 (F-014/F-015 recommended), the three open threads dispositioned, and a fresh attestation bound to that head.
