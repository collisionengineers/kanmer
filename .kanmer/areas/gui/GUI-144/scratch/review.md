---
kind: review-attestation
pr: "294"
head_sha: "190b022ac9fa6065b9df675fd7cab4f5b5fe3302"
verdict: pass
reviewer: "claude-gui144-delta-reviewer-2"
independent: true
plan_hash: "0c1490e992725887"
ticket_updated: "2026-08-27T22:12:50.212Z"
board_sha: "5bb62b104b446c318dcf213771bafd57382eeed4"
threads_snapshot:
  - id: PRRT_kwDOT2PEds6c-TE2
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TE8
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TFC
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TFH
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TFN
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TFP
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TFT
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TFa
    resolved: true
  - id: PRRT_kwDOT2PEds6c-TFd
    resolved: true
  - id: PRRT_kwDOT2PEds6c-tpD
    resolved: true
  - id: PRRT_kwDOT2PEds6c-tpF
    resolved: true
  - id: PRRT_kwDOT2PEds6c-tpI
    resolved: true
  - id: PRRT_kwDOT2PEds6c_uoU
    resolved: true
  - id: PRRT_kwDOT2PEds6c_uoY
    resolved: true
findings:
  - id: F-001
    severity: major
    summary: "Required check `verify` red: fixture hand-injected lease_* keys the CORE-115 store already writes (duplicate YAML key, ticketCount 1 not 2)."
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
    summary: "Renderer repeats the endpoint-name regex in JSX (ProjectRegistry.tsx). (Codex PRRT_kwDOT2PEds6c-TFa)"
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
    summary: "Settings stayed mounted across App.openProject with a draft initialised from project A; Save then wrote A's board config into the newly active project B, and the path bypassed requestOpen's dirty-editor guard. (Codex PRRT_kwDOT2PEds6c-tpD)"
    disposition: fixed
  - id: F-014
    severity: minor
    summary: "assertSelectedEndpoint took the first `selected` endpoint only, so controls on a later card failed when the registry validly named one logical project twice. (Codex PRRT_kwDOT2PEds6c-tpF)"
    disposition: fixed
  - id: F-015
    severity: minor
    summary: "'Open project' stayed enabled for health missing-board/invalid/error, so openProjectLocked's store.init() would silently create a fresh empty board at a stale registry path. (Codex PRRT_kwDOT2PEds6c-tpI)"
    disposition: fixed
  - id: F-016
    severity: minor
    summary: "Residual of F-015: observation proves the board only at `boardRoot`, but the card opens `repoRoot ?? boardRoot`, so an entry with a good boardRoot and an explicitly recorded stale `repoRoot` can still reach store.init() and create an empty board at the wrong path (ProjectRegistry.tsx:63-66, projectRegistry.ts:293, main/index.ts:732). (Codex PRRT_kwDOT2PEds6c_uoU)"
    disposition: accepted-risk
    reason: "Entries the GUI writes record repoRoot = an open tab's sourceRoot (the board worktree's parent), and an entry without repoRoot is safe because resolvePaths derives it from boardRoot; the exposure is a hand-edited or externally written registry and the worst outcome is a stray empty .kanmer at a wrong path, with no existing project mutated. Dispositioned on the thread and recorded as a follow-up."
  - id: F-017
    severity: minor
    summary: "observeEndpoint lists with includeArchived:false and feeds the same listing to claims(), so an archived ticket still holding a live lease (a supported terminal batch-member state) drops out of controllers and workspaces; the card can read 'No active controllers' while a workspace is still leased (projectRegistry.ts:300). (Codex PRRT_kwDOT2PEds6c_uoY)"
    disposition: accepted-risk
    reason: "Under-report in a read-only observation surface that cannot mutate any board, in a narrow archived-but-leased state. Fix is to aggregate leases from an includeArchived:true listing while keeping ticketCount on the unarchived set. Dispositioned on the thread and recorded as a follow-up."
  - id: F-018
    severity: note
    summary: "New in round 2: routing the Projects-tab open through requestOpen means a dirty ticket editor renders App's ConfirmModal (App.tsx:1700) while <Settings> (App.tsx:1956) is still mounted; both use .modal-backdrop at z-index 20 (styles.css:873), so the later Settings modal paints over the confirm and Settings' focus trap keeps it unreachable — the click appears to do nothing until Settings is closed."
    disposition: accepted-risk
    reason: "Fails safe: no project switch and therefore no cross-project write; the confirm becomes reachable as soon as Settings closes. Cosmetic layering fix (raise the confirm's z-index or close Settings before deferring) is a follow-up, not a merge blocker."
