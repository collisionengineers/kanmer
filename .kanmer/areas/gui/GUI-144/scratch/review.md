---
kind: review-attestation
pr: "294"
head_sha: "a9033ec2229c05819a6fa6a9e0cf3bf3b4bb0a12"
verdict: needs-changes
reviewer: "claude-gui144-independent-reviewer"
independent: true
plan_hash: "0c1490e992725887"
ticket_updated: "2026-08-27T20:36:07.303Z"
board_sha: "a938fbfabb4bd936d2a80e966990cdffdcb02e6b"
threads_snapshot:
  total: 9
  unresolved: 9
  ids: [PRRT_kwDOT2PEds6c-TE2, PRRT_kwDOT2PEds6c-TE8, PRRT_kwDOT2PEds6c-TFC, PRRT_kwDOT2PEds6c-TFH, PRRT_kwDOT2PEds6c-TFN, PRRT_kwDOT2PEds6c-TFP, PRRT_kwDOT2PEds6c-TFT, PRRT_kwDOT2PEds6c-TFa, PRRT_kwDOT2PEds6c-TFd]
findings:
  - id: F-001
    severity: major
    summary: "Required check `verify` is red at the merge commit: projectRegistry.test.ts:63 injects lease_* keys that the CORE-115 store (origin/main 3dd48d37) already writes, producing a duplicated YAML mapping key; the item drops with a warning and ticketCount is 1 not 2 (test line 159)."
    disposition: open
  - id: F-002
    severity: major
    summary: "'Open project' on a non-selected card calls window.kanmer.openProject directly (ProjectRegistry.tsx:162); App-level tab/board state is never updated, so the FRD-029 selection path the manual promises does not visibly change selection. (Codex thread PRRT_kwDOT2PEds6c-TE2)"
    disposition: open
  - id: F-003
    severity: minor
    summary: "registryRename/Remove/SetPolicy handlers (main/index.ts:1146-1160) accept any endpoint name; the selected-project-only rule is renderer-only, not enforced in main. (Codex thread PRRT_kwDOT2PEds6c-TFH)"
    disposition: open
  - id: F-004
    severity: minor
    summary: "redactRemoteOrigin (projectRegistry.ts:154) strips the SCP login (git@host:...) whereas the server's project-identity.ts:69 keeps it; kanmer-loc-v1 location fingerprints therefore differ between the GUI and list_projects for SCP origins. (Codex thread PRRT_kwDOT2PEds6c-TFC)"
    disposition: open
  - id: F-005
    severity: minor
    summary: "registryAddProject persists ctx.syncStatus.branch as boardBranch even when git status is unavailable (kanmerGit.ts:214-215 returns the preference branch), so non-git projects get a fictitious branch and a drift/sync probe. (Codex thread PRRT_kwDOT2PEds6c-TFd)"
    disposition: open
  - id: F-006
    severity: minor
    summary: "Add-this-project uses upsert (main/index.ts:1140), silently replacing an existing endpoint of the same name without confirmation. (Codex thread PRRT_kwDOT2PEds6c-TFN)"
    disposition: open
  - id: F-007
    severity: minor
    summary: "claims() (projectRegistry.ts:214-216) aggregates expired claims into controllers, which the card labels 'Active controllers'. (Codex thread PRRT_kwDOT2PEds6c-TFP)"
    disposition: open
  - id: F-008
    severity: minor
    summary: "Writer uses an open-coded tmp+rename (projectRegistry.ts:372-374) without the Windows EPERM/EBUSY retry of core's writeFileAtomic. (Codex thread PRRT_kwDOT2PEds6c-TFT)"
    disposition: accepted-risk
    reason: "writeFileAtomic lives in packages/core/src/io.ts:607 and is not exported from @kanmer/core's index; importing it needs a core change outside this GUI-only lane. The stale-edit guard already refuses the rename on a changed file; a spurious EPERM surfaces as an error the operator can retry. Retry/tmp cleanup can follow when core exports the helper."
  - id: F-009
    severity: note
    summary: "Renderer repeats the endpoint-name regex in JSX (ProjectRegistry.tsx:164) instead of a shared browser-safe helper. (Codex thread PRRT_kwDOT2PEds6c-TFa)"
    disposition: accepted-risk
    reason: "Main re-validates with assertEndpointName at the IPC boundary; the renderer copy only affects button enablement and the contract test pins the grammar against the server module."
  - id: F-010
    severity: note
    summary: "Mutations baseline on a fresh read, not the registry version shown to the user; a hand edit between render and click is not surfaced. In-process queue does not serialise two GUI instances. (Codex thread PRRT_kwDOT2PEds6c-TE8)"
    disposition: accepted-risk
    reason: "MCP-054 F-001 was an unlocked read-modify-write within one writer; the queue plus re-read guard (projectRegistry.ts:362-370) resolves that for the single GUI process that FRD-029 makes the only writer. Cross-instance and stale-UI races only affect registry metadata, never a board, and remain a TOCTOU window of one method call."
  - id: F-011
    severity: note
    summary: "GUI mirrors the server registry contract rather than importing it."
    disposition: accepted-risk
    reason: "Claim verified: packages/mcp-server/tsup.config.ts has no dts option, package.json has no exports map or types, and apps/gui/tsconfig.node.json is composite with include limited to src/** (TS6307 on a cross-package source import). Adding dts is cheap but is a server-package change the packet forbids; the contract test (projectRegistry.test.ts:120-144) loads the real server source and proves parseRegistry/validateEntry/ENDPOINT_NAME_RE parity. Parked in open-questions."
  - id: F-012
    severity: note
    summary: "AGENTS.md section 8 gotcha 16 still describes the server writer helpers as being for the GUI; the GUI does not use them."
    disposition: accepted-risk
    reason: "Documentation-only wording outside the packet's file list; a one-line follow-up when AGENTS.md is next touched."
