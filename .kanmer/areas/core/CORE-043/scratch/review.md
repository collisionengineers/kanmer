---
kind: review-attestation
pr: "168"
head_sha: "9519e2e8ad9c0424b63d9b9d8c4e6ef2832a7401"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: pass
reviewer: "codex-gui099-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-22T23:20:40.773Z"
findings:
  - id: F-001
    summary: "The CORE-043 protection-aware rename and lifecycle remediation remains present."
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "The exact 9519 cumulative tree retains fail-closed protected-default rename behavior, transactional preference persistence, serialized lifecycle operations, retained handoff state, and the cumulative CORE-048/052+ board-sync remediations."
  - id: F-002
    summary: "GUI-118 lifecycle findings are fixed in the merged cumulative branch."
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "GUI-118's exact 9519 review PASS confirms branch binding, Retry reconciliation, handoff/native state, user-scoped clearing, serialized open/preferences/Connect, and actionable recovery guidance."
  - id: F-003
    summary: "GUI-119 provider propagation and GUI-120 multi-project broadcast are retained."
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "PR #222 merged as 9519e2e8, with GUI-123's 1ef324c0/5d041af8 lineage: OpenAI/remote/Claude branch propagation and projectId: id multi-project broadcasts remain in the current parent branch."
  - id: F-004
    summary: "The current hosted gate and authoritative verification both pass."
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "Run 32604808898 kanmer-gate job 97108612019 is PASS and verify job 97108612103 is PASS. The hosted verification boundary is complete and green."
  - id: F-005
    summary: "Live GitHub protection retargeting and native/provider host behavior remain unproven."
    severity: minor
    disposition: accepted-risk
    reason: "ADR-0016/FRD-020 defer live protection mutation and no disposable native/packaged host was available; no external PASS is fabricated."
---

# Fresh cumulative independent review — CORE-043 PR #168 at 9519e2e8

Reviewed exact PR #168 head 9519e2e8ad9c0424b63d9b9d8c4e6ef2832a7401 against main 34245be039e8fd8395b5e31835602c54e62e98a4. The head is the current CORE-043 branch after the non-squash GUI-122 merge; PR #222 merge commit 9519e2e8 is reachable and PR #222's GUI-123 remediation lineage is present.

The cumulative source retains the original protection-aware rename path and its CORE-048/052+ remediation chain. The GUI-118 review confirms lifecycle/provider behavior; GUI-119 branch propagation and GUI-120 project-specific broadcasts are proven in the exact tree. No new in-scope source or traceability blocker was found.

Evidence:

- local GUI focused lifecycle/provider rail: 121/121 PASS with hookTimeout 30000; isolated index.sync: 11/11 PASS;
- GUI typecheck/build: PASS;
- scripts 89/89, verify:docs, manual, and diff checks: PASS;
- hosted run 32604808898: kanmer-gate job 97108612019 PASS and verify job 97108612103 PASS;
- live protection retargeting, installed native providers, packaged runtime, and visual evidence remain INCONCLUSIVE.

Verdict: PASS for exact cumulative code and lineage, with hosted gate and verify both green. No merge or board move was performed.


--- Prior review history ---

