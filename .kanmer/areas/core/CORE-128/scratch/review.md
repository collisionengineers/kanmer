---
kind: review-attestation
pr: "300"
head_sha: "1d1f09b42587f82d1acd9d013d3a9ad6b18161f8"
verdict: pass
reviewer: "independent-reviewer-agent"
independent: true
plan_hash: "96134493486036c1"
ticket_updated: "2026-08-28T07:11:19.317Z"
threads_snapshot:
  - id: "PRRT_kwDOT2PEds6dEfs4"
    author: "chatgpt-codex-connector"
    path: "scripts/antigravity-plugin-config.test.mjs"
    severity_claimed: "P1"
    finding: "F-001"
    resolved_at_review: false
  - id: "PRRT_kwDOT2PEds6dEyEp"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/tunnels/cloudflared.test.mjs"
    severity_claimed: "P2"
    finding: "F-003"
    resolved_at_review: false
  - id: "PRRT_kwDOT2PEds6dEyEu"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/io.ts"
    severity_claimed: "P2"
    finding: "F-002"
    resolved_at_review: false
checks:
  - name: "verify"
    required: true
    conclusion: "SUCCESS"
  - name: "kanmer-gate"
    required: true
    conclusion: "SUCCESS"
  - name: "regate"
    required: false
    conclusion: "SKIPPED"
findings:
  - id: "F-001"
    severity: minor
    summary: "The reason-carrying `t.skip` in scripts/antigravity-plugin-config.test.mjs fires on `is not recognized as an internal or external command`, which after the env fix is dominated by the launcher-token-regression signature; a future regression could present as a skip rather than a failure."
    disposition: accepted-risk
    reason: "The ticket body and plan §Do-not-modify explicitly authorise this skip. The primary guard is unaffected: `validate()` asserts `deepEqual(entry.args, expected)` against the shipped plugins/kanmer/mcp_config.json, so any regression of the shipped token fails the first test in the file before the cmd.exe cases run. The skip can therefore only mask a change that edits the shipped config and the test's `expected` constant together. It did not fire (node:test reported `skipped 0`), and the verification hand-off names `skipped 2` as reportable-INCONCLUSIVE, not a pass."
  - id: "F-002"
    severity: minor
    summary: "io.ts's doc comment for removeTreeWithRetry claims `~1 s of patience`, but Node's recursive rm applies linear backoff (`retries * retryDelay`), so maxRetries:10 / retryDelay:100 is 100+200+...+1000 = 5500 ms worst case."
    disposition: accepted-risk
    reason: "Verified against Node's internal/fs/rimraf: `const delay = retries * options.retryDelay`. The behaviour is still bounded, correct and safe; only the comment is wrong. It matters because this ticket's discipline is that every budget comment names what it accommodates, and because removeTreeWithRetry now sits inside kanmerGit.ts's orphan-migration critical section (measured 17-19 s) against the new ~32 s waiter budget, so real headroom is ~9 s rather than the ~14 s the comment implies. Still fits; recorded rather than blocked."
  - id: "F-003"
    severity: minor
    summary: "cloudflared.test.mjs's inline Promise.race hang guard never clears its timer, so the node:test process stays alive for the full 30 s (was 1 s) after the assertion settles, adding ~29 s to every test:http run."
    disposition: accepted-risk
    reason: "Reproduced independently: an 8 s guard held a node:test process for 8015 ms after the test passed in 1.6 ms. Deterministic, bounded, and with no correctness effect - the rejection matcher is unchanged. Noted as self-inconsistent because supervisor.test.mjs in the same directory already wraps its guard in `finally { clearTimeout(timer) }`; recommended for the next touch of that file rather than a re-spin of this PR."
  - id: "F-004"
    severity: note
    summary: "AGENTS.md now has a second gotcha numbered `20`, and origin/main has since added a gotcha `21`."
    disposition: accepted-risk
    reason: "scripts/check-doc-numbering.mjs covers only ADR/FRD/PRD filenames, so no rail step fails. The consequence is cosmetic: the new gotcha's own cross-references ('gotcha 20(c)', quoted by the report and by AGENTS.md itself) will not match the rendered ordinal."
  - id: "F-005"
    severity: note
    summary: "SKILL-036 (70d23efd) landed 15 new bare `rmSync(..., { recursive: true, force: true })` calls in scripts/verify-skill-prose.test.mjs after this branch converted that file, so the auto-merged file carries 11 helper calls and 15 bare ones."
    disposition: accepted-risk
    reason: "Drift introduced on main, not by this PR; this PR converted every removal present at its base and no bare recursive removal remains in any test file at head. The new AGENTS.md gotcha 20(a) is precisely the instruction that catches this on the next touch. Not grounds to hold #300."
  - id: "F-006"
    severity: note
    summary: "kanmerGit.ts's orphan-migration waiter can now block ensureBoardWorktree (GUI project open, index.ts:705 and the retry at :991) for up to ~32 s under contention, where it previously failed at ~2.1 s."
    disposition: accepted-risk
    reason: "Bounded and verified: the ladder is 14 delays summing to 32145 ms, then the claim throws. Stale-owner recovery is genuinely untouched - recoverStaleLock still refuses to reclaim while processAlive(pid) holds and the identity matches, so the ladder exceeding DEFAULT_LOCK_STALE_MS (30 s) cannot steal a live lock; the age gate is necessary, never sufficient. Trading a fast wrong answer (migration reported unavailable on a lost race) for a slow correct one is the right direction, and it only engages under real contention."
  - id: "F-007"
    severity: note
    summary: "The ten-run clean-verify streak was measured at 7061045b, not re-measured at the final head 1d1f09b4."
    disposition: accepted-risk
    reason: "The delta is seven mechanical teardown conversions, REAL_GIT_*_TIMEOUT_MS 30 s -> 120 s, and the closeProject teardown fix - all monotonically risk-reducing and incapable of reintroducing a family member. Covered by 3/3 clean runs at the final head (two loaded) and an independent green hosted-Windows `verify` on 1d1f09b4. kanmer-verify re-runs the rail at the merge SHA, which is where the binding evidence belongs."
