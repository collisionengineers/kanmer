---
kind: proof-record
merged_sha: "941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
environment: "detached verification worktree .worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb at exact merge SHA; Windows, Git Bash, Node v24.15.0, npm 11.14.1"
verified_at: "2026-09-05T03:55:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T03:41:00Z"
    command: "gh pr view 322 --json state,mergeCommit,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED; mergeCommit.oid 941650317be4cad4f6a86c6ab16362ee5dd8dfdb, matching the ticket's authorised PR."
  - attempted_at: "2026-09-05T03:41:30Z"
    command: "gh run list --workflow pr.yml --event push --commit 941650317be4cad4f6a86c6ab16362ee5dd8dfdb --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "One push-event run found, databaseId 33942465093, headSha exactly the merge SHA, status in_progress at read time."
  - attempted_at: "2026-09-05T03:41:35Z"
    command: "gh run watch 33942465093 --exit-status"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Run reached status completed, conclusion success. verify job completed 03:39:44Z-03:48:10Z (8m26s wall)."
  - attempted_at: "2026-09-05T03:48:30Z"
    command: "gh run view 33942465093 --json jobs,conclusion,status,headSha,url,createdAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Run conclusion success; job verify (databaseId 101242408751, attempt 1) completed/success, headSha 941650317be4cad4f6a86c6ab16362ee5dd8dfdb, step 'Run the authoritative verification rail' success, 03:39:56Z-03:48:06Z. This is the npm run verify receipt for the exact merge SHA (HZN-009), and the first push-to-main exercise of the build-once rail on Node 24."
  - attempted_at: "2026-09-05T03:49:00Z"
    command: "gh run view 33941825803 --json jobs,conclusion,status,headSha,url (before observation, GUI-152 pre-change rail, run pre-existing)"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Before observation: push-to-main verify job for 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507 (GUI-152, pre-CORE-140 rail), completed/success, 03:25:53Z-03:35:59Z (10m06s wall). After observation (this ticket's run): 8m26s. Observation only, not a guaranteed delta — different commits, same Windows runner class, Node 24 in both cases (pr.yml was already Node 24 before this ticket per CORE-140's own diff only changing node-version lines that were already present from an earlier bump; the wall-time difference is attributed to eliminating the two nested rebuilds, not to a Node version change)."
  - attempted_at: "2026-09-05T03:50:00Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb 941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Worktree created. git -C <worktree> rev-parse HEAD == 941650317be4cad4f6a86c6ab16362ee5dd8dfdb; symbolic-ref --short -q HEAD exit 1 (detached, confirmed); status --short --branch clean, ## HEAD (no branch). Not .worktrees/kanmer or .worktrees/CORE-140."
  - attempted_at: "2026-09-05T03:50:30Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 0
    result: PASS
    summary: "Clean install, no error. Log: .worktrees/verify-logs-core-140/npm-ci.log"
  - attempted_at: "2026-09-05T03:52:00Z"
    command: "node --test scripts/verify-steps.test.mjs scripts/pr-workflow.test.mjs"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 0
    result: PASS
    summary: "10/10 pass, 2 suites (VERIFY_STEPS build-once rail; build-stamp.mjs temp git repo cases), 0 fail. Log: .worktrees/verify-logs-core-140/node-test.log"
  - attempted_at: "2026-09-05T03:52:30Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 0
    result: PASS
    summary: "Root build (core + mcp-server) succeeded. Log: .worktrees/verify-logs-core-140/build.log"
  - attempted_at: "2026-09-05T03:52:40Z"
    command: "node scripts/build-stamp.mjs --write"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 0
    result: PASS
    summary: "Stamp written to dist/verify-stamp.json. Log: .worktrees/verify-logs-core-140/stamp-write.log"
  - attempted_at: "2026-09-05T03:52:45Z"
    command: "node scripts/build-stamp.mjs --assert server standalone"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 0
    result: PASS
    summary: "'build-stamp: asserted server, standalone match the stamp'. Log: .worktrees/verify-logs-core-140/assert-pass.log"
  - attempted_at: "2026-09-05T03:53:00Z"
    command: "echo \"// verify-core-140 perturbation probe\" >> packages/core/src/types.ts && node scripts/build-stamp.mjs --assert server standalone"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 1
    result: PASS
    summary: "Assertion correctly refused: 'build-stamp: refusing — stamp dirty=false does not match current dirty=true', with the documented fix hint, never rebuilding silently. Exit 1 is the expected/correct outcome for this probe, hence PASS. Log: .worktrees/verify-logs-core-140/assert-fail.log"
  - attempted_at: "2026-09-05T03:53:10Z"
    command: "git checkout -- packages/core/src/types.ts"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 0
    result: PASS
    summary: "File restored; git status --short empty, worktree clean again."
  - attempted_at: "2026-09-05T03:53:30Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-140-941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    exit_code: 0
    result: PASS
    summary: "193/193 pass, 13 suites, 0 fail, 96.6s. Includes the new scripts/verify-steps.test.mjs alongside every other scripts/*.test.mjs. Log: .worktrees/verify-logs-core-140/test-scripts.log"
  - attempted_at: "2026-09-05T03:54:00Z"
    command: "AT-07 fresh-clone check (npm ci; npm run test:http -w @kanmer/mcp-server; npm run mcpb:check on a scratch clone) — not repeated"
    cwd: "n/a — cited, not re-run"
    exit_code: null
    result: NOT_APPLICABLE
    summary: "Already performed by the implementer (post-implementation-report.md: fresh clone at C:\\kanmer-tmp-core140, npm ci exit 0; npm run test:http -w @kanmer/mcp-server without a prior build fails identically on unmodified main at c088be13, a pre-existing gap unrelated to this ticket (deferred to CORE-145); npm run build:core then the same command passes 242/1 skipped; npm run mcpb:check on the fresh clone passes, 3 files, 1787936 bytes) and independently re-derived at the diff level by the reviewer (scratch/review.md F-003, confirmed the mechanism from packages/mcp-server's own build script). Not cheap to repeat (requires a second full scratch clone + npm ci) and adds no new evidence beyond what implementer and reviewer already recorded identically; cited per the operating instruction rather than re-run."
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33942465093
    attempt: 1
    head_sha: "941650317be4cad4f6a86c6ab16362ee5dd8dfdb"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33942465093/job/101242408751"
    covers: ["npm run verify"]
    observed_by: "claude-code verifier (HZN-009)"