---
kind: review-attestation
pr: "168"
head_sha: "1126253eed586111db60ed72eccf6754f0f5ef06"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "a0b32fae7b9b14f9"
ticket_updated: "2026-08-22T21:39:09.943Z"
findings:
  - id: F-3836130697
    severity: blocker
    summary: "Custom rename preserves the hosted-variable handoff"
    disposition: fixed
    reason: "renameBoardBranch pushes the new custom ref and deliberately retains the old remote ref until KANMER_BOARD_BRANCH is updated; FRD-020 R5 and Settings document the handoff."
  - id: F-3836130700
    severity: major
    summary: "Exact handoff clears only generated mismatch state"
    disposition: fixed
    reason: "refreshBoardBranch tracks branchMismatchError and branchMismatchPause separately and clears only detector-generated state; the focused rail covers genuine-error preservation."
  - id: F-3836130702
    severity: blocker
    summary: "Paused handoff blocks automatic sync"
    disposition: fixed
    reason: "syncProjectLocked checks shouldRunAutomaticSync and clears the timer before returning a paused/mismatch status; syncBoard is not called."
  - id: F-3836130705
    severity: blocker
    summary: "Managed instructions declare KANMER_BOARD_BRANCH"
    disposition: fixed
    reason: "AGENTS.md and the managed agents-block source describe the repository variable, fallback, administrator handoff, and local runtime convention."
  - id: F-3836189719
    severity: major
    summary: "Ordinary custom rename accepts the saved current branch"
    disposition: fixed
    reason: "refreshBoardBranchForPreference inspects against the cached current branch unless the requested destination is observed, preserving the ordinary rename path."
  - id: F-3836189723
    severity: blocker
    summary: "Local MCP invocations receive the configured branch"
    disposition: fixed
    reason: "Connect IPC passes readSettings().kanmerBranch through serverInvocation and installed Electron invocations serialize KANMER_BOARD_BRANCH."
  - id: F-3836579174
    severity: major
    summary: "Manual Retry rechecks the live branch"
    disposition: fixed
    reason: "syncProjectLocked performs ensureBoardWorktree/preflightBoardSync before syncBoard and returns a paused mismatch without mutating refs."
  - id: F-3836579176
    severity: major
    summary: "FRD-020 specifies retained custom refs"
    disposition: fixed
    reason: "FRD-020 R5 and its as-built section now require retaining the old custom ref until the hosted variable handoff is complete."
  - id: F-3836720318
    severity: major
    summary: "Settings explains retained custom refs"
    disposition: fixed
    reason: "Settings names the repository variable update and delayed manual deletion of the old remote ref."
  - id: F-3836720320
    severity: major
    summary: "Protected reconciliation failures remain visible"
    disposition: fixed
    reason: "A retained boardRoot with an error renders as failed Git state with the error and Retry action rather than as a non-Git project."
  - id: F-3836808784
    severity: blocker
    summary: "Open provider registrations reconcile after branch save"
    disposition: fixed
    reason: "applyGitPreferencesBody reconciles Codex, Claude, and OpenCode registrations for each open context after a successful branch change and pauses on failure."
  - id: F-3836808786
    severity: blocker
    summary: "Native plugin descriptors carry the configured branch"
    disposition: fixed
    reason: "connectNativePlugin stages a disposable descriptor with KANMER_BOARD_BRANCH before install while preserving the bundled descriptor."
  - id: F-3836808787
    severity: blocker
    summary: "Branch serialization is shell-safe"
    disposition: fixed
    reason: "Provider registration uses argv-native execution for production and the GUI-114 adversarial metacharacter rail covers hostile branch names."
  - id: F-3836827896
    severity: blocker
    summary: "Hosted handoff warning is durable"
    disposition: fixed
    reason: "setKanmerGitHandoff stores pending handoff state independently of transient sync error state; Settings retains it until acknowledgement."
  - id: F-3836827899
    severity: major
    summary: "Retry re-arms automatic sync after worktree recovery"
    disposition: fixed
    reason: "The production Retry caller re-arms the timer after a retained-root repair; the cumulative focused rail covers this case."
  - id: F-3836827900
    severity: major
    summary: "Rename and sync lifecycle operations serialize"
    disposition: fixed
    reason: "applyGitPreferencesLocked clears timers and uses withSyncLifecycles around branch mutation; Sync now and automatic callbacks share the project lifecycle lock."
  - id: F-3836890756
    severity: blocker
    summary: "Closed-project registrations reconcile on reopen"
    disposition: fixed
    reason: "openProject reconciles Codex, Claude, and OpenCode registrations after ensureBoardWorktree establishes the current branch."
  - id: F-3836890758
    severity: blocker
    summary: "Native providers receive explicit reconnect state"
    disposition: fixed
    reason: "Branch changes mark nativeReconnectRequired and Settings names Grok/Antigravity plus the branch and explicit Connect action; implicit user-global mutation is avoided."
  - id: F-3836890759
    severity: blocker
    summary: "Antigravity shipped descriptor uses a literal default"
    disposition: fixed
    reason: "The committed descriptor uses the literal default and GUI Connect injects custom values only into a disposable staged copy."
  - id: F-3836911554
    severity: major
    summary: "Native plugin functional proof does not verify branch binding"
    disposition: open
    reason: "connectNativePlugin compares fingerprint, roots, and format but not expected/actual board branch; a host dropping the staged environment can therefore pass the probe while retaining the wrong convention."
  - id: F-3837018843
    severity: blocker
    summary: "Provider reconciliation failures survive Git Retry"
    disposition: open
    reason: "Branch-save reconciliation records provider failure in ordinary error/paused fields, while a later successful syncBoard clears those fields without retrying provider reconciliation."
  - id: F-3837018844
    severity: major
    summary: "Project open serializes with preference changes"
    disposition: open
    reason: "openProject is not in the lifecycle lock or an equivalent open-operation registry; a preference save can race ensureBoardWorktree before the context is inserted."
  - id: F-3837052513
    severity: blocker
    summary: "OpenAI tunnel invocation carries the saved branch"
    disposition: open
    reason: "app.whenReady constructs OpenAITunnelManager with serverInvocation(claude, boardRoot, repoRoot) and omits readSettings().kanmerBranch, so custom projects receive the default branch."
  - id: F-3837052514
    severity: blocker
    summary: "Failed rename does not persist the requested branch"
    disposition: open
    reason: "applyGitPreferencesBody calls setKanmerGitPreferences(targetBranch, ...) before renameBoardBranch completes; an invalid or conflicting destination can persist while the worktree remains on the old branch."
  - id: F-3837052515
    severity: blocker
    summary: "Connect serializes with branch reconciliation"
    disposition: open
    reason: "CH.connectAgent calls connectAgent directly rather than through withSyncLifecycles or an expected-version registration write, so a slower Connect can restore an old branch after reconciliation."
  - id: F-3837084778
    severity: blocker
    summary: "Observed administrator handoff marks native providers stale"
    disposition: open
    reason: "When refreshBoardBranchForPreference observes the requested destination, ordinary rename is skipped and markNativeReconnectRequired is not called, leaving existing native descriptors without a reconnect prompt."
  - id: F-3837084780
    severity: major
    summary: "Native reconnect state is user-scoped"
    disposition: open
    reason: "clearNativeReconnectRequired removes the provider only for the current project even though Grok/Antigravity are user-scoped; other project warnings remain after one successful Connect or Disconnect."
  - id: F-3837084781
    severity: blocker
    summary: "Remote-access runtime receives the saved branch"
    disposition: open
    reason: "remoteAccess/manager.ts childEnvironment includes KANMER_ROOT and KANMER_REPO_ROOT but no KANMER_BOARD_BRANCH, so remote MCP sessions fall back to kanmer-board on custom branches."
  - id: F-3837084783
    severity: blocker
    summary: "Push-recovery handoff warning remains actionable"
    disposition: open
    reason: "A successful local rename with an initial push failure stores that transient push error as handoffPending.warning; later recovery can leave no instruction to update KANMER_BOARD_BRANCH before deleting the retained ref."
  - id: F-3837084786
    severity: blocker
    summary: "Claude marketplace MCP is branch-bound"
    disposition: open
    reason: "Claude Connect installs the bundled marketplace descriptor through installSkills without staging KANMER_BOARD_BRANCH, while only the project registration receives the selected branch."
  - id: F-REPORT-1126253
    severity: major
    summary: "Cumulative report and PR body match the reviewed head"
    disposition: open
    reason: "post-implementation-report still identifies 11930038542 and the older hosted run, and the PR body still describes only the original implementation; the ticket's current 1126253 cumulative child lineage and green run are not traceable in the report."
  - id: F-EXTERNAL
    severity: minor
    summary: "Live protection and provider-host proof"
    disposition: accepted-risk
    reason: "Hosted run 32599958132 proves repository checks, not live GitHub protection retargeting, installed native-plugin behavior, or a live remote/provider host. Those boundaries remain INCONCLUSIVE under ADR-0016/FRD-020."
