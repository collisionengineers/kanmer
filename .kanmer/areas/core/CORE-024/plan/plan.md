# Plan — CORE-024: `kanmer check-pr` phase-1 merge gate

## Objective

Add a deterministic read-only merge-gate evaluator, CLI, and real GitHub Actions job that fail a PR when no valid Kanmer ticket can be resolved or the resolved ticket has unchecked non-parked questions, while distinguishing gate failure from infrastructure failure.

## Starting state

- CORE-032 provides one Windows PR workflow/job named `verify`; GitHub has no board-aware check.
- Core has the sole checkbox/parked parser but no public ticket-question count or merge-gate evaluator.
- MCP server has no `check-pr` CLI.
- `main` protection must not require `kanmer-gate` until the job has posted once.

## Governing docs

- FRD-009 and ADR-0011: open-question folder/checkbox/parked semantics.
- ADR-0016/FRD-022 when DOC-011 lands: GitHub merge physics and structured gate contract.
- EPIC-009 / MASTERPLAN GA-06 and Appendix A: exact files, resolution order/regex, read-only board worktree, event mapping, Bash/Windows behavior, output/exits, and future extension.

## Required changes

### A. Add a read-only question-count API

1. In `packages/core/src/types.ts`, add a small exported type only if needed:

   ```ts
   interface OpenQuestionCount {
     checked: number;
     total: number;
     open: number;
   }
   ```

2. In `KanmerStore`, add `getOpenQuestionCount(id)` (or equivalently exact name) adjacent to document/gate reads.
3. Validate/normalize the ID through existing item-location methods; do not use unchecked path concatenation.
4. Locate the item without calling `init()` or `getBoard()` if those can initialize.
5. Return `null` for missing item and legacy/non-format-3 ticket layout, or throw one documented read error consistently; the merge evaluator must convert this to `NO_TICKET`, not infrastructure failure, when the board itself is readable.
6. Require the item to be `type:"ticket"` at evaluator level.
7. Delegate exactly to:

   ```ts
   countCheckboxes(ticketDir, "open-questions", { stopAtParked: true })
   ```

8. Return `open = total - checked`; do not copy checkbox/heading regex.
9. Unit-test absent folder, no boxes, checked/unchecked, parked section per file, nested/multiple open-question Markdown files, and no-write behavior.

### B. Define the extensible core result

10. Add `packages/core/src/merge-gate.ts` and export it from core index.
11. Define `MergeGatePrInput` with `number`, `headSha`, `branch`, `body`.
12. Define `MergeGateFindingLevel = "error" | "warning"` even though phase 1 emits errors only, so CORE-025 extends without a result rewrite.
13. Define an extensible finding code/type whose phase-1 members are exactly `NO_TICKET` and `OPEN_QUESTIONS`.
14. Define `MergeGateFinding` with `code`, `level`, `message`, and optional JSON-safe `details`.
15. Define `MergeGateResult` with:
    - `ok`
    - `ticketId`
    - `source: "footer" | "branch" | null`
    - normalized PR identity
    - ordered `findings`.
16. Compute `ok` from absence of error-level findings, not a separately mutable flag.
17. Keep evaluator deterministic and side-effect free: no stdout/stderr/process exits/environment/Git/GitHub calls.

### C. Implement ticket resolution

18. Add a pure footer parser that normalizes CRLF and scans full lines.
19. Match only whole lines with case-insensitive `Kanmer: <ID>` and ID form `[A-Z0-9]{2,6}-\d+`.
20. Normalize captured IDs to uppercase.
21. Collapse repeated identical footer IDs.
22. If two or more distinct footer IDs appear, return an ambiguous explicit-reference result; evaluator emits `NO_TICKET` and does not consult branch.
23. If exactly one footer appears, use source `footer`; call `store.getItem(id)` and require `type === "ticket"`.
24. If footer item is missing/non-ticket, emit `NO_TICKET` naming the invalid explicit ID; do not fall back.
25. If no footer exists, apply exact branch regex `/^([A-Z0-9]{2,6}-\d+)/i`.
26. Normalize branch capture uppercase and require the existing item to be a ticket.
27. If branch has no capture or item is absent/non-ticket, emit `NO_TICKET` with source null/branch as appropriate.
28. Include remediation text: add/fix `Kanmer: <ID>` footer or use an ID-prefixed branch; never create a ticket automatically.
29. Add tests for LF/CRLF, whitespace/casing, alphanumeric area prefix, ID followed by hyphen/slash, footer priority, invalid explicit footer with valid branch, repeated same footer, ambiguous footers, missing/non-ticket item, and no linkage.