---

# Review — GUI-144 (PR #294 at 190b022a), delta round 2

Independent delta review by a fresh reviewer (`claude-gui144-delta-reviewer-2`), not the implementer and not either prior reviewer. Ticket in Review; plan version `0c1490e992725887` (unchanged); ticket `updated` 2026-08-27T22:12:50.212Z; board `5bb62b10`. Head `190b022a` on `origin/main` 9c9a6980 (CORE-124) after a clean rebase; the earlier heads `a9033ec2`/`50ff61cc` are unreachable.

Scope: the prior attestation's findings, the lines changed since it (`3ec2c09b..190b022a`, 9 files / +267 −21), the direct contracts those lines touch, and the relevant tests. Diff vs main is 14 files, all under `apps/gui/**` and `docs/manual/**` — **nothing under `packages/*` or `plugins/*`**, and `AGENTS.md` untouched, as the plan's "do not modify" list requires.

## Round-2 fixes verified at 190b022a

**F-013 (major) — fixed, both structurally and in depth.**
- `App.tsx:714-720` `openProjectFromSettings` calls `requestOpen({ kind: "path", path: root })`; `requestOpen` (`App.tsx:697-703`) defers to the `pendingProject` confirm when `editorDirty.current`, so the registry open is now the same guarded path as the picker (`pickAndOpen`, `:705`) and the menu (`:726`).
- `App.tsx:1957` `<Settings key={root ?? "none"} …>`. `draft` is `useState(() => structuredClone(board))` (`Settings.tsx:91`), initialised once per mount, so the re-key guarantees a switched project cannot inherit the previous draft.
- Settings-side defence: `requestOpenProject` (`Settings.tsx:149-155`) parks a `pendingOpen` when `modified` and renders an explicit `role="alertdialog"` "Discard and open" banner (`:219-231`); the Projects tab is wired to that wrapper, not to the raw prop (`:306`). `save` refuses when `draftProjectId !== projectId` (`Settings.tsx:124-127`) with "this draft belongs to another project".
- Open-tab ref: `settingsTab` (`App.tsx:196`) carries only a `SettingsTab` string, is written from `onTabChange` and reset to `"board"` in `onClose` (`App.tsx:1974-1977`). No board, draft or project state crosses the remount — the only thing preserved is which tab was open, which is the intent.
- `Settings.projects.test.tsx` (3 tests) genuinely proves it, not just that a prop is threaded: test 1 dirties A's board draft, clicks Open on B, asserts the guard fires and `onOpenProject` was **not** called, cancels, re-triggers, discards, asserts `onOpenProject("C:/beta")` and that the raw `window.kanmer.openProject` stub (which throws) was never called; it then re-keys to B and asserts `onSaveBoard` is called exactly once **with B's config** and that no call payload contains A's edit. Test 2 is the "caller does not re-key" case: with a fixed key, A's dirty draft survives a `projectId` change and Save is refused with `onSaveBoard` never called. Test 3 proves a clean draft opens with no prompt.

**F-014 (minor) — fixed.** `assertSelectedEndpoint` (`projectRegistry.ts:369-379`) now filters *all* `selected` endpoints and accepts the named one among them; the refusal lists every bound name. `projectRegistry.test.ts:334-347` registers `alpha` and `alpha-mirror` on the same `boardRoot`/`project_id` plus `beta`, asserts both selected names are accepted and that `beta` is refused with a message naming both. The main handlers still call it before every write (`main/index.ts:1152, 1161, 1169`).

**F-015 (minor) — fixed.** `openable = health === "ok" || health === "unassigned"` (`ProjectRegistry.tsx:63-66`) gates the button (`:102`) and an explanatory hint renders when it is refused (`:103`). `ProjectRegistry.test.tsx:115-132` covers `missing-board`, `invalid` and `error` (disabled, hint present, click calls nothing) and asserts an `unassigned` endpoint is still openable with no hint. `docs/manual/settings.md:104-115` documents the disabled open, the editor confirm and the board-draft guard. Residual recorded as F-016.

