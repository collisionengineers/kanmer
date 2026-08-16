# Proof — GUI-066

Verified on **merged `main`**, not the feature branch.

```
$ git log --oneline -1
0c4ffda Make release.mjs verify every published asset, not just latest.yml (GUI-066) (#45)
```

PR [#45](https://github.com/collisionengineers/kanmer/pull/45), merged
2026-08-16T23:07:38Z. Branch commits `fade11c` + `2b83cb2`, squashed to
`0c4ffda`. Working tree clean apart from untracked files that predate this
ticket.

---

## 1. `npm run test:scripts` — the new fixture suite

```
$ npm run test:scripts
> node --test "scripts/*.test.mjs"

ℹ tests 41
ℹ suites 6
ℹ pass 41
ℹ fail 0
ℹ duration_ms 382.3924
```

**41/41 green.** Six suites: the golden fixtures from the three real releases,
the previously-unrecorded failure modes, `expectedAssets` derivation, the sanity
floor, the network layer, and the helpers.

## 2. `npm run typecheck` — every workspace

```
$ npm run typecheck
> @kanmer/core@0.1.0 typecheck
> @kanmer/mcp-server@0.1.0 typecheck
> @kanmer/ui@0.2.0 typecheck
> @kanmer/gui@0.3.2 typecheck
```

Clean, and **all four workspaces named** in the output (per `AGENTS.md` §10.3 —
a partial typecheck says nothing about what it skipped).

## 3. `npm test`

```
$ npm test
@kanmer/core   Test Files  9 passed (9)        Tests  193 passed (193)
@kanmer/gui    Test Files  1 failed | 20 passed (21)
               Tests       1 failed | 216 passed (217)
               FAIL  src/main/kanmerGit.test.ts > renameBoardBranch >
                     keeps the history, the path and the remote consistent
```

`@kanmer/core` **193/193**. `@kanmer/gui` **216/217**.

The single failure is **[[GUI-085]]**, pre-existing on `main` and unrelated to
this ticket: every test in `kanmerGit.test.ts` shells out to real `git` and takes
4.6–8.7 s against vitest's 5 s default `testTimeout`, so whichever loses the race
times out and the `afterEach` `rmSync` then throws `EPERM`/`ENOTEMPTY` on the
Windows temp dir. It is a **different test each run** — `renameBoardBranch` here,
`ensureBoardWorktree reconciliation` on other runs. Established as pre-existing
by reproducing it with this branch's changes stashed and from the main checkout;
this change touches nothing under `apps/gui/` or `packages/core/`.

## 4. The integration proof — real releases, read-only, no release cut

This is the ticket's acceptance criterion *"simulate a missing asset … and
confirm the script fails rather than reporting success"*, satisfied against the
genuinely still-broken **v0.3.0** rather than a contrived draft release.

```
$ node scripts/verify-release-assets.mjs 0.3.2
verifying collisionengineers/kanmer v0.3.2 against ...\apps\gui\release
  expected 3 asset(s): Kanmer-Setup-0.3.2.exe, Kanmer-Setup-0.3.2.exe.blockmap, latest.yml

PASS: every expected asset of v0.3.2 is present, uploaded, and byte-identical to the local build
EXIT=0

$ node scripts/verify-release-assets.mjs 0.3.1
  expected 3 asset(s): Kanmer-Setup-0.3.1.exe, Kanmer-Setup-0.3.1.exe.blockmap, latest.yml
  note: ...latest.yml describes version 0.3.2, not 0.3.1 — latest.yml is checked
        for PRESENCE only, its bytes are not compared

PASS: every expected asset of v0.3.1 is present, uploaded, and byte-identical to the local build
EXIT=0

$ node scripts/verify-release-assets.mjs 0.3.0
  expected 3 asset(s): Kanmer-Setup-0.3.0.exe, Kanmer-Setup-0.3.0.exe.blockmap, latest.yml

  [error] Kanmer-Setup-0.3.0.exe.blockmap: not present on the release
          (have: Kanmer-Setup-0.3.0.exe, latest.yml)

FAIL: v0.3.0 has 1 problem(s) that make the release incomplete
EXIT=1
```

**This is the whole ticket in three commands.** v0.3.0 is the release that passed
the *old* gate while missing its blockmap; it now fails, for exactly that reason
and nothing else. The passing cases are not vacuous — "byte-identical" means the
local `Kanmer Setup 0.3.2.exe` sha256s to `94f106…`, which is precisely the
`digest` GitHub reports for the published `Kanmer-Setup-0.3.2.exe`. Zero bytes
were downloaded to establish that.

## 5. The sanity floor really fires (no vacuous pass)

The derivation reads the disk, so the dangerous failure is an expected set so
small the check cannot fail. Asking for a version with no local artifacts:

```
$ node scripts/verify-release-assets.mjs 0.9.9
  expected 1 asset(s): latest.yml

  [error] (expected set): the expected set for 0.9.9 contains no .exe — the local
          pack output is missing or --dir points at the wrong directory
          (have: latest.yml)

FAIL: v0.9.9 has 1 problem(s) that make the release incomplete
EXIT=1
```

It refuses rather than passing against an almost-empty set.

## 6. "The release is broken" is never confused with "the check could not run"

Distinct exit codes, demonstrated live with a bad token:

```
$ GITHUB_RELEASE_TOKEN=ghp_definitelynotarealtoken000000000000 \
    node scripts/verify-release-assets.mjs 0.3.2

verification could not run (auth): GitHub rejected the token (401) — the CHECK could not run
  fix: set GH_TOKEN (or GITHUB_RELEASE_TOKEN / GITHUB_TOKEN) to a PAT with repo scope
EXIT=2
```

**Exit 2**, not 1 — the same release that returns exit 0 in §4. Without this the
verifier would eventually become the thing that blocks releases.

## 7. Refusals are legible again (the bug found in review)

`refuse()` used `process.exit(1)`, which after a `fetch()` trips libuv on Windows
and kills the process with **127** plus an `Assertion failed: !(handle->flags &
UV_HANDLE_CLOSING)` banner printed under the refusal — indistinguishable from a
crash. Reproduced 3/3 before the fix. After it:

```
$ node scripts/release.mjs
release refused: no version given
  fix: node scripts/release.mjs <version> [--dry-run]
EXIT=1

$ node scripts/release.mjs v1.2.3
release refused: version "v1.2.3" starts with "v"
  fix: pass "0.2.0", not "v0.2.0" — the publisher throws on a leading v, and the git tag gets its own v prefix
EXIT=1

$ node scripts/release.mjs 0.1.0
release refused: version 0.1.0 is not greater than the current 0.3.2
  fix: pick a higher version — allowDowngrade is off, so clients ignore anything lower
EXIT=1
```

Clean exit **1**, no assertion banner. These are pre-flight refusals, so nothing
was built, tagged or published to obtain them. This also repaired the
pre-existing refusal after the `/releases/latest` fetch in §9a.

---

## What this does NOT prove

**The re-publish path is unproven until a real release.** Stated plainly rather
than papered over, as the operator asked. `verifyAssets` returning
`ok: false` is unit-tested, the bound of exactly one repair pass is readable in
`release.mjs` (one `run(...)`, no loop), and the second-failure refusal text is
reviewable — but **nothing here actually invokes
`npx electron-builder --win --publish always` a second time**. The only honest
exercise of that path is the next real release. The same goes for
`EP_GH_IGNORE_TIME` being effective in the repair pass: the mechanism is
source-cited (`gitHubPublisher.js:85-96`, `:126-131`) but not executed here.

Also not run, deliberately: **`scripts/release.mjs` was never executed past
pre-flight.** Verification for this ticket is read-only against releases that
already exist. Nothing was built, tagged, published or mutated on GitHub.

## Accepted gap, re-confirmed live

**v0.3.0 is still missing `Kanmer-Setup-0.3.0.exe.blockmap` on GitHub** — §4 above
is the confirmation, taken today. Operator declined the backfill; clients still on
0.3.0 pay one full ~78 MB download on their next update and are then current.
Recorded in `plan.md`, `AGENTS.md` gotcha 12, the FRD-021 amendment, and
`release.mjs`'s residual manual checklist so it cannot read as forgotten.

## Governing doc

`docs/functional/frd/FRD-021-auto-update.md` **R3** — release discipline enforced
by `release.mjs`. Met and strengthened; the requirement text is unchanged and an
"Amended — GUI-066" as-built section was appended, following the existing
"Amended — GUI-064" pattern. Verified on merged main that `FRD-021:10` is
byte-identical to before.

## The durable outcome

`npm test` now runs `test:scripts`, and `npm test` is **step 1 of the release
GATE** in `release.mjs` and **item 1 of `AGENTS.md` §10**. The golden fixtures
from the three releases that actually failed therefore gate every future release
and every pre-merge check — which is worth more than the verifier itself.
