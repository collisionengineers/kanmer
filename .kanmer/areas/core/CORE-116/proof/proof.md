---
kind: proof-record
merged_sha: "28a12643f1721cf7607ce5427f55fae281ba5026"
environment: "detached worktree .worktrees/verify-core-116-28a12643f1721cf7607ce5427f55fae281ba5026 at 28a12643f1721cf7607ce5427f55fae281ba5026; Windows 11 Pro 26200, Node v24.15.0, npm workspaces; hosted control = GitHub Actions 'Pull request verification', push event on main, windows-latest"
verified_at: "2026-08-28T05:08:08Z"
result: PASS
attempts:
  - attempted_at: "2026-08-28T04:47:55Z"
    command: "gh pr view 299 --json state,mergeCommit,url,title,baseRefName,headRefName,mergedAt"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 28a12643f1721cf7607ce5427f55fae281ba5026, base main, head core-116-delivery-policy, mergedAt 2026-08-28T04:46:12Z."
  - attempted_at: "2026-08-28T04:48:20Z"
    command: "git fetch origin"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "bf0eaed4..28a12643 main -> origin/main."
  - attempted_at: "2026-08-28T04:48:40Z"
    command: "git worktree add --detach C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/verify-core-116-28a12643f1721cf7607ce5427f55fae281ba5026 28a12643f1721cf7607ce5427f55fae281ba5026"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Detached HEAD at 28a12643. Path did not previously exist; no other ticket's worktree reused."
  - attempted_at: "2026-08-28T04:48:55Z"
    command: "git -C <verify-worktree> rev-parse HEAD"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "28a12643f1721cf7607ce5427f55fae281ba5026 — equals the PR's mergeCommit.oid exactly."
  - attempted_at: "2026-08-28T04:48:56Z"
    command: "git -C <verify-worktree> symbolic-ref --short -q HEAD"
    cwd: "<verify-worktree>"
    exit_code: 1
    result: PASS
    summary: "Empty output, exit 1 — the required detached-HEAD assertion."
  - attempted_at: "2026-08-28T04:48:57Z"
    command: "git -C <verify-worktree> status --short --branch"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "'## HEAD (no branch)' with no file entries — clean."
  - attempted_at: "2026-08-28T04:49:30Z"
    command: "npm install --no-audit --no-fund"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "Workspace dependencies installed in the disposable worktree."
  - attempted_at: "2026-08-28T04:49:10Z"
    command: "gh run list --commit 28a12643f1721cf7607ce5427f55fae281ba5026"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: FAIL
    summary: "FIRST HOSTED ATTEMPT, PRESERVED. Run 33142774219 ('Pull request verification', push on main, windows-latest) concluded failure. Job 'verify' failed at 'Run the authoritative verification rail'; jobs regate success, kanmer-gate skipped."
  - attempted_at: "2026-08-28T04:49:25Z"
    command: "gh run view --job 98757060597 --log-failed"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: FAIL
    summary: "Single failing test: src/store.test.ts > KanmerStore > 'updates fields and stamps updated' — 'Test timed out in 5000ms' plus teardown 'ENOTEMPTY: directory not empty, rmdir ...kanmer-test-Vugp5T/.kanmer'. 548/549 tests passed; src/delivery.test.ts 48/48 passed. store.test.ts is untouched by this PR and is CORE-128's lane."
  - attempted_at: "2026-08-28T04:52:00Z"
    command: "npm test -w @kanmer/core"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "23 test files, 549/549 tests passed — including the exact test that failed in the first hosted run. Isolates the CI red as host timing, not code."
  - attempted_at: "2026-08-28T04:53:10Z"
    command: "npm run build -w @kanmer/core"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "dist/index.js built, used by the independent acceptance harness below."
  - attempted_at: "2026-08-28T04:54:05Z"
    command: "npm run typecheck"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "@kanmer/core, @kanmer/mcp-server, @kanmer/ui, @kanmer/gui all clean."
  - attempted_at: "2026-08-28T04:54:40Z"
    command: "node --test packages/mcp-server/src/delivery.test.mjs"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "6/6 pass: base-ref passthrough, main-only pass, wrong-target warn, KANMER_GATE_STRICT error, absent base ref skipped, recorded hotfix targeting the release branch."
  - attempted_at: "2026-08-28T04:54:55Z"
    command: "node --test packages/mcp-server/src/check-pr.test.mjs"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "8/8 pass; the CLI contract is otherwise unchanged."
  - attempted_at: "2026-08-28T04:55:30Z"
    command: "node <TEMP>/core116-accept.mjs (independent acceptance harness, first attempt)"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 1
    result: FAIL
    summary: "FIRST ATTEMPT, PRESERVED. 27/30 checks passed. The 3 failures were defects in the verifier's own harness, not the product: it read result.findings (which holds only non-passing findings) instead of result.checks (the complete ordered verdict), and expected outcome 'fail' where merge-gate's fail() maps a warning level to outcome 'warn'."
  - attempted_at: "2026-08-28T04:57:10Z"
    command: "node <TEMP>/core116-accept.mjs (independent acceptance harness, corrected)"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "30/30 independent checks pass against fresh fs.mkdtemp boards (never the live board). Covers FRD-031 AC1, AC2-minus-candidate, AC5, the unmerged-branch edge case, the delivery_sha-clear probe, the deliveryTargets hotfix-definition probe, and WRONG_TARGET soft/strict behaviour."
  - attempted_at: "2026-08-28T04:50:22Z"
    command: "gh run rerun 33142774219 --failed  (then gh run view 33142774219)"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "DECISIVE HOSTED CONTROL. The identical rail re-run at the identical merge SHA, with no code change, concluded success: headSha 28a12643f1721cf7607ce5427f55fae281ba5026, job 'verify' success, step 'Run the authoritative verification rail' success."
  - attempted_at: "2026-08-28T05:00:30Z"
    command: "npm run verify"
    cwd: "<verify-worktree>"
    exit_code: 1
    result: FAIL
    summary: "Known host-only defect owned by CORE-128, not chased. Fails at rail step 2 (npm test) solely on scripts/antigravity-plugin-config.test.mjs: 2 of 121 script tests fail with EBUSY rmdir on '...Kanmer Test Space/Kanmer/bin'. Every other suite in that step is green: core 23/23 files, gui 54/54 files, mcp-server http 130/130. The rail is fail-fast, so steps 3-13 did not run here and were executed individually below."
  - attempted_at: "2026-08-28T05:02:00Z"
    command: "npm run verify:docs"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "PASS — document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current."
  - attempted_at: "2026-08-28T05:03:00Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "335/335 checks passed, including 'tools/list returns 39 tools', get_status.delivery, the execution-packet delivery block, and the update_item delivery refusal set."
  - attempted_at: "2026-08-28T05:03:40Z"
    command: "npm run smoke:headless"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "Headless board read/write green; host files outside the board untouched."
  - attempted_at: "2026-08-28T05:04:20Z"
    command: "npm run mcpb:check"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "mcpb check passed (3 files, 1718038 bytes)."
  - attempted_at: "2026-08-28T05:05:10Z"
    command: "npm run smoke:protocol"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed."
  - attempted_at: "2026-08-28T05:05:40Z"
    command: "npm run smoke:discovery"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "13/13 checks passed; booting creates no .kanmer."
  - attempted_at: "2026-08-28T05:06:10Z"
    command: "npm run verify:skills"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "ALL CHECKS PASSED — skill prose contracts intact, including kanmer-execute's new base-branch/--base guidance."
  - attempted_at: "2026-08-28T05:06:40Z"
    command: "npm run verify:agents-block"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "31/31 checks passed."
  - attempted_at: "2026-08-28T05:07:20Z"
    command: "npm run plugin:check"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 39 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 39 tools. Confirms the roster did not grow and the committed bundle matches source."
  - attempted_at: "2026-08-28T05:07:40Z"
    command: "grep -n 'delivery_' packages/core/src/gates.ts packages/core/src/profiles.ts"
    cwd: "<verify-worktree>"
    exit_code: 1
    result: PASS
    summary: "No matches — delivery state is never a gate input (ADR-0005). This is what makes the FRD-031 edge case structural rather than incidental."
  - attempted_at: "2026-08-28T05:07:50Z"
    command: "git show 28a12643 --stat -- packages/core/src/version.ts packages/core/src/migrate.ts packages/core/src/step-packet.ts"
    cwd: "<verify-worktree>"
    exit_code: 0
    result: PASS
    summary: "Empty — no board-format bump and STEP_PACKET_VERSION untouched, as ADR-0021 requires for a board still served by the installed stable v0.3.12."
  - attempted_at: "2026-08-28T05:07:55Z"
    command: "git show kanmer-board:.kanmer/data/board.yml | grep -n delivery"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 1
    result: PASS
    summary: "Read-only check. No matches — Kanmer's own board declares no delivery block, so its repository policy is unchanged and it exercises the default main-only path, exactly as FRD-031 requires."
