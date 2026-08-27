---
kind: proof-record
merged_sha: "f3060b063b6f206603ac35c3b595d21752dff3f6"
environment: "Detached worktree .worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6 (HEAD f3060b063b6f206603ac35c3b595d21752dff3f6, no branch, clean) on Windows 11 Pro 10.0.26200; node v24.15.0, npm 11.14.1; deps from `npm ci` at that SHA"
verified_at: "2026-08-27T22:53:14Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T22:22:10Z"
    command: "gh pr view 294 --json state,mergeCommit,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: 'state MERGED, mergeCommit.oid f3060b063b6f206603ac35c3b595d21752dff3f6, url https://github.com/collisionengineers/kanmer/pull/294 — matches the expected merge SHA; everything below is bound to it.'
  - attempted_at: "2026-08-27T22:24:05Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6 f3060b063b6f206603ac35c3b595d21752dff3f6"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Preparing worktree (detached HEAD f3060b06) — HEAD is now at f3060b06 'Surface multi-project registry health and active-controller state in the GUI (GUI-144) (#294)'. The path did not previously exist; .worktrees/kanmer and .worktrees/gui-144 were not touched."
  - attempted_at: "2026-08-27T22:24:40Z"
    command: "git -C <verify worktree> rev-parse HEAD; git -C <verify worktree> symbolic-ref --short -q HEAD; git -C <verify worktree> status --short --branch"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "rev-parse = f3060b063b6f206603ac35c3b595d21752dff3f6 (exact merge SHA); symbolic-ref empty (detached); status '## HEAD (no branch)' with no working-tree entries (clean). Re-asserted clean and at the same SHA at 22:53:14Z after every run."
  - attempted_at: "2026-08-27T22:25:00Z"
    command: "git -C <verify worktree> diff --stat 9c9a6980..f3060b06"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "14 files, +1843/-9, confined to apps/gui/** (main projectRegistry.ts + test, ipc.ts, preload, App.tsx, Settings.tsx, ProjectRegistry.tsx + tests, Settings.projects.test.tsx, styles.css, chapters.generated.ts) and docs/manual/{connect.md,settings.md}. Nothing in packages/core, packages/mcp-server or scripts/ — the basis for attributing the host-quirk failures below to the environment rather than to this change."
  - attempted_at: "2026-08-27T22:26:20Z"
    command: "npm ci"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "Workspace install completed at the merge SHA (audit advisories reported, no install failure)."
  - attempted_at: "2026-08-27T22:29:30Z"
    command: "npm run build -w @kanmer/core"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "tsup ESM + DTS build success (dist/index.js 238.21 KB, dist/index.d.ts 86.59 KB). Built inside the disposable worktree only; the shared packages/core checkout was not touched."
  - attempted_at: "2026-08-27T22:29:53Z"
    command: "npm run typecheck -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "tsc --noEmit for tsconfig.node.json and tsconfig.web.json — no diagnostics."
  - attempted_at: "2026-08-27T22:30:01Z"
    command: "npx vitest run src/main/projectRegistry.test.ts src/renderer/src/components/ProjectRegistry.test.tsx src/renderer/src/components/Settings.projects.test.tsx --root apps/gui"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "3 files / 27 tests passed (17 main + 7 ProjectRegistry + 3 Settings.projects) — the expected 27. Includes 'shows two projects with distinct health and only the selected one is mutable' and 'lets a mutation act only on the endpoint bound to the sender's selected project (F-003)'."
  - attempted_at: "2026-08-27T22:31:00Z"
    command: "npm test -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "53 test files / 520 tests passed — exactly the expected shipped counts. kanmerGit.test.ts (including ensureBoardWorktree reconciliation) passed in this run; no host timeout quirk hit."
  - attempted_at: "2026-08-27T22:34:40Z"
    command: "npm run check:manual"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "Generated manual mirror is current for the committed docs/manual sources."
  - attempted_at: "2026-08-27T22:34:45Z"
    command: "npm run verify:docs"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: "manual up to date (22 chapters); 'verify-docs: PASS — document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current'."
  - attempted_at: "2026-08-27T22:34:57Z"
    command: "npm run verify (attempt 1 of 2)"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 1
    result: FAIL
    summary: "Build 0; check:manual 0; @kanmer/core 19 files / 417 tests 0; @kanmer/gui 54 files / 524 tests 0 (54/524 because the verification-only acceptance harness described below was present in the tree for this run — the shipped suite alone is 53/520, proven by the standalone run above and by attempt 2); FAILED in @kanmer/mcp-server test:http with 2 of 124: (i) src/http.test.mjs:65 'project resolution fails before binding and leaves no listener' — AssertionError from `spawnSync C:\\Program Files\\nodejs\\node.exe ETIMEDOUT` (errno -4039), the documented host spawn quirk; (ii) src/tunnels/readiness.test.mjs:59 'readiness accepts only a bounded successful loopback /ready response' — TUNNEL_READINESS_TIMEOUT on a bounded loopback poll under load. Both are timing/OS failures in packages/mcp-server, which this ticket's diff does not touch, and both passed on rerun (attempt 2: test:http 124/124, fail 0). Retained as required."
  - attempted_at: "2026-08-27T22:38:30Z"
    command: "MANUAL ACCEPTANCE (a)-(d): headless main-process exercise of apps/gui/src/main/projectRegistry.ts via a temporary verification-only vitest file (apps/gui/src/main/zzVerifyAcceptance.test.ts) against mkdtemp COPIES of .worktrees/kanmer/.kanmer and a throwaway registry file — first observed inside attempt 1's @kanmer/gui stage, then re-run standalone: npx vitest run src/main/zzVerifyAcceptance.test.ts --root apps/gui"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 0
    result: PASS
    summary: >-
      4/4 passed, twice (inside attempt 1 at 22:38:30Z and standalone at 22:45:09Z, exit 0 both times).
      (a) observeRegistry over five endpoints backed by three board copies: 'alpha' health ok / project_id 0bdce1b0-e233-4b3d-857b-d5df7c6b285e / selected true, 'beta' health ok / project_id e2bb4e39-621a-4544-be18-48e88298cf12 / selected false — distinct project_ids — and 'gamma' health unassigned / project_id null, so the observed health set is exactly {ok, unassigned, missing-board}; alpha reported 363 tickets, 1 live controller and 14 workspaces, beta the same ticket count from its own copy. A sha256 hash of every file in each of the three board copies, taken immediately before and after the observation, was byte-identical — observation wrote nothing to any board.
      (b) assertSelectedEndpoint accepted both 'alpha' and 'alpha-mirror' (two registry names bound to the one selected project) and refused 'beta' and 'gamma' with `REGISTRY_NOT_SELECTED: "beta" is not the selected project ("alpha", "alpha-mirror")`.
      (c) writer.add('alpha', ...) rejected with REGISTRY_NAME_EXISTS and the registry file was byte-identical afterwards; against a deliberately malformed registry, writer.add rejected with REGISTRY_MALFORMED, the malformed bytes were left untouched and no .tmp- leftover remained; a genuinely new name ('epsilon') still wrote and removed cleanly, so the refusal is name-scoped rather than a blanket failure.
      (d) the endpoint pointing at a path with no board reported health missing-board with problem 'no .kanmer board at <temp path>', project null and selected false.
      Live board, live registry and ~/.kanmer/endpoints.json were never read as writable targets and never modified; the temp file was deleted afterwards and the worktree re-asserted clean.
  - attempted_at: "2026-08-27T22:45:18Z"
    command: "npm run verify (attempt 2 of 2, after removing the temporary acceptance file)"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: 1
    result: FAIL
    summary: "Build 0; check:manual 0; @kanmer/core 19 files / 417 tests 0; @kanmer/gui 53 files / 520 tests 0 (the expected shipped counts); @kanmer/mcp-server test:http 124/124, fail 0 (attempt 1's two failures did not reproduce); FAILED only in test:scripts with 2 of 121: scripts/antigravity-plugin-config.test.mjs:47 and :73, both `EBUSY: resource busy or locked, rmdir 'C:\\...\\Temp\\kanmer-agy-*\\Kanmer Test Space\\Kanmer\\bin'` — the documented Windows file-lock teardown quirk (EBUSY x2), in a script this ticket's diff does not touch. Recorded exactly, not chased."
  - attempted_at: "2026-08-27T22:46:30Z"
    command: "gh run list --commit f3060b063b6f206603ac35c3b595d21752dff3f6; gh run view 33122511669 --json headSha,conclusion,jobs"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Push-to-main run 33122511669 ('Pull request verification') at headSha f3060b063b6f206603ac35c3b595d21752dff3f6 completed with conclusion success in 5m07s; jobs verify: success, regate: success, kanmer-gate: skipped (push event). This is the same rail as the local `npm run verify` and it is green on the exact merged SHA, on a host without the Windows EBUSY/spawn-timeout quirks. https://github.com/collisionengineers/kanmer/actions/runs/33122511669"
  - attempted_at: "2026-08-27T22:46:40Z"
    command: "gh run view 33121178512 --json headSha,conclusion,jobs"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "PR-head run 33121178512 at 190b022ac9fa6065b9df675fd7cab4f5b5fe3302 (the reviewed head that became this merge) — conclusion success; jobs verify: success, kanmer-gate: success, regate: skipped. https://github.com/collisionengineers/kanmer/actions/runs/33121178512"
  - attempted_at: "2026-08-27T22:50:00Z"
    command: "MANUAL: drive the Electron GUI (open two projects, add each in Settings -> Projects, click 'Open project' on the non-selected card, confirm a dirty board draft prompts, confirm 'Open project' disabled for a registry entry with no board)"
    cwd: ".worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6"
    exit_code: null
    result: INCONCLUSIVE
    summary: "No Electron UI could be driven in this headless verification session, so no UI-level run is claimed. The behaviour is covered by shipped renderer tests that DID run and pass at this SHA (27/27 focused, and inside the 53/520 suite): apps/gui/src/renderer/src/components/ProjectRegistry.test.tsx — 'shows two projects with distinct health and only the selected one is mutable', 'refuses to open an endpoint whose board was not observed, so a stale pointer never becomes a fresh board (F-015)', 'opening another project goes through the App and the section follows the new selection', 'surfaces main's refusal when a mutation is aimed at a non-selected endpoint'; and apps/gui/src/renderer/src/components/Settings.projects.test.tsx — 'guards a modified board draft before opening another project, and a re-keyed Settings never saves it into that project', 'refuses to save a draft into a different project even when the caller did not re-key it', 'opens another project straight away when the board draft is clean'."