**F-001..F-007 survived the rebase.** Spot-checked at head: the lease fixture is minted by `takeTicket(..., provider: "claude-code")` and asserted field-by-field (`projectRegistry.test.ts:53-79`); `assertSelectedEndpoint` + `requireCtx` + `assertRemoteProjectId` guard rename/remove/policy (`main/index.ts:1148-1167`); `redactRemoteOrigin` is the server line (`projectRegistry.ts:145-169`) with the contract test importing `project-identity.ts` (`test:137-163`); `entryForContext` records `boardBranch` only when git-backed (`projectRegistry.ts:386-392`); `add` throws `REGISTRY_NAME_EXISTS` (`:450-455`); `classifyLease` uses core `leaseState` with a `claimState` fallback and only `live` populates controllers (`:217-231, 246`). F-008..F-012 remain accepted-risk, unchanged.

## New findings

- **F-016 (minor)** — the F-015 gate proves the board at `boardRoot`, but the card opens `repoRoot ?? boardRoot` and `openProjectLocked` still calls `store.init()`. A stale explicit `repoRoot` therefore keeps the same failure mode in a narrower window. Accepted-risk with the reasoning on the thread; the clean fix is to validate `repoRoot` during observation or open the observed root through a non-initialising path.
- **F-017 (minor)** — archived tickets are filtered out before `claims()`, so an archived-but-leased batch member vanishes from the controllers/workspaces view.
- **F-018 (note)** — with a dirty ticket editor, the newly routed open shows the App's confirm *behind* the Settings modal (same `.modal-backdrop` z-index, Settings later in DOM). It fails safe; the switch simply does not happen until Settings closes.

None of the three is a blocker or a major: none can mutate a board, none can write across projects, and each fails closed.

## Governing docs and plan

FRD-029's boundary now holds end to end: the only action on a non-selected endpoint is opening it through the App's guarded selection path; registry rename/policy/remove are refused in main for any endpoint not bound to the sender's project; no renderer path supplies a filesystem path to a registry channel; location fingerprints are proven equal to the server's. The plan's acceptance checks are met — handlers registered in `registerIpc`, section composed from the Settings `projects` tab, tests showing two projects with distinct health and no mutation control on the non-selected one, serialised concurrent writes. `App.tsx`/`Settings.tsx`/`Settings.projects.test.tsx` fall outside the plan's original file table; both are declared deviations forced by F-002/F-013 and stay within the plan's "do not modify" boundary.

## Local verification (cwd `.worktrees/gui-144`, head 190b022a)

| Command | Result |
| --- | --- |
| `npm run typecheck -w @kanmer/gui` | exit 0 |
| `npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx src/renderer/src/components/Settings.projects.test.tsx --root apps/gui` | 27/27 pass, exit 0 |
| `npm test -w @kanmer/gui` | 53 files / 520 tests pass, exit 0 (284.8 s) |
| `npm run check:manual` | exit 0 — manual up to date (22 chapters) |
| `npm run verify:docs` | exit 0 — PASS |

No host flakiness observed; no retries needed.

## Checks and threads

Run 33121178512 at 190b022a: `verify` **success**, `kanmer-gate` **success** after the controller's re-run with the board recording Review, `regate` skipped (not required). Both required checks are green at the reviewed head; the gate's earlier `STALE_REVIEW` warning was the round-1 attestation's `threads_snapshot` shape and this record writes it as an array.

14 review threads, **0 unresolved**. The two Codex threads opened against this head (`PRRT_kwDOT2PEds6c_uoU`, `PRRT_kwDOT2PEds6c_uoY`) were dispositioned in writing as F-016/F-017 and then resolved; the twelve earlier threads were already resolved. `mergeStateStatus` CLEAN at the time of the merge decision.

## Verdict

`pass`. Independent review, required checks green at 190b022a, every finding and thread dispositioned, no open blocker or major. Merging under the standing delegation and moving Review → Verifying; F-016/F-017/F-018 are recorded follow-ups for a later GUI ticket, not conditions of this merge.
