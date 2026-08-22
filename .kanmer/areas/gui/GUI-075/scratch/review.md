---
kind: review-attestation
pr: "142"
head_sha: "1a04be90"
verdict: needs-changes
reviewer: "codex-mcp-client"
independent: true
plan_hash: "0c0ac54fe1b1bd86"
reviewed_at: "2026-08-21T23:59:43.306Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Required GitHub verify check is red on the pre-existing Windows runner path-alias assertion (RUNNER~1 vs runneradmin)."
    disposition: deferred-to-ticket
    ticket: CORE-032
  - id: F-002
    severity: note
    summary: "Live authenticated provider execution and visual screenshot evidence are unavailable in this environment."
    disposition: accepted-risk
checks:
  local_core: "PASS — 266/266"
  local_gui: "PASS — 355/355"
  focused_dispatch_settings: "PASS — core 7/7; GUI 5/5; final settings control test 2/2"
  typecheck: "PASS — core and GUI"
  builds: "PASS — core and GUI"
  manual: "PASS — check:manual, 22 chapters"
  diff_check: "PASS"
  provider_help: "PASS — codex 0.149.0, claude 2.1.239, opencode 1.18.18, grok 1.0.5 help/version probes"
  live_provider: "INCONCLUSIVE — no credential-safe host authorized"
  visual: "INCONCLUSIVE — headless review"
github:
  verify: "FAIL — run 32538700773, 354/355 GUI tests; sole failure is src/main/kanmerGit.test.ts path alias"
---

Independent review of PR #142 at head 1a04be90: the implementation is bounded to GUI-075, the final model-control amendment is covered, and deterministic local rails pass. Merge is held because the required GitHub verify check is red on the known pre-existing runner path-alias assertion; this is deferred to [[CORE-032]]. External provider execution and visual proof remain explicitly INCONCLUSIVE, not claimed as success.

## CI update — 2026-08-22
The shared GitHub verify rail remains red on the unrelated MCP tunnel supervisor test (60/61; expected retry starts 2, observed 1), repeated across two attempts. MCP-041 tracks the separate remediation; this ticket remains held and no scope is absorbed.

## Independent review — GUI-075 PR #142 (2026-08-22)\n\n### Scope and packet read\n\nReviewed the complete GUI-075 ticket packet recursively (research, plan, checklist, post-implementation report, open-questions, execute notes, existing review/review-fixes scratch), HZN-007 context, HZN-005 context (returned 'content: null'), governing refs FRD-010/FRD-012/ADR-0009/CORE-009/MCP-020, current branch diff, PR metadata/comments, hosted check and failed log. GUI-075 remains in Review on 'gui-075-dispatch-settings', HEAD '1a04be901ce8245b3ab7e2def3d642df24b9939b', PR #142.\n\n### Local review rails\n\n- 'npm run test -w @kanmer/core -- --run src/dispatch-providers.test.ts src/dispatch-supervisor.test.ts': exit 0, 7/7.\n- 'npm run test -w @kanmer/gui -- --run src/main/dispatch.test.ts src/main/settings.test.ts': first exit 1 because the fresh worktree lacked 'packages/core/dist/index.js' while the concurrent core build was still running; preserved as a setup failure. After 'npm run build -w @kanmer/core' exit 0, rerun exit 0, 5/5.\n- 'npm run test -w @kanmer/core': exit 0, 13 files, 266/266.\n- 'npm run test -w @kanmer/gui': exit 0, 38 files, 355/355.\n- 'npm run typecheck -w @kanmer/gui': exit 0.\n- 'npm run build -w @kanmer/core': exit 0.\n- 'npm run build -w @kanmer/gui': exit 0.\n- 'npm run check:manual': exit 0, 22 chapters up to date.\n- 'git diff --check': exit 0.\nThe 19-file diff is scoped to the GUI-075 dispatch settings/provider argv/prompt SSOT/IPC/UI/docs/tests contract; no new code finding was identified.\n\n### Hosted check finding and disposition\n\nPR #142 remains OPEN with required 'verify' FAILURE, run '32538700773', job '96944276047'. The exact failure is unrelated to GUI-075 changes: 'apps/gui/src/main/kanmerGit.test.ts:93' expected the Windows temp path under 'C:\Users\RUNNER~1\AppData\Local\Temp\...' but received 'C:\Users\runneradmin\AppData\Local\Temp\...'; the run otherwise reports GUI 354/355 with this single failure. This is the known pre-existing Windows path-alias failure tracked by existing CORE-032. Disposition: defer remediation to CORE-032, do not absorb or alter CORE-032 in GUI-075, and keep merge held while the authoritative check is red. No new GUI-075 defect is inferred from this failure.\n\nLive authenticated provider execution and visual screenshot evidence remain explicitly INCONCLUSIVE, matching the two unchecked checklist items; CLI version/help evidence and deterministic rails are recorded in the report.\n\n### Verdict\n\n**NEEDS-CHANGES (merge held).** The implementation has no new review finding, but PR #142 cannot be independently approved for merge while the required hosted verify check is red. Re-review after CORE-032 resolves/dispositions the path-alias failure and hosted verify is green. Author must not merge or clean up this worktree.