### D. Evaluate open questions

30. Only after resolving a real ticket, call `store.getOpenQuestionCount(ticketId)`.
31. If the count unexpectedly returns null for the resolved item’s layout, emit `NO_TICKET`/unsupported-ticket-layout detail rather than treating it as zero.
32. If `open > 0`, add one `OPEN_QUESTIONS` error with details `{checked,total,open}` and an instruction to answer/check or move explicitly deferred items below `## Parked (explicitly deferred)` with reason.
33. If `open === 0`, add no finding.
34. Return findings in stable phase order: linkage first; questions only when linked.
35. Snapshot board tree/content/activity before/after evaluator tests and prove zero changes.

### E. Add core tests

36. Add `merge-gate.test.ts` with a temp format-3 board initialized only by test setup before the evaluator is called.
37. Seed areas/tickets through store setup and write question documents before taking the before snapshot.
38. Cover every resolution and question case above.
39. Assert exact result JSON fields, codes, levels, source, normalized ID, PR number/head/branch, and detail counts.
40. Assert no parser divergence by including unusual checkbox casing/spacing already supported by `countCheckboxes` and comparing its direct count to evaluator result.
41. Assert evaluator never calls a mutation by using a read-only store fixture/spies where practical and byte-tree comparison.
42. Add a future-extension test that warnings alone do not make `ok:false`, without adding any phase-2 code.

### F. Implement the CLI

43. Add executable/source `packages/mcp-server/src/check-pr.mjs` using Node built-ins only plus dynamic import of built `@kanmer/core`.
44. Add an import-safe direct-entry guard so helper functions can be imported/tested without executing.
45. Parse exact flags `--board <path>` and `--event <path>`; reject missing, duplicate, empty, or unknown flags as infrastructure errors.
46. Resolve the board/event paths; do not create directories or call store initialization.
47. Read/parse event JSON and require object `pull_request` with:
    - positive integer `number`
    - non-empty `head.sha`
    - non-empty `head.ref`
    - `body` string or null.
48. Treat a non-PR/malformed event as exit 2. Drafts remain ordinary valid PRs; do not inspect/skip `draft`.
49. Validate board path exists/readable and construct `new KanmerStore(boardPath)` with no `init()`/`ensureInit()`.
50. Call evaluator once and write exactly one compact `JSON.stringify(result)` line to stdout.
51. For every error-level finding, write one escaped GitHub workflow command to stderr:

   `::error title=kanmer/gate [<CODE>]::<message>`

52. Implement a local workflow-command escape for `%`, CR, LF, `:`, and `,`; unit/static test it. Never allow body/ticket text to inject a second command.
53. Exit 0 for result ok; exit 1 for evaluated error findings.
54. Catch argument/event/board/import/unexpected errors, emit a deterministic infrastructure diagnostic to stderr and a JSON envelope with `ok:false`, `infrastructureError:true`, and safe message if that is the adopted CLI shape, then exit 2.
55. Do not print stack traces containing paths/secrets by default; optionally include stack only under a local debug env not set in CI.
56. Ensure the CLI never writes into board/PR tree; add before/after file snapshot in local smoke/integration verification.

### G. Extend the PR workflow

57. Rebase after CORE-032 and preserve its workflow display name, trigger, permissions, Bash default, and `verify` job byte-for-byte except required formatting context.
58. Add one sibling job ID and display name exactly `kanmer-gate`.
59. Use `runs-on: windows-latest`; do not add `needs: verify`, draft condition, matrix, retry, artifact, cache, or write permission.
60. Add `actions/checkout@v4` and `actions/setup-node@v4` Node 20.
61. Run `npm ci`.
62. Run `npm run build:core`; do not run a fake/stub gate and do not rely on a pre-existing dist directory.
63. Add Bash step to:

   ```bash
   git fetch origin kanmer-board
   git worktree add "$RUNNER_TEMP/kanmer-board" origin/kanmer-board
   ```

64. Assert the temp path differs from `$GITHUB_WORKSPACE`; fail before CLI if it aliases/exists unexpectedly.
65. Run the CLI with quoted `$RUNNER_TEMP` and `$GITHUB_EVENT_PATH` exactly.
66. Let exit 1 and 2 both fail the Actions job while preserving their distinct output/annotations.
67. Do not clean up the temporary worktree in a way that masks the gate exit; runner teardown handles it. If an explicit cleanup step is added, use `if: always()` and preserve prior step conclusion.

