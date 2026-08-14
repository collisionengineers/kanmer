# Ultrareview findings — 2026-08-14

Cloud multi-agent review of `kanmer-v2-finish-deferrals` → `main` (95 files,
+8040/-1389). The diff contains the whole stacked chain (PRs 4–13). PR #3
(`updater-implementation`) is a separate branch and was not reviewed.

## Follow-up validation

The findings were independently traced through checkout `cf48f7e` on
2026-08-14. Evidence included source call chains, IPC contracts, storage layouts,
commit provenance and focused runtime checks. The existing suites were also run:

- core: 105/105 passed;
- GUI: 62/62 passed.

Those green suites do not exercise the reported scenarios, so they do not refute
the findings. This follow-up changes three verdicts from unconditional to
qualified because part of the original reasoning or proposed fix was too broad.

| Verdict | Count | Meaning |
| --- | ---: | --- |
| Validated | 6 | The reported defect and reachable impact are supported by current code. |
| Partially validated | 3 | A real defect exists, but an absolute claim, reproduction detail or proposed fix required correction. |
| Refuted | 0 | No finding was wholly disproved. |

## Findings and verdicts

| Finding | Verdict | Owning PR | Evidence summary |
| --- | --- | --- | --- |
| [Dispatch spawn options](dispatch-spawn-options.md) | **Partially validated** | #10 | POSIX group kill is unsound without a detached child. Shell-free Windows launch failed for the installed `codex` (`ENOENT`), but succeeded for installed `claude`, `opencode` and `grok`; “all four are broken” was too broad. |
| [Dispatch tracking is not project-scoped](dispatch-project-scoping.md) | **Validated** | #12 | The lock, cancel lookup, status type and UI actions all use bare `ticketId`. |
| [Disconnect has an excessive blast radius](disconnect-blast-radius.md) | **Validated** | #9 | Disconnect recursively removes the shared Grok skills directory and unconditionally removes the shared AGENTS block. |
| [Closing a dirty tab discards edits](close-tab-dirty-guard.md) | **Validated** | #12 | `closeTab` explicitly clears the dirty ref before unmounting and bypasses both confirmation paths. |
| [Settings can undo stage backfill](settings-backfill-overwrite.md) | **Validated** | #13 | Backfill writes the board externally while the modal retains and later saves its stale whole-board draft. |
| [Toast attribution hardcodes document names](toastkey-hardcoded-docs.md) | **Partially validated** | #12 | The defect is real, but the suggested parent-folder heuristic breaks legacy flat items and must be layout-aware. |
| [Final-stage validation hardcodes proof](final-stage-gate-hardcoded.md) | **Partially validated** | #5 | The invariant ignores configured per-area gates, but the original examples and “enter-newLast only” fix did not fully model threshold semantics. |
| [Closing the last tab does not persist an empty session](empty-session-not-persisted.md) | **Validated** | #12 | The persistence effect suppresses exactly the empty state that `setOpenTabs` can store. |
| [DocEditor hardcodes checklist](checklist-literal-doceditor.md) | **Validated** | #7 | Progress counting is data-driven while interactive checkbox rendering still requires the literal `checklist`. |

## Corrected triage

1. Fix dispatch identity before multi-project dispatch ships: a cancel action can
   target another project's worker.
2. Fix disconnect ownership and dirty-tab close next: both can destroy user work.
3. Fix Windows/POSIX process launch and termination with a platform-safe design;
   do not blindly put model-derived prompt text through a shell.
4. Fix stale Settings state and toast attribution before calling configurable
   documents and board backfill complete.
5. Carry the final-stage, empty-session and progress-document corrections in the
   owning PRs with the focused tests specified in each finding.

Each linked page preserves the original finding and adds the independent verdict,
counter-evidence, corrected reasoning and an implementation-ready remediation
plan. This review does not implement those source changes.