---

# Proof — GUI-144

Verified at the PR's exact GitHub merge commit
`f3060b063b6f206603ac35c3b595d21752dff3f6`
(PR [#294](https://github.com/collisionengineers/kanmer/pull/294), state `MERGED`) in the disposable
detached worktree `.worktrees/verify-gui-144-f3060b063b6f206603ac35c3b595d21752dff3f6`.
The worktree was asserted detached, clean and at that exact SHA before and after every run. No
mutable checkout, the board worktree `.worktrees/kanmer`, the implementation worktree
`.worktrees/gui-144` or any branch was modified by this verification.

## Result: PASS

Every deterministic check named for this ticket passed at the merged SHA:

| Check | Exit | Observed |
| --- | --- | --- |
| `npm ci` | 0 | install complete |
| `npm run build -w @kanmer/core` | 0 | tsup ESM + DTS success |
| `npm run typecheck -w @kanmer/gui` | 0 | no diagnostics |
| focused vitest (3 registry files) | 0 | 27/27 |
| `npm test -w @kanmer/gui` | 0 | 53 files / 520 tests |
| `npm run check:manual` | 0 | manual mirror current |
| `npm run verify:docs` | 0 | verify-docs PASS |
| `npm run verify` (local, x2) | 1 | see host quirks below |
| hosted `Pull request verification` at this SHA | success | run 33122511669 (verify, regate) |

## Why the local `npm run verify` exit 1 does not block PASS

`git diff --stat 9c9a6980..f3060b06` is 14 files confined to `apps/gui/**` and `docs/manual/**`.
Neither local rail failure is in that surface, and neither is an assertion about shipped behaviour:

- attempt 1 — `packages/mcp-server/src/http.test.mjs` `spawnSync … node.exe ETIMEDOUT` (the
  documented host spawn quirk) and `src/tunnels/readiness.test.mjs` `TUNNEL_READINESS_TIMEOUT`, a
  bounded loopback poll that timed out under load. Both passed on rerun (attempt 2: 124/124, fail 0).
- attempt 2 — `scripts/antigravity-plugin-config.test.mjs` twice with
  `EBUSY: resource busy or locked, rmdir …\Kanmer Test Space\Kanmer\bin`, the documented Windows
  file-lock teardown quirk (EBUSY x2), in a script outside this diff.

Both attempts are retained above with their exact exit codes and neither was chased. The
authoritative evidence for that rail is the hosted run of the *same* workflow on the *same* merge
commit: [run 33122511669](https://github.com/collisionengineers/kanmer/actions/runs/33122511669),
`headSha f3060b063b6f206603ac35c3b595d21752dff3f6`, conclusion **success** (`verify` success,
`regate` success). The reviewed head that became this merge,
`190b022ac9fa6065b9df675fd7cab4f5b5fe3302`, is green on
[run 33121178512](https://github.com/collisionengineers/kanmer/actions/runs/33121178512) with both
`verify` and `kanmer-gate` success.

## Manual acceptance (headless, copies only)

The Electron UI could not be driven in this session, so no UI run is claimed. Instead the shipped
main-process module `apps/gui/src/main/projectRegistry.ts` was exercised headlessly at the merged
SHA against `mkdtemp` copies of `.worktrees/kanmer/.kanmer` and throwaway registry files. The live
board, the live registry and `~/.kanmer/endpoints.json` were never written.

- **(a) Two registered projects, distinct identity and health, boards untouched.** `alpha` and
  `beta` (separate copies, separate `project.json`) both observed `health: ok` with distinct
  `project_id`s (`0bdce1b0-…` vs `e2bb4e39-…`); `gamma` (copy with no identity record) observed
  `unassigned`; the observed health set was exactly `{ok, unassigned, missing-board}`. `alpha` was
  marked `selected` for the supplied identity, `beta`/`gamma` were not. A recursive sha256 of every
  file in all three board copies was **byte-identical before and after** the observation.
- **(b) `assertSelectedEndpoint`.** Accepted both `alpha` and `alpha-mirror` — two registry names
  legitimately bound to the one selected project — and refused `beta`/`gamma` with
  `REGISTRY_NOT_SELECTED: "beta" is not the selected project ("alpha", "alpha-mirror")`.
- **(c) `writer.add`.** Refused an existing name with `REGISTRY_NAME_EXISTS`, leaving the registry
  file byte-identical; against a malformed registry it refused with `REGISTRY_MALFORMED` without
  overwriting the malformed bytes and without leaving a `.tmp-` file; a new name still wrote and
  removed cleanly.
- **(d) `missing-board`.** The endpoint whose path holds no board reported `health: missing-board`
  with `no .kanmer board at <path>`, `project: null`, `selected: false`.

The verification-only harness was deleted after the run and the worktree re-asserted clean at the
merged SHA.

## The ticket's Verification bullet

> GUI tests show two projects with distinct health and prevent accidental action against the
> non-selected project.

This is satisfied by shipped tests that ran and passed at the merged SHA — it does not require an
Electron UI run, and none is claimed. `ProjectRegistry.test.tsx` proves the first half and the
control-level half directly ("shows two projects with distinct health and only the selected one is
mutable", plus "surfaces main's refusal when a mutation is aimed at a non-selected endpoint" and the
F-015 disabled-open test); `Settings.projects.test.tsx` proves a board draft cannot follow a project
switch into another project; `projectRegistry.test.ts` proves the same rule structurally in main
("lets a mutation act only on the endpoint bound to the sender's selected project"). The headless
acceptance above reproduces the distinct-health and refusal behaviour against real board copies.

## Environment

Windows 11 Pro 10.0.26200, node v24.15.0, npm 11.14.1, dependencies installed by `npm ci` inside the
detached verification worktree.

---

## Closeout

Merged: PR [#294](https://github.com/collisionengineers/kanmer/pull/294), merge commit
`f3060b063b6f206603ac35c3b595d21752dff3f6`, merged at 2026-08-27T22:26:29Z.
