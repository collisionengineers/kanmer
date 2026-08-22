# Independent review — CORE-058

- reviewer: codex-mcp-client
- independent: true
- PR: #180 (https://github.com/collisionengineers/kanmer/pull/180)
- reviewed head: `d50ddab17c33fcdc645f9c777a635cc2d72f26ee`
- base: `3c0706627cc73038d91a624e5d494d0148dce4c4` (`core-044-source-fetch-remediation`)
- verdict: NEEDS-CHANGES

## Changes inspected

The exact PR head changes `apps/gui/src/main/kanmerGit.ts` to centralize the board-worktree ignore entries and reconcile them for attached and branch-mismatch paths, adds real-Git tests and sync-staging coverage in `apps/gui/src/main/kanmerGit.test.ts`, and regenerates `plugins/kanmer/mcp/kanmer-mcp.cjs`. The governing-doc scope in the plan/report matches this diff; no provider/source-fetch behavior is added.

## Rails

- Focused GUI Git: PASS, 15/15.
- MCP source integration: PASS, 17/17.
- All-workspace typecheck: PASS.
- Core and server builds: PASS.
- `verify:docs`: PASS; generated manual current.
- `test:scripts`: PASS, 88/88.
- Artifact at the reviewed head: SHA-256 `6057648D81FB4CCCAB629A0EE1C05C8716A564400302238857E785C70C485100`, matching the author’s normal-checkout parity report; linked-worktree plugin guard remains intentionally unavailable.
- PR state readback: OPEN, CLEAN/MERGEABLE, exact head/base above, no hosted checks attached.

## Review comments and dispositions

1. **Blocking P2 — existing local/remote branch attachment paths skip ignore reconciliation** (GitHub comment 3836151012, originally anchored at 08f0393). At the reviewed head, the `localExists` and `remoteExists` worktree-add branches return through the common success path without calling `ensureBoardWorktreeIgnore`; only orphan creation does. The new rule can therefore still be absent when a configured branch already exists locally/remotely. Filed as [[CORE-062]], which blocks CORE-058.

2. **Blocking P1 — attached-worktree ignore failure loses the known board root** (GitHub comment 3836151017, originally anchored at 08f0393). `ensureBoardWorktreeIgnore(attachedRoot)` runs inside the outer try; a write/lock/permission failure reaches `empty(branch, error)` without `boardRoot`, allowing callers to fall back to the source checkout instead of preserving the real board location. Filed as [[CORE-063]], which blocks CORE-058.

3. **Non-blocking accepted/deferred P2 — already tracked cache history** (GitHub comment 3836151015). Adding `.gitignore` does not untrack cache files already committed. CORE-058’s open-questions explicitly parks retroactive history cleanup as outside this ticket, and the report states that boundary; no merge-blocking change is required here. This risk remains documented for a future scoped remediation.

## Decision

NEEDS-CHANGES. The focused tests and artifact evidence are green, but the two live source defects above are within CORE-058’s board-worktree hygiene scope. PR #180 was not merged and CORE-058 was not moved to Verifying.

## Independent review — NEEDS-CHANGES — b1abac871da28522759d4e5582caa69d5cdb5cd5