---

# Review — GUI-144 (PR #294 at a9033ec2)

Independent review; the implementer was a different agent under client name `claude-code`. Ticket in Review, plan version `0c1490e992725887`, ticket `updated` 2026-08-27T20:36:07.303Z. Base moved from e903289e to 3dd48d37 (CORE-115) after the branch was cut; the PR is `MERGEABLE` (no conflict) but `mergeStateStatus: BLOCKED`.

## Scope check

Diff touches exactly the packet's files: `apps/gui/src/main/{index,projectRegistry,projectRegistry.test}.ts`, `shared/ipc.ts`, `preload/index.ts`, renderer `ProjectRegistry.tsx/.test.tsx`, `Settings.tsx`, `styles.css`, `manual/chapters.generated.ts`, `docs/manual/{connect,settings}.md`. No change under `packages/core` or `packages/mcp-server`. Post-implementation report matches the diff.

## What was verified (cwd `.worktrees/gui-144`, head a9033ec2)

- `npm run typecheck -w @kanmer/gui` exit 0.
- `npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx src/preload/index.test.ts --root apps/gui` 16/16 pass.
- `npm test -w @kanmer/gui` 52 files / 508 tests pass, exit 0, 284 s; no kanmerGit host flakiness observed this run.
- `npm run check:manual` exit 0 (22 chapters up to date); `npm run verify:docs` exit 0 (PASS).
- Contract test (`projectRegistry.test.ts:120-144`) genuinely `import()`s `packages/mcp-server/src/project-registry.ts` by file URL and asserts the server's `parseRegistry` accepts the GUI's written file, `validateEntry` is empty for every entry on both sides and identical for five name probes, and `ENDPOINT_NAME_RE.source` is identical. Location precedence (env absolute, else `<home>/.kanmer/endpoints.json`) is line-for-line the server's; the server resolves `home` via `os.homedir()` (`packages/mcp-server/src/index.ts:738`) exactly as `main/index.ts` does.
- Observation is read-only: `KanmerStore` is constructed and `exists()`-checked before any read, never `init()`ed (`projectRegistry.ts:262-268`); the test snapshots the whole temp dir byte-for-byte before/after (`test:149,188`). Lease fields are read via `optionalString`/typeof guards (`projectRegistry.ts:217-241`) and a malformed-lease test exists (`test:225-237`).
- IPC: all five handlers call `assertTrustedRemoteSender`; `registryAddProject` derives `boardRoot`/`repoRoot`/`boardBranch` from `requireCtx(projectId)` (`index.ts:1137-1143`); no channel accepts a filesystem path; renderer test asserts add sends `(projectId, name, policy)` only.
- Renderer: only the `selected` card renders rename/policy/remove controls (`ProjectRegistry.tsx:80-97`); the test proves the non-selected card has none.
- The two tests the implementer reports as initially failing (`rename` throwing synchronously; stale-edit race) were fixed by making writer methods async and adding an `afterRead` test seam — assertions were tightened, not weakened.

## Checks (required: `verify`, `kanmer-gate`)

Run 33114050837 for a9033ec2 (already re-run by the controller): `kanmer-gate` success (job 98665006283; the first attempt failed only on the stale board `d7a9867a` showing the ticket in implementing), `verify` FAILURE (job 98665006608), `regate` skipped (not required).

`verify` fails in this PR's own test: `src/main/projectRegistry.test.ts > observation > reports two projects with distinct health through read-only stores and never writes` — `AssertionError: expected 1 to be 2` at `projectRegistry.test.ts:159` (`expect(a.ticketCount).toBe(2)`). I reproduced it deterministically off the runner by merging a9033ec2 onto origin/main 3dd48d37 in a disposable worktree (`cc9b570f`) with a fresh `npm ci`: with CORE-115's core, `takeTicket` already mints `lease_id/lease_revision/lease_workspace/lease_phase/lease_heartbeat_at`; the fixture at `test:63` inserts a second `lease_id:`… block after `taken_at:`, YAML rejects `duplicated mapping key`, `listItemsWithWarnings` drops the ticket, and the count is 1. This is not runner portability: the branch's own worktree (pre-CORE-115 core) passes, the merge commit fails. It is test-only, but it is the merge commit CI tests, so the required check is red for a real reason (F-001). The fix is in the fixture (do not hand-inject lease keys the store now writes; assert the real lease record, or strip `lease_*` before injecting) — a branch change through execute, not a rebase.

## Findings

F-001 and F-002 are major and open; F-003..F-007 are minor and open (all straightforward to fix alongside F-001); F-008..F-012 are dispositioned above. Each Codex thread is mapped to a finding; none is silently dropped. On F-002: `RemoteSection` (`Settings.tsx:1228`) has the same pre-existing pattern, but for this ticket "Open project" is the only cross-project action and the manual (`docs/manual/settings.md` Projects section) states it "opens that project in a tab so you can select it", which `App.tsx:324-371` shows only the App-level `openProject` does. On F-003: FRD-029's "mutations scoped to the selected project" is enforced structurally for the one mutation that carries roots (add) and only by the renderer for name/policy/remove; because the trusted-sender guard limits callers to the app's own main frame and these edits touch registry metadata, never a board, the gap is minor, but main should still resolve the selected endpoint and refuse a non-matching name.

## Verdict

`needs-changes`. Not merged; ticket stays in Review. Re-review requires a new head with F-001 green on the hosted `verify` and F-002 addressed (F-003..F-007 recommended in the same pass), then a fresh attestation bound to that head.