---

# Proof — CORE-140 (Build each rail artifact once and refuse a stale already-built step)

## What the receipt satisfies

The push-to-`main` `verify` job on run `33942465093`, job id `101242408751`,
attempt 1, ran the authoritative verification rail (`npm run verify`) against
the exact merge SHA `941650317be4cad4f6a86c6ab16362ee5dd8dfdb` and concluded
`success`, completing in 8m26s (03:39:44Z-03:48:10Z; the "Run the
authoritative verification rail" step itself ran 03:39:56Z-03:48:06Z). Per
HZN-009's evidence rule, this hosted run is consumed as the authoritative
discharge of the full `npm run verify` obligation for this exact merged tree.

This run is also the first push-to-`main` exercise of the build-once rail
itself, since CORE-140 is the change that introduced it. As a before/after
wall-time **observation** (not a guarantee — different commits, not a
controlled A/B):

| | Run | Head SHA | Wall time (verify job) |
|---|---|---|---|
| Before (GUI-152, pre-CORE-140 rail) | 33941825803 | `32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507` | 03:25:53Z-03:35:59Z = **10m06s** |
| After (CORE-140, build-once rail) | 33942465093 | `941650317be4cad4f6a86c6ab16362ee5dd8dfdb` | 03:39:44Z-03:48:10Z = **8m26s** |

Both ran on the same Windows GitHub-hosted runner class and both were
already on Node 24 for the `verify` job (the pr.yml Node-version lines this
ticket touches were already present at 24; CORE-140's own diff to `pr.yml`
is confirmed by the reviewer's diff-level check). The ~1m40s (~17%)
reduction is consistent with, but not proof of, eliminating the two nested
rebuilds (`test:http`'s and `mcpb:build`'s prior self-builds), since CI
network/runner variance is not controlled for across two different pushes on
two different days. Recorded here strictly as an observation per the
ticket's acceptance wording ("Before/after rail wall time recorded in the
proof as an observation, not a promise").

## What the worktree checks satisfy

The detached worktree at the exact merge SHA additionally confirmed, directly,
the ticket's own named scoped-check plan: `npm ci`; `node --test
scripts/verify-steps.test.mjs scripts/pr-workflow.test.mjs` (10/10 pass);
`npm run build && node scripts/build-stamp.mjs --write` (both exit 0); `node
scripts/build-stamp.mjs --assert server standalone` immediately after the
build (PASS, "asserted server, standalone match the stamp"); the same
assertion after appending a one-line comment to a tracked source file,
`packages/core/src/types.ts` (correctly FAILs with exit 1 and the documented
"dirty digest mismatch"-class refusal, never rebuilding silently), then the
file was restored with `git checkout --` and the worktree confirmed clean;
`npm run test:scripts` (193/193 pass across 13 suites, including the new
`verify-steps.test.mjs`). All results match the implementer's
post-implementation report and the independent reviewer's own scoped-check
run (`scratch/review.md`) at the byte-identical `d15796d0` tree.

## What was cited rather than repeated

The AT-07 fresh-clone check (`npm ci` on a scratch clone, then `npm run
test:http -w @kanmer/mcp-server` and `npm run mcpb:check` without the stamp)
was already performed by the implementer and independently re-derived at the
diff level by the reviewer; both found the identical pre-existing,
unrelated-to-this-ticket fresh-clone build-ordering gap (deferred to
CORE-145) and both found `npm run mcpb:check` and the build-preceded
`test:http` pass cleanly. Per the operating instruction, this evidence is
cited rather than repeated, since it is not cheap (a second full scratch
clone + npm ci) and would add no new information.

## Reviewer's deferred findings

The independent review (`scratch/review.md`) is a `pass` verdict with seven
findings, none blocking: F-001 and F-002 (minor, static-guard fidelity gaps
in `verify-steps.test.mjs` and the dirty-digest untracked-directory blind
spot) are deferred to **CORE-144**; F-003 (the fresh-clone `test:http`
build-ordering gap) is deferred to **CORE-145**; F-004 and F-005 are accepted
risk with reasons recorded; F-006 and F-007 are `fixed` (the review
attestation itself, and the proof that the `main`-merge rebind to `d15796d0`
changed no CORE-140 file). CORE-144 and CORE-145 are not this ticket's
obligations and are not re-litigated here.

## Result

**PASS.** The hosted receipt discharges `npm run verify` for the exact merged
tree at `941650317be4cad4f6a86c6ab16362ee5dd8dfdb`, is also the first
push-to-main exercise of the new build-once rail, and its wall time is
recorded against the immediately preceding push-to-main run as an
observation. The detached-worktree checks corroborate the ticket's own named
scoped-check plan directly, including a positive assert-pass and a correct
assert-FAIL-then-restore mutation probe. Nothing failed and nothing required
here was left unavailable.