---

# Proof — CORE-116

Verified independently at the exact GitHub merge SHA of PR #299,
`28a12643f1721cf7607ce5427f55fae281ba5026`, in a disposable detached worktree.
The verifier neither wrote nor reviewed this code.

## Scope

CORE-116 was rescoped during research. It owns **FRD-031 AC1, AC5, AC2 without
its immutable-candidate clause**, and the edge case *"release evidence never
turns an unmerged feature branch into a verified ticket"*. AC2's candidate
clause, AC3, AC4 and the unavailable-release-service retry edge belong to
[[CORE-132]] and were deliberately **not** verified here and not held against
this ticket.

## In-scope criteria

| Criterion | Result | Mechanical evidence |
|---|---|---|
| **AC1** — a main-only fixture targets and verifies `main` at its exact merged SHA | PASS | An undeclared board resolves `{integrationBranch: main, releaseBranch: main, releaseCandidatePattern: null, hotfixBackport: true}` with `policySource: "default"`; `deliveryTargets` returns `main` for base, PR and verification target. `integrated` at `main` is accepted only with a full 40-hex SHA — a missing SHA raises `DELIVERY_EVIDENCE_MISSING`, an abbreviated one `DELIVERY_SHA_INVALID`. |
| **AC2** (minus the candidate clause) — a dev-to-main fixture targets `dev`, proves integration and records the release separately | PASS | On `{integrationBranch: dev, releaseBranch: main}` an ordinary ticket's base/PR/verification target is `dev`. A ticket integrated into `dev` at an exact SHA reaches **Done while `delivery_state` is only `integrated`**; `released` with release branch + tag is then recorded **without changing the stage** (`status` stays `done`). A release branch that is not the policy's release branch is refused with `DELIVERY_TARGET_INVALID`. |
| **AC5** — a release-branch hotfix records its required integration backport | PASS | On the dev-to-main board, `delivery_branch: main` auto-records `delivery_backport_required: dev`, and the hotfix's base/PR/verification targets all become `main`. The obligation is recomputed, not toggled: an abbreviated backport SHA is refused and the obligation survives; only a full 40-hex `delivery_backport_sha` clears it. On a main-only project no ticket can ever owe a backport, and a backport SHA with no obligation is refused with `DELIVERY_NO_BACKPORT_REQUIRED`. |
| **Edge case** — release evidence never verifies an unmerged branch | PASS | A `feature` ticket in Verifying carrying `delivery_state: released` with branch, SHA, release branch and tag is still refused entry to Done, and the refusal names the missing document: *"entering Done requires proof (profile \"feature\")"*. Structural, not incidental: `grep 'delivery_'` over `gates.ts` and `profiles.ts` returns nothing, so no gate can read delivery state. |