---

## CORE-043 independent review — NEEDS-CHANGES

Reviewed PR #168 at exact head `1126253eed586111db60ed72eccf6754f0f5ef06` against main `34245be039e8fd8395b5e31835602c54e62e98a4`. The cumulative compare includes the original CORE-043 implementation plus the non-squash GUI-112 through GUI-117/MCP-044 lineage. The current code fixes the earlier branch-refresh, pause/timer, retained-ref, local-provider, native-descriptor, shell-safety, reopen, and literal-descriptor findings, but the open findings above include multiple current P1/P2 runtime/concurrency/provider gaps. The stale cumulative report is also not sufficient traceability for this exact head.

Evidence:

- Hosted PR run `32599958132`: `verify` job `97096637353` PASS; `kanmer-gate` job `97096637280` PASS.
- Exact detached-head focused GUI branch/protection/provider rail: `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts src/main/index.sync.test.ts src/main/connect.test.ts src/main/providers.test.ts src/main/openaiTunnel.test.ts src/main/settings.test.ts src/main/syncBranch.test.ts src/main/syncLifecycle.test.ts src/main/syncTimer.test.ts` — exit 0, 9 files / 157 tests PASS.
- Exact-head GUI typecheck — exit 0.
- `git diff --check 34245be039e8fd8395b5e31835602c54e62e98a4..1126253eed586111db60ed72eccf6754f0f5ef06` — exit 0.
- Live GitHub protection retargeting, installed provider/runtime behavior, and live remote/provider hosts remain INCONCLUSIVE; no external state was mutated.

Thirty current PR threads were audited: the 19 earlier remediation threads are fixed in the current tree, while the 11 current runtime/traceability findings remain open. Because P1 findings remain, this is NEEDS-CHANGES. No GitHub review thread was resolved, and no merge or board move was performed.
