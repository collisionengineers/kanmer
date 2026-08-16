## Review — GUI-066 (PR #45)

**I am both author and reviewer. This is not an independent review and should not
be read as one.** What follows is a self-check against the diff, the plan's
Governing-docs section and the report — useful, but it is one person marking
their own work.

### 1. Changes (in the reviewer's words)

- **`scripts/verify-release-assets.mjs` (new, ~515 lines).** Four exported
  layers with a clean dependency direction: `expectedAssets` (touches disk),
  `sanityCheckExpected` (pure), `verifyAssets` (pure), `fetchReleaseAssets`
  (network only, injectable), and `verifyRelease` composing them. The CLI at the
  bottom is guarded by an `import.meta.url === process.argv[1]` check, so
  importing the module from `release.mjs` does not run it. Dependency-free.
- **`scripts/verify-release-assets.test.mjs` (new, 41 tests).** Fixtures are the
  literal API responses, not paraphrases. Verified independently during review:
  `gh api repos/collisionengineers/kanmer/releases/tags/v0.3.{0,1,2}` returns
  exactly the names/sizes/states/digests hardcoded in `GOLDEN`, and the local
  files in `apps/gui/release/` sha256 to exactly those digests. So the fixtures
  are real, and the 0.3.0 FAIL is a real absence rather than a contrived one.
- **`scripts/release.mjs`.** Four disjoint regions (header, constants +
  `EP_GH_IGNORE_TIME`, dry-run narration, §9/§10), plus the `refuse()` fix below.
  §5–§8 untouched.
- **`package.json`.** One line changed, one added. `git diff` confirms
  `package-lock.json` is **not** in the diff.
- **`AGENTS.md`, `FRD-021`.** Documentation matching the behaviour.

### 2. Comments

**C1 — BLOCKING (found in review, fixed in PR).** `refuse()` called
`process.exit(1)`. Immediately after a `fetch()`, that trips libuv on Windows:

```
release refused: ...
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
EXIT=127
```

Reproduced 3/3 with a minimal script. This matters more than a cosmetic wart, and
it is blocking for *this* ticket specifically: the operator's binding decision was
"fail loudly, do not demote, use the house `refuse(why, fix)` idiom" — and a
refusal followed by a crash banner and exit 127 cannot be distinguished from the
script crashing. It would have landed on the single most important new code path
in the change (the second-failure refusal), and it also affected the
**pre-existing** refusal after the `/releases/latest` fetch in §9a. Fixed in
`2b83cb2`: `refuse()` sets `process.exitCode` and throws a sentinel nothing
catches. Every call site unchanged; verified three refusal paths still print
correctly and exit **1**.

**C2 — non-blocking, already handled.** The same bug bit the verifier's CLI
first; that is where it was found. Fixed there before the first commit, with the
reason recorded in a comment so it does not get "simplified" back.

**C3 — non-blocking, accepted.** The expected set is derived from disk, so a
`--dir` pointing somewhere wrong could in principle produce a vacuous pass. That
is exactly what `sanityCheckExpected` exists for, and it demonstrably fires:
`verify-release-assets.mjs 0.9.9` refuses with "the expected set contains no
.exe" rather than passing against an empty set. Covered by three unit tests.

**C4 — non-blocking, deliberate.** `latest.yml` is required *by name* rather than
falling out of the version filter. This is the one place the asset set is not
purely derived, and it is justified: the manifest's name carries no version, and
it is the single file every installed client polls. The alternative (deriving it)
is impossible, and omitting it would drop the only check the script had before.

**C5 — non-blocking, out of scope, filed.** `apps/gui/src/main/kanmerGit.test.ts`
fails non-deterministically on `origin/main`. Confirmed pre-existing by stashing
this branch's changes and by running from the main checkout; this PR touches
nothing under `apps/gui/`. Filed as [[GUI-085]].

**C6 — non-blocking, stated not hidden.** The re-publish path is unproven until a
real release. Called out in the report, the PR, `proof.md` and the FRD amendment
rather than glossed.

### 3. Disposition

| # | Disposition |
|---|---|
| C1 | **fixed-in-PR** (`2b83cb2`) |
| C2 | fixed-in-PR (before the first commit) |
| C3 | won't-do — the sanity floor is the mitigation, and it is tested |
| C4 | won't-do — deliberate, and documented in the module |
| C5 | **filed-as-ticket** [[GUI-085]] |
| C6 | won't-do — a limit to state, not a defect to fix here |

### 4. Checks performed

- **Report against diff.** Every file in `git diff --stat origin/main..HEAD` is
  listed in `post-implementation-report.md` with a rationale, and the "exactly
  what changed in release.mjs, and where" section matches the actual hunks. The
  report's claim that §5–§8 are untouched is confirmed by the diff.
- **Governing docs.** `refs` is `docs/functional/frd/FRD-021-auto-update.md`. The
  plan claims **Meets R3** and **modifies as-built prose only**. Holds: R3's text
  at `FRD-021:10` is byte-identical after the change (`git diff` shows only an
  appended section), and the appended "Amended — GUI-066" follows the existing
  "Amended — GUI-064" pattern. No requirement was rewritten, so no authorization
  was needed. No ADR claimed and none needed — the design decisions were operator
  calls, and the one tooling decision is argued in the plan and recorded in
  `AGENTS.md`.
- **Operator decisions honoured**, each traced to code:
  blockmap = hard failure (`verifyAssets` emits `severity: "error"` for a missing
  asset with no special-case for `.blockmap`, plus a test asserting the severity);
  bounded single re-publish (one `run(...)` call, no loop, `let check` reassigned
  once); no demotion (the second refusal only *names* `gh release edit
  --prerelease`); `EP_GH_IGNORE_TIME` set in-script before both packs; v0.3.0 not
  backfilled and recorded in four places.
- **Open questions** — all ticked, none re-opened, no fix applied that turns on an
  unticked question.
- **Ripple effects from `files.md`** followed up: `AGENTS.md` ✅, FRD ✅, dry-run
  narration ✅, residual checklist ✅, no `package-lock.json` churn ✅ (the
  runner choice avoided it), `proof.md` gets the runnable demonstration ✅.
- **Rail:** `npm run typecheck` clean, four workspaces named. `test:scripts`
  41/41. `@kanmer/core` 193/193. `@kanmer/gui` 216/217 — sole failure is
  [[GUI-085]].
- **No unplanned extras smuggled in.** The one addition beyond the plan is the
  `refuse()` fix, which is squarely in scope: it repairs the refusal path this
  ticket's own decision depends on.

### 5. Verdict

**PASS** — with the caveat in the first line that author and reviewer are the same
agent. One blocking issue was found and fixed in the PR; one pre-existing defect
was filed rather than absorbed. Merging.