---

# Review attestation — CORE-128 (PR #300)

Independent review of `1d1f09b42587f82d1acd9d013d3a9ad6b18161f8` against the packet
(`plan` `96134493486036c1`, `files`, `checklist`, post-implementation report), FRD-035, and
AGENTS.md. Verdict **pass**.

## Assertion integrity — the central claim, checked independently

The implementer's central claim is that nothing was quarantined and no assertion weakened.
I verified it mechanically rather than reading the report:

- **Removed/loosened assertions: none.** A `-`-side sweep of the whole diff for
  `expect(` / `assert.` / `.toBe` / `.toEqual` / `.toThrow` / `.rejects` / `.resolves` returns
  exactly **one** line, and its `+`-side counterpart is byte-identical except for the hang-guard
  constant `1_000` -> `30_000` inside a `Promise.race`. The rejection matcher
  `/TUNNEL_CHILD_EXITED_BEFORE_READY/` is unchanged. Net across the diff: one assertion line
  changed on each side, and they are the same assertion.
- **New `.skip`/`.only`/`.todo`: two**, both the same reason-carrying conditional `t.skip()` in
  `scripts/antigravity-plugin-config.test.mjs`. `node:test` reported `skipped 0` across the
  sweep, so neither fired and both `cmd.exe` cases really executed. See F-001 for the residual.
- **The two cases that deliberately assert `TUNNEL_READINESS_TIMEOUT` at `timeoutMs: 5` are
  untouched** — the diff contains zero hunks matching `timeoutMs: 5,`, and both remain at head.
- **Every raised budget carries a comment naming what it accommodates.** I enumerated the
  complete set of non-mechanical changes across all 52 files by filtering the diff down to lines
  that are neither an import, a comment, nor a `rm` -> `removeTreeWithRetry` substitution. The
  result is exactly nine edits — the two `REAL_GIT_*_TIMEOUT_MS` constants, two `beforeEach` hook
  budgets, `http.test.mjs`'s `spawnSync` timeout, the two `readiness.test.mjs` budgets,
  `supervisor.test.mjs`'s `waitFor` default, `cloudflared.test.mjs`'s hang guard — plus the
  `closeProject` teardown fix and the `http.test.mjs` cap-test synchronisation. Each carries its
  comment. That set matches the report with no undeclared extras.
- **One change strengthens a test:** `http.test.mjs`'s in-flight-cap case replaced `await wait(5)`
  — a hope that the first request had reached the authorizer — with a promise the authorizer
  itself resolves. "The cap is occupied" is now an observation, not a guess.
- **No bare recursive removal remains in any test file at head**, and no `removeTreeWithRetry`
  call is unawaited (`scripts/auto-run-state.test.mjs:54` returns the promise from a concise
  arrow to `t.after`, which node:test awaits).

**Finding: the claim holds.** Nothing was quarantined, no assertion was removed, loosened or
disabled, and no test was effectively turned off.

## The antigravity environment deletion (highest-judgement edit)

Deleting `NoDefaultCurrentDirectoryInExePath` from the **child** env is correct, and it does not
mask the incompatibility.

The subject of these two tests is the launcher-token contract — that a quote-free `pushd`+`call`
token reaches the shim when `LOCALAPPDATA` contains spaces. The variable is not part of the
environment Antigravity launches in: it is absent from the user and machine scopes, from an
interactive shell, and from the hosted runner, and is injected only by the agent harness that
happens to be running the test. Forwarding `{ ...process.env }` wholesale therefore let the test
*runner's* environment change the *subject under test*. Controlling it in the fixture is the same
discipline the test already applied to `LOCALAPPDATA`. The diagnosis is well evidenced by the
asymmetry it explains: 100 % failure under an agent, 0 % elsewhere, hosted CI green throughout.