Reviewer: codex-core058-review (independent of the implementation author). Exact reviewed head: b1abac871da28522759d4e5582caa69d5cdb5cd5 (PR #180), cumulative CORE-044 base lineage reviewed; current CORE-044 remote base at review time: 7403a7cfb7079fafa88c2d18ec5b33b1a7407013.

Scope reviewed: cumulative CORE-058 board-worktree ignore reconciliation, including inherited CORE-062 attachment paths and CORE-063 board-root preservation. Exact intended diff is apps/gui/src/main/kanmerGit.ts, apps/gui/src/main/kanmerGit.test.ts, and generated plugins/kanmer/mcp/kanmer-mcp.cjs; no unrelated source files were introduced by the cumulative head.

Blocking finding:
- P2 — ensureBoardWorktreeIgnore adds .kanmer/data/sources/ to .gitignore but does not untrack source-cache paths that were already committed in the board worktree index. Git ignore rules do not affect already tracked paths, so syncBoard's git add -- .kanmer .gitignore can continue staging and committing cache updates after reconciliation. The new test uses git check-ignore --no-index, which explicitly ignores the index and therefore cannot prove this migration case. Add a deterministic fixture with a tracked .kanmer/data/sources/cache.json, reconcile, run syncBoard (or inspect the index), and remove the cache tree from the index while retaining the working copy; preserve failures rather than claiming the existing ignore test covers it.

Positive evidence: exact CORE-058 Git integration suite passed 18/18 (npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts, exit 0). The board-root preservation regression and local/remote attachment reconciliation both passed.

Full GUI rail: exit 1, 39 files, 290/291 tests; four suites failed before collection/expectation because the linked worktree resolves stale shared-core dispatch provider antigravity, and one dispatch assertion received the same stale-provider error. This is an environment/baseline limitation, not evidence for or against the changed Git code.

Disposition: NEEDS-CHANGES. Do not merge or move CORE-058 to Verifying until the tracked-cache migration behavior is fixed and re-tested at a fresh exact head.

# Independent cumulative review — NEEDS-CHANGES

- Reviewer: codex-mcp-client
- Independent: true
- Scope boundary: CORE-058 parent implementation was authored by `codex-core058-executor`; this reviewer authored CORE-062 and reviewed CORE-063, but did not author CORE-058 or its parent source changes.
- PR: #180
- Exact head: `b1abac871da28522759d4e5582caa69d5cdb5cd5`
- Base branch: `core-044-source-fetch-remediation`
- Exact base: `3c0706627cc73038d91a624e5d494d0148dce4c4`
- PR state at review: OPEN, CLEAN, MERGEABLE; hosted status rollup empty (hosted verification INCONCLUSIVE).

## Diff and governing scope

Inspected the cumulative three-file diff against the CORE-044 base: `apps/gui/src/main/kanmerGit.ts`, `apps/gui/src/main/kanmerGit.test.ts`, and regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`. The source remains scoped to board-worktree ignore reconciliation, the child fixes, regression coverage, and artifact parity. FRD-027 and ADR-0020 are the recorded governing references.

## Rails

- Focused GUI Git rail at the exact head: PASS, 18/18 (`src/main/kanmerGit.test.ts`, 55.86s).
- Core build: PASS (`npm run build:core`).
- Scripts rail: PASS, 88/88, after the core build (`npm run test:scripts`).
- Manual freshness: PASS (`npm run check:manual`).
- Governing docs: PASS (`npm run verify:docs`).
- Diff whitespace: PASS (`git diff --check 3c0706627cc73038d91a624e5d494d0148dce4c4...b1abac871da28522759d4e5582caa69d5cdb5cd5`).
- GUI typecheck: FAIL on inherited CORE-044 lineage API mismatch, not changed by this PR: `dispatchDeliverableProven` and `DispatchSupervisorOptions.verifyDeliverable` are absent from the exact-head core build, and `antigravity` is not in the exact-head `DispatchProviderId`.
- MCP server build: ESM phase passed, standalone phase FAIL on the same inherited exact-head core API mismatch (`SourceDeclarationSchema`, `SourceDeclarationArraySchema`, `withExclusiveFileLock`, `resolveSources`, `dispatchDeliverableProven` absent from core dist).
- Artifact: committed plugin hash at exact head is `6057648d81fb4cccab629a0ee1c05c8716a564400302238857e785c70c485100`; author’s normal-checkout parity evidence is retained. Linked-worktree plugin:check is intentionally refused by the repository guard, so independent normal-checkout byte rebuild is INCONCLUSIVE here.
- Live/hosted/packaged evidence: INCONCLUSIVE; PR has no hosted check rollup and no credentials/runtime evidence was supplied.

## Review-thread dispositions

- Thread 3836151012 (P2, local/remote attachment ignore reconciliation): FIXED in cumulative head by CORE-062 merge `a0acadee972d3359738d9cd4390098794f7d3b4d`; exact-head focused rail covers local and remote paths.
- Thread 3836151015 (P2, retroactive untracking of already tracked caches): ACCEPTED/DEFERRED. CORE-058’s open-questions document explicitly parks retroactive index cleanup as outside this bounded ignore-rule/artifact scope; no silent disposition.
- Thread 3836151017 (P1, attached-worktree board-root preservation): FIXED in cumulative head by CORE-063 merge `b1abac871da28522759d4e5582caa69d5cdb5cd5`; exact-head focused rail includes the attached failure regression.
- Thread 3836232925 (P1, rename-path board-root loss): NEEDS-CHANGES. The mismatch path calls `renameBoardBranch`, then awaits `ensureBoardWorktreeIgnore` without a local guard; the outer catch returns `empty()` with `boardRoot: null`. `openProject` can therefore fall back to the source checkout after a successful rename followed by ignore failure. Disposition: linked child CORE-064, which blocks CORE-058.
- Thread 3836232929 (P2, attached ignore failure is not retryable): NEEDS-CHANGES. The catch returns `available:false` with `boardRoot` and `paused`; Settings renders “Git sync is unavailable for this non-Git project,” and `syncBoard` returns immediately when unavailable, so repairing the file cannot retry in the open project. Disposition: linked child CORE-065, which blocks CORE-058.

## Decision

NEEDS-CHANGES. The two current threads are actionable and are now recorded as CORE-064 and CORE-065, both linked to and blocking CORE-058 in HZN-007. Leave PR #180 open; do not merge or move CORE-058.

# Independent cumulative review — NEEDS-CHANGES — b1abac871da28522759d4e5582caa69d5cdb5cd5

Reviewer: codex-recovery (independent of CORE-058 author codex-core058-executor).
PR #180: https://github.com/collisionengineers/kanmer/pull/180
Exact head: b1abac871da28522759d4e5582caa69d5cdb5cd5
Base: core-044-source-fetch-remediation; hosted status rollup is empty (hosted verification INCONCLUSIVE).

## Scope and lineage

Reviewed the cumulative three-file diff: apps/gui/src/main/kanmerGit.ts, apps/gui/src/main/kanmerGit.test.ts, and generated plugins/kanmer/mcp/kanmer-mcp.cjs. The diff is scoped to CORE-058 board-worktree ignore/artifact provenance. CORE-062 a0acadee, CORE-063 5f63636, and the generated cumulative merge are reachable from b1abac87. FRD-027, ADR-0020, and the plan/report scope match the intended board/cache boundary.

## Evidence

- Exact focused GUI Git rail: PASS, 18/18 (npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts, exit 0).
- Full GUI rail: FAIL, 4 suites failed during collection plus 1 failed dispatch assertion; 39 files passed, 290/291 tests. Failures are inherited stale shared-core antigravity provider resolution and the resulting dispatch expectation; no changed Git test failed.
- Artifact committed SHA-256: 6057648D81FB4CCCAB629A0EE1C05C8716A564400302238857E785C70C485100, matching the author’s normal-checkout parity report.
- git diff --check: PASS (exit 0).
- Hosted/packaged/live Windows lock evidence: INCONCLUSIVE; PR has no hosted checks and no controlled external host was exercised.

## Thread dispositions

- 3836151012 (P2 local/remote attachment ignore): FIXED by CORE-062 merge a0acadee; exact 18/18 rail covers both paths.
- 3836151015 (P2 already tracked cache history): ACCEPTED/DEFERRED per CORE-058 open-questions; the bounded rule/artifact ticket does not rewrite history.
- 3836151017 (P1 attached-path board-root loss): FIXED by CORE-063 merge b1abac87; exact regression proves root/error/paused preservation.
- 3836232925 (P1 rename-path board-root loss): OPEN/BLOCKING. After renameBoardBranch succeeds, ensureBoardWorktreeIgnore can still throw through the outer catch, returning empty() with boardRoot null; openProject may fall back to the source checkout. Disposition: CORE-064, which blocks CORE-058.
- 3836232929 (P2 retryability): OPEN/BLOCKING. The failed attached state has available:false and boardRoot, but syncBoard short-circuits and the renderer path classifies it as unavailable, so repairing .gitignore cannot retry while the project remains open. Disposition: CORE-065, which blocks CORE-058.

## Verdict

NEEDS-CHANGES. Leave PR #180 open and CORE-058 in Review; do not merge or move to Verifying until CORE-064 and CORE-065 land and a fresh cumulative review resolves their threads.

# Fresh cumulative review — NEEDS-CHANGES

- Reviewer: codex-mcp-client
- Independent: true; this is a fresh cumulative review, superseding the earlier b1ab/b8 pre-child review notes.
- PR: #180
- Exact head: `b8d8a191161532e895fa399b6c95bf812dfdb2d0`
- Base: `core-044-source-fetch-remediation` at `3c0706627cc73038d91a624e5d494d0148dce4c4`
- PR state: OPEN, CLEAN, MERGEABLE; hosted check rollup empty (hosted/Windows evidence INCONCLUSIVE).

## Cumulative scope and evidence

The cumulative tree includes CORE-062, CORE-063, CORE-064, and CORE-065 merges. The child rails are green on the equivalent cumulative source tree: focused GUI Git 20/20, GUI typecheck PASS, scripts 88/88, manual/docs/diff PASS. The committed plugin artifact remains unchanged by the GUI-only child remediations; inherited hash is `6057648d81fb4cccab629a0ee1c05c8716a564400302238857e785c70c485100`. External hosted/Windows lock and packaged proof remain INCONCLUSIVE.

## Prior finding dispositions

- 3836151012 local/remote attachment ignore reconciliation: fixed by CORE-062.
- 3836151017 attached-worktree board-root preservation: fixed by CORE-063.
- 3836232925 rename-path board-root preservation: fixed by CORE-064; merged in `17cdb6684f204e36cb64668236a4bab0de7e55ac`.
- 3836232929 retryable failed-Git state: fixed by CORE-065; merged in `b8d8a191161532e895fa399b6c95bf812dfdb2d0`.
- 3836151015 retroactive untracking of already tracked caches: explicitly accepted/deferred in CORE-058 open questions; not silently dropped.

## New blocking findings at final head

- 3836285519 (P1): first-time local/remote attachment calls `ensureBoardWorktreeIgnore(boardRoot)` outside a guarded path after creating the canonical worktree. A deterministic `.gitignore` failure falls through to the outer `catch`, returns `empty()` with `boardRoot: null`, and can make callers fall back to the source checkout. Disposition: CORE-066 created in HZN-007, linked to and blocking CORE-058.
- 3836285521 (P2): `ensureIgnore` follows a symlink at `boardRoot/.gitignore`; a tracked link can redirect writes into board data such as `.kanmer/data/board.yml`. Disposition: CORE-067 created in HZN-007, linked to and blocking CORE-058.

## Decision

NEEDS-CHANGES. Leave PR #180 open and CORE-058 in Review; do not merge or move it. CORE-066 and CORE-067 must be independently implemented/reviewed before the cumulative parent can pass.

# Fresh cumulative independent review — NEEDS-CHANGES

- Reviewer: codex-mcp-client; independent review (I did not author CORE-058 or its parent implementation; CORE-062–067 were reviewed as child merges, and this is a fresh cumulative review).
- Exact PR: #180 https://github.com/collisionengineers/kanmer/pull/180
- Exact head: `f0de2628b15028b59679f332c09a204f414437f8`
- Base: `core-044-source-fetch-remediation` at `3c0706627cc73038d91a624e5d494d0148dce4c4`
- PR state at review: OPEN, CLEAN, MERGEABLE; no hosted checks attached.
- Governing docs checked: `docs/functional/frd/FRD-027-project-declared-sources.md`, `docs/architecture/adr/ADR-0020-project-declared-source-trust.md`; plan/report/open-questions were read and the report's scope matches the five changed files.

## Changes inspected

The cumulative diff changes `apps/gui/src/main/kanmerGit.ts`, `apps/gui/src/main/kanmerGit.test.ts`, `apps/gui/src/main/index.ts`, `apps/gui/src/renderer/src/components/Settings.tsx`, and the generated `plugins/kanmer/mcp/kanmer-mcp.cjs`. It centralizes board-worktree ignore entries, reconciles them on attached/created/renamed paths, preserves a known boardRoot on reconciliation failures, adds retry plumbing and symlink refusal, adds real-Git regressions, and carries the generated plugin artifact. No unrelated provider/source-fetch behavior was observed.

## Evidence

- Child cumulative evidence carried into this exact tree: focused GUI Git 19/19 (CORE-064), 20/20 (CORE-065), 22/22 (CORE-066), and 23/23 (CORE-067); GUI typecheck, core build, scripts 88/88 after the documented prerequisite core build, manual/docs/diff rails all passed.
- Normal-checkout plugin parity evidence: build:core, build:server, build-plugin, plugin:check passed; fresh/committed artifact SHA-256 `6057648D81FB4CCCAB629A0EE1C05C8716A564400302238857E785C70C485100`; isolated handshake listed 37 tools.
- The linked-worktree plugin:check refusal and live packaged/host evidence remain INCONCLUSIVE as reported; no hosted checks were attached to PR #180.

## Review comments and dispositions

- 3836151012 — fixed in cumulative PR/CORE-058.
- 3836151015 — non-blocking accepted/deferred: retroactive untracking/history cleanup remains explicitly parked in CORE-058 open-questions/report; no merge claim is made for it.
- 3836151017 — fixed by CORE-063 merge `5f63636d64fa92b4dc682d910255e0552d4da35e`.
- 3836232925 — fixed by CORE-064 merge `17cdb6684f204e36cb64668236a4bab0de7e55ac`.
- 3836232929 — fixed by CORE-065 merge `b8d8a191161532e895fa399b6c95bf812dfdb2d0`.
- 3836285519 — fixed by CORE-066 merge `d3eb3728d6dca7cdeebd72c251f8ee3e1c47934f`.
- 3836285521 — fixed by CORE-067 merge `f0de2628b15028b59679f332c09a204f414437f8`.
- 3836307985 — blocking P2, filed as [[CORE-068]]: retry repair can restore availability without re-arming the already-enabled automatic-sync timer.
- 3836307986 — blocking P2, filed as [[CORE-069]]: retry uses stale `syncStatus.branch` after a saved branch change.
- 3836307987 — blocking P2, filed as [[CORE-070]]: an existing later negation can override the managed cache exclusion.
- 3836307988 — blocking P2, filed as [[CORE-071]]: read-then-write ignore reconciliation can overwrite a concurrent edit.
- 3836323268 — blocking P2, filed as [[CORE-072]]: a failed orphan migration retry repairs ignore state but does not resume source-board cleanup.
- 3836323269 — blocking P2, filed as [[CORE-073]]: retry can replace the open context's boardRoot with another attached worktree.

## Verdict

NEEDS-CHANGES. The six current blocking findings are recorded as CORE-068 through CORE-073, each linked to and blocking CORE-058. Do not merge PR #180 or move CORE-058 to Verifying until those findings are fixed or explicitly dispositioned by independent review.

## Independent cumulative review — PASS — 271790e58c52a14fa4b3cec62f7146b6a67bcdcd

reviewer: codex-core058-review
independent: true
ticket: CORE-058
pr: 180
head: 271790e58c52a14fa4b3cec62f7146b6a67bcdcd
base: 3c0706627cc73038d91a624e5d494d0148dce4c4
base_branch: core-044-source-fetch-remediation

Changes reviewed: the cumulative nine-file diff covers the CORE-058 board-worktree ignore/plugin artifact implementation and the merged remediation chain CORE-062 through CORE-073, including CORE-074's atomic ignore child and CORE-072's CORE-076 orphan-recovery child. The cumulative source remains scoped to board ignore reconciliation, canonical-root preservation, retry/error state, timer re-arming, branch selection, concurrent/atomic ignore edits, orphan migration, symlink refusal, and generated plugin artifact parity. No unrelated provider or source-fetch feature changes were found.

Prior findings/dispositions: 3836151012, 3836151017, 3836232925, 3836232929, 3836285519, 3836285521, 3836307985, 3836307986, 3836307987, 3836307988, 3836323268, and 3836323269 are fixed by the cumulative child merges and their regression coverage. Finding 3836151015 (retroactive untracking of already-tracked cache content) remains explicitly accepted/deferred in CORE-058's report and open questions; it is not silently treated as fixed and is not a blocker for this packet's declared reconciliation scope.

Rails:
- npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts: exit 0, 27/27 PASS, 73.44s.
- npm run test -w @kanmer/gui -- --run src/main/syncBranch.test.ts src/main/syncTimer.test.ts: exit 0, 7/7 PASS.
- npm run build:core: exit 0.
- npm run build:server: initial exit 1 because the linked review worktree resolved a stale shared @kanmer/core; after creating the review-checkout-local core junctions, rerun exit 0 for ESM and standalone CJS. The initial failure is preserved as setup evidence, not erased.
- npm run typecheck: exit 0 for all workspaces after the local core resolution.
- npm run test:scripts: exit 0, 88/88 PASS.
- npm run verify:docs: exit 0, manual current (22 chapters), links/fences/canary/provider-boundary checks PASS.
- npm run check:manual: exit 0, manual current (22 chapters).
- git diff --check 3c0706627cc73038d91a624e5d494d0148dce4c4..271790e58c52a14fa4b3cec62f7146b6a67bcdcd: exit 0.
- The committed normal-checkout plugin artifact hash is 6057648D81FB4CCCAB629A0EE1C05C8716A564400302238857E785C70C485100. In the linked temporary review checkout, plugin:check correctly refused because the workspace dependency resolved outside that checkout; a linked-worktree build-plugin output is path-dependent and is not used as parity evidence. The author packet's normal-checkout build-plugin/plugin:check evidence is retained.

Boundaries: PR #180 has no hosted status attached. Installed/packaged GUI, Windows live worktree protection, remote/host-provider, and retroactive tracked-cache migration evidence remain INCONCLUSIVE or explicitly deferred where the packet says so; no external evidence is fabricated.

Verdict: PASS for the exact cumulative head and declared ticket scope. No merge or ticket move performed by this reviewer.