### H. Documentation and real-PR proof

68. Update AGENTS.md only with the local phase-1 command, read-only board warning, and exit-code meanings if current command documentation has an appropriate location.
69. If CORE-033 playbook exists, append the observed check name/run evidence and phase-1 troubleshooting after a real job posts; do not manually enable protection before the observed-once procedure.
70. Open this implementation PR with `Kanmer: CORE-024` in its body so the new job can evaluate itself once board code is available.
71. Before opening/synchronizing, ensure the board branch contains CORE-024 in Review with no open questions so a compliant run is possible.
72. Exercise real PR cases on disposable/controlled heads or the integration fixture without corrupting this ticket:
    - no linkage → `NO_TICKET`, exit 1;
    - valid footer → ticket resolves;
    - branch-prefix fallback → resolves when footer absent;
    - unparked question → `OPEN_QUESTIONS`, exit 1;
    - parked-only → passes;
    - unavailable/missing board branch/worktree in a controlled run → exit 2;
    - compliant current PR → green.
73. Record exact workflow run IDs, head SHAs, displayed check name, stdout JSON, stderr annotation, and exits.
74. After first legitimate green run, follow CORE-033 playbook/authorized operator process to add the exact observed `kanmer-gate` check to main protection; do not bundle an unobserved rule change into source code.
75. Confirm `kanmer-board` direct pushes still trigger no PR workflow.

### I. Verification and scope audit

76. Run focused core tests, all core tests, typecheck, build, CLI fixture calls, and full `npm run verify` from a normal checkout.
77. Run the CLI against a copy/read-only snapshot of a real board and compare before/after hashes.
78. Run `git diff --check`.
79. Confirm the diff contains only the exact evaluator/test/store/export/CLI/workflow and narrowly required AGENTS/playbook files.
80. Confirm no MCP tool, plugin binary/reference, GUI, dependency, lockfile, gate profile, branch-rule source, or phase-2 behavior changed.
81. Write the post-implementation report with production callers (`kanmer-gate` GHA job → CLI → core evaluator/read-only store) and all real-run evidence.
82. Stop at independent review; do not implement CORE-025 or merge the PR yourself.

## Expected files

Add:
- `packages/core/src/merge-gate.ts`
- `packages/core/src/merge-gate.test.ts`
- `packages/mcp-server/src/check-pr.mjs`

Modify:
- `packages/core/src/store.ts`
- `packages/core/src/types.ts` only if needed
- `packages/core/src/index.ts`
- `.github/workflows/pr.yml`
- `AGENTS.md` only for changed command convention
- `docs/plans/compiled-workflow/playbook.md` only after CORE-033/real observed run

## Acceptance checks

- Footer/branch resolution and precedence/ambiguity are exact and tested.
- Open questions use the sole parser; parked/absent behavior is proven.
- Evaluator/store read path changes zero board bytes and never initializes.
- CLI emits stable JSON/escaped annotations and exact 0/1/2 exits.
- Workflow reads a separate fetched board worktree on Windows/Bash and exposes a real independent `kanmer-gate` job.
- Real PR cases prove both phase-1 failures, footer/branch pass, parked pass, board failure exit 2, and final green current-head run.
- Existing verify job and board direct-push behavior remain intact.

## Commands

```bash
npm test --workspace @kanmer/core
npm run typecheck --workspace @kanmer/core
npm run build:core
node packages/mcp-server/src/check-pr.mjs --board <fixture-board> --event <fixture-event>
npm run verify
git diff --check
git status --short
```

Real checks:

```bash
gh pr checks <pr>
gh run view <run-id> --log
```

## Failure and deviation rules

- Never point `--board` at the PR checkout, call initialization, add a second checkbox parser, fall back from an invalid explicit footer, or collapse exit 1/2.
- Never add phase-2 codes, GitHub write APIs, auto-merge, a stub/pass job, or weaken the existing verify job.
- A real board-fetch or parser failure is exit 2 and blocks; do not convert it to pass.
- If the displayed check name differs from expectation, record the actual name and update playbook/protection through the staged procedure; do not rename after protection casually.
- Do not merge or begin CORE-025.

## Stop condition

Stop when core tests and a real PR prove `NO_TICKET`, `OPEN_QUESTIONS`, footer/branch resolution, parked pass, infrastructure exit 2, and a green compliant current-head `kanmer-gate`; the board is byte-unchanged, the check’s exact name is recorded/staged for protection, full verification passes, and the PR is ready for independent review. Do not merge or start CORE-025.