The genuine product gap — that the shipped token cannot resolve the shim on a host that really
does define the variable — is not hidden. It is recorded in AGENTS.md gotcha 20(c) ("**The shipped
launcher token itself is still subject to this** … that is a launcher question (gotcha 13), not a
test question"), in `files` §Out of scope, and in the report's follow-ups. Scoping it to the
launcher's own ticket is right: the plan's *Do not modify* list forbids touching the token
(gotcha 13's hard-won contract), and hardening it is a product decision with its own acceptance
criteria. Correct call, honestly scoped.

## The `kanmerGit.ts` lock change (the only real behaviour change)

Sound, bounded, and stale-owner recovery is genuinely untouched.

- **Bounded.** `ORPHAN_MIGRATION_LOCK_RETRY_MS` is 14 delays summing to **32 145 ms**; the claim
  loop runs `attempt = 0..delays.length` and then throws. A genuinely stuck holder is still
  reported, never waited on forever.
- **Stale recovery untouched.** The ladder now runs past `DEFAULT_LOCK_STALE_MS` (30 s), so I
  checked whether a waiter could reclaim a live 17-19 s holder. It cannot: `recoverStaleLock`
  gates on `Math.max(persistedAge, filesystemAge) >= staleAfterMs` **and then** on
  `processAlive(record.pid)` plus an identity match, returning `false` while the owner lives and
  failing closed when identity is unavailable. Age alone never authorises reclaim. No option
  touching `staleAfterMs`, the record format or `recoverStaleLock` appears in the diff.
- **Right direction.** The old behaviour reported the migration *unavailable* after ~2.1 s on a
  lost race — a fast wrong answer. The new behaviour is a slow correct one, engaging only under
  real contention. Recorded as F-006 because `ensureBoardWorktree` is on the GUI project-open path.
- The added `removeTreeWithRetry(quarantine)` sits inside the critical section and can add up to
  5.5 s worst case (F-002), so headroom against the 32 s waiter is ~9 s rather than ~14 s. Still
  fits.

## Rebase

**Not needed.** `git merge-tree --write-tree origin/main 1d1f09b4` produces a clean tree with no
conflicts and GitHub reports `mergeable: true`; the base is still `28a12643` and only three files
overlap (`AGENTS.md`, `packages/mcp-server/src/reconciliation.test.mjs`,
`scripts/verify-skill-prose.test.mjs`), none with colliding hunks. CORE-131's new
`packages/core/src/reconciliation.test.ts` contains no filesystem removals, so it needs no
conversion, and the new `packages/core/vitest.config.ts` only raises its budgets.

The repo also handles base movement by design rather than by rebase: `pr.yml`'s `regate` job
re-runs **only** `kanmer-gate` for open PRs when `main` moves, and `verify` is deliberately
re-run on the push to `main` so "every merge SHA gets a bound `verify` result for kanmer-verify".
Requiring a re-verified base here would invent a policy the project does not have, and the merge
SHA is exactly what kanmer-verify proves next. The one substantive consequence of the moved base
is recorded as F-005.

## Acceptance checks

| Plan acceptance check | Result |
|---|---|
| `removeTreeWithRetry` is a public `@kanmer/core` export reached by callers in all four trees | Met. Exported from `io.ts`; imported by core, mcp-server, scripts and gui tests, and by `kanmerGit.ts` in production. |
| Negative evidence — the reproduction fails before and passes after | Met. Recorded per lever in the report, including the antigravity case that was 0/6 before and 4/4 with `skipped 0` after. |
| Regression boundary — lock semantics, readiness *assertions*, launcher token, shipped shim unchanged | Met and independently checked; `timeoutMs: 5` cases untouched, `mcp_config.json` and the shim absent from the diff. |
| No weakened assertion | Met — verified above. |
| Ten consecutive clean `npm run verify`, >= three loaded | Met at `7061045b` (10/10 exit 0, runs 1-3 loaded), with the head gap declared and dispositioned as F-007. |

FRD-035 is a reference, not a surface this ticket implements; nothing in the diff blocks any of
its five acceptance criteria, and the rail determinism AC1/AC5 depend on is what this ticket
restores. Deviations 1-4 in the report (identical bundle bytes, scope growth to two production
files, the narrowly-applied GUI extension, the discarded concurrent sweep) are each recorded
rather than silent, which is what the plan's deviation rule requires. Two checklist boxes are
ticked in the Progress notes rather than in the list body; the evidence for both is present.

## Residual risk

F-001 through F-007 are all dispositioned `accepted-risk` above. None is a blocker or a major,
none blocks a named FRD-035 acceptance criterion, and per FRD-034 they remain as explicit
residual risk on this attestation rather than as new tickets.

## Recommendation outside this attestation

The Windows process-identity probe (`defaultProcessIdentity`'s synchronous
`execFileSync("powershell.exe", …)`: ~776 ms self / ~1103 ms foreign and never cached, blocking
the event loop on the first locked board write of every process) is recommended to the operator
as deserving its own ticket. It is a measured **production** latency defect rather than residual
risk of this diff, it now also sits inside the enlarged 32 s orphan-migration waiter path, and
fixing it is a lock-contract change needing its own plan. Measurements are in `scratch/research.md`.
Not filed here.