## Targeted probes

- **Validation judges the merged post-patch record.** Clearing `delivery_sha`
  with `""` on an `integrated` ticket throws `DELIVERY_EVIDENCE_MISSING`, and
  the refused write leaves the stored record untouched. A two-call sequence is
  therefore judged exactly as a one-call one.
- **`deliveryTargets` is the single definition of "hotfix".** It is the only
  place the question is answered, and `merge-gate.ts`, `store.ts` (both the
  backport derivation and the `DELIVERY_NO_BACKPORT_REQUIRED` refusal) and
  `execution-packet.ts` all route through it, so they cannot disagree. It reads
  a **recorded** `delivery_branch` equal to the release branch on a project
  whose release branch differs from its integration branch. A branch literally
  named `hotfix/urgent` is not a hotfix; on a main-only policy nothing can be.
- **`WRONG_TARGET` today.** It sits in `SOFT_CODES`, and `levelFor` returns
  `warning` unless strict. Observed: a PR into the wrong branch produces
  `level: warning`, `outcome: "warn"` and leaves `ok: true` — it advises and
  does not block. An absent `baseRef` is `skipped`, never guessed at `main`.
  The configured integration branch passes. Under `KANMER_GATE_STRICT` the same
  wrong target becomes `level: error` with `ok: false`. `check-pr.mjs` reads the
  env var and passes `strict` through; the level is not read from the
  environment inside core.
- **Surface is additive.** `plugin:check` reports 39 tools matching, with the
  committed bundle's bytes matching source. No board-format bump;
  `version.ts`, `migrate.ts` and `step-packet.ts` are untouched. Kanmer's own
  board declares no `delivery:` block, so it runs on the default path.

## Hosted CI evidence

The decisive control is the `push`-event run of *Pull request verification* on
`main` at this exact merge SHA, which runs the identical `npm run verify` on
`windows-latest`.

- **First attempt — run 33142774219 — FAILURE.** One test failed:
  `src/store.test.ts > KanmerStore > "updates fields and stamps updated"`,
  with `Test timed out in 5000ms` and a teardown
  `ENOTEMPTY: directory not empty, rmdir ...kanmer-test-Vugp5T/.kanmer`.
  548/549 tests passed and `src/delivery.test.ts` passed 48/48. This attempt is
  retained in `attempts[]` and is not erased by the later green.
- **Second attempt — same run id, same headSha, no code change — SUCCESS.**
  Job `verify` and its rail step both concluded success.

That failure is the known Windows timing/teardown class, and it is not
attributable to this change:

1. `store.test.ts` is **not modified** by this PR (it is CORE-128's lane, and
   the plan explicitly forbade touching it).
2. The same test passed locally at the exact merge SHA, 549/549.
3. The identical hosted rail passed at the identical SHA on re-run.
4. The modified code path cannot have slowed it. In `updateItem` the new board
   read is `board ??= await this.getBoard()` **guarded by**
   `touchesDelivery(pruned)`, and the failing test writes no delivery field, so
   an ordinary update gains no I/O — only a `some()` over eight keys.
5. The ten preceding push runs on `main` were green, and this SHA is green on
   re-run, so the signal is intermittency rather than a step change.

Locally, `npm run verify` exits 1 **solely** on
`scripts/antigravity-plugin-config.test.mjs` with `EBUSY` twice — the host-only
defect owned by **CORE-128**, recorded and not chased, and that file was not
edited. Because the rail is fail-fast, rail steps 3-13 were then run
individually and all passed, including `smoke.mjs` 335/335, `smoke:protocol`
50/50, `smoke:discovery` 13/13, `verify:agents-block` 31/31 and `plugin:check`.

## Recorded defect — owned by CORE-132, not a blocker here

`packages/mcp-server/src/index.ts:1045` builds the dispatch verification prompt
as:

```ts
const verificationTarget = resolveDelivery(await store.getBoard()).integrationBranch;
```

It reads `.integrationBranch` directly instead of routing through
`deliveryTargets(policy, item).verificationTarget`, which is the ticket's own
stated single definition of a target. For a recorded hotfix on a project whose
release branch differs from its integration branch, `dispatch_task` would
therefore point verification at the integration branch when the change was
delivered on the release branch. Confirmed present at this SHA.

It is **not** failed against CORE-116: it blocks no in-scope acceptance
criterion (AC1 is main-only, where the two values are identical; AC5 concerns
backport recording, not the dispatch prompt), the packet and merge gate — the
surfaces the in-scope criteria are stated over — both route through
`deliveryTargets` correctly, and it has a named owner in **CORE-132**.

## Verdict

**PASS** at `28a12643f1721cf7607ce5427f55fae281ba5026`. Every in-scope FRD-031
criterion is mechanically demonstrated against disposable `mkdtemp` boards, the
authoritative hosted rail is green at this exact SHA, and the only local rail
failure is a recorded host-only defect owned by another ticket.
