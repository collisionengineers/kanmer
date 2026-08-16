# Plan — GUI-066: make `release.mjs` verify every published asset, not just `latest.yml`

Written FROM `research.md` and `files.md`. Every operator question is answered
in `scratch/operator-answers.md` and `scratch/notes.md`; nothing below re-opens
one.

## Approach

Extract the verification into a new dependency-free module,
`scripts/verify-release-assets.mjs`, split so the interesting part is pure and
therefore testable without a release: `expectedAssets({version, localDir})`
derives what *should* be on the release by reading `apps/gui/release/`,
filtering to the version and applying the space→dash rename; `verifyAssets({
expected, assets})` takes a plain GitHub-shaped `assets[]` and returns
`{ok, problems[]}` with no `fetch`, no `fs` and no `process.exit`; and a thin
`fetchReleaseAssets({owner, repo, tag, token, fetchImpl = fetch})` holds the one
REST call. `release.mjs` §9 then becomes: fetch `/releases/tags/v<version>`,
verify, and on a gap run **exactly one** repair `npx electron-builder --win
--publish always`, re-verify, and `refuse()` loudly if it is still broken —
without demoting the release. The alternative shapes lose on testability: doing
the checks inline in `release.mjs` (as today) means the logic can only ever be
exercised by cutting a real release, and downloading the assets to compare bytes
would cost ~78 MB per release when GitHub already hands us a `sha256` digest we
can compare against the local files the script is holding.

## Governing docs

`refs`: `docs/functional/frd/FRD-021-auto-update.md`.

- **Meets R3** ("Release discipline: `release.mjs` refuses to publish unless
  `release-notes.md` names the version; `dist:check` verifies the packaged app
  can actually self-update"). R3 is the requirement this ticket strengthens: the
  release script's post-publish proof currently verifies one of three assets, and
  R3's as-built section (`FRD-021:35-37`) cites only the stale-notes refusal and
  `dist:check`. Steps 1–5 make the script assert the *whole* published asset set,
  which is the same requirement — release discipline enforced by `release.mjs` —
  applied to the part of it that was unenforced.
- **Modifies (as-built prose only, no requirement text changes)** — step 8 adds an
  "Amended — GUI-066" section to FRD-021 recording the new as-built behaviour of
  R3: all three assets verified against the REST API, one bounded self-repair,
  `EP_GH_IGNORE_TIME` set by the script, and v0.3.0's blockmap as an accepted gap.
  This is the same pattern the doc already uses for GUI-064 (`FRD-021:46`). The
  requirement statement at `FRD-021:10` is not rewritten — the behaviour it
  describes is unchanged, only more completely implemented.
- **No new ADR.** Nothing here is an architecture decision: the transport
  (REST vs HTML scrape), the repair policy and the severity of a missing blockmap
  were all settled by the operator and are recorded in `scratch/operator-answers.md`
  and repeated in-file as comments. The one genuinely new engineering choice — the
  test runner for `scripts/` — is a tooling decision recorded below, not an ADR.

## Binding decisions carried in (do not re-derive)

1. A missing or corrupt `.exe.blockmap` is a **hard failure**, identical in
   severity to a missing installer or manifest.
2. On a detected gap: **auto-republish exactly once**, then re-verify, then fail.
   Bounded at one; a loop turns a visible failure into a hang.
3. On a second failure: **fail loudly, do not demote the release.** Use the house
   `refuse(why, fix)` idiom (`release.mjs:41-45`) and put the manual demote
   command in the `fix` string.
4. **Set `EP_GH_IGNORE_TIME` in the script.** Load-bearing, not cosmetic:
   `gitHubPublisher.js:85-96` returns `null` for a release older than 2 h without
   it and `doUpload()` (`:126-131`) then logs "skipped publishing" and returns
   with no throw and exit 0 — so the repair pass would itself silently no-op.
5. **v0.3.0's blockmap is not backfilled.** Accepted gap, recorded here (see
   "Accepted gap" below), not a task.

## The expected-set derivation, precisely

This is the part most likely to go quietly wrong — an under-counted expected set
means a check that cannot fail, which is worse than no check. The rule:

- **Version-filtered disk artifacts.** Read `localDir` (`apps/gui/release/`),
  keep files whose name contains the version string. `apps/gui/release/` holds
  *every* past version's artifacts (0.3.0, 0.3.1 and 0.3.2 are all sitting there
  right now), so this filter is mandatory, and reading the disk rather than
  hardcoding three names means a future target added to `electron-builder.yml`
  widens the check automatically instead of silently narrowing it.
- **Rename-mapped.** Each becomes its GitHub name via `name.replace(/ /g, "-")`
  — `computeSafeArtifactNameIfNeeded`, `platformPackager.js:690`, the same
  mapping `check-updater-package.mjs:124-159` already applies. Never assume the
  disk name is the published name.
- **Plus `latest.yml`, always required present.** Its name carries no version, so
  it cannot come out of the version filter, and it is the one asset every
  installed client polls. Its *bytes* are compared only when the local
  `latest.yml` actually describes this version (parse its `version:` key); when it
  does not, the entry is present-only and the output says so rather than
  pretending it was checked.
- **Sanity floor on the derived set.** If the derivation yields no `.exe`, or an
  `.exe` without a matching `.blockmap`, refuse with "the expected set looks
  wrong" — that is a broken derivation or a wrong `localDir`, not a healthy
  release. This is a floor, not a whitelist: it never limits what else may be in
  the set.
- **Extra assets on the release are not a failure.** Reported as informational.

Verified against live data while planning — the local files and the published
digests agree exactly, so the checks below are real rather than aspirational:

| Version | On GitHub | Local sha256 vs `digest` |
|---|---|---|
| 0.3.0 | exe + `latest.yml`, **blockmap absent** | exe `99c381…` matches |
| 0.3.1 | all three | matches |
| 0.3.2 | all three | exe `94f106…`, blockmap `756336…`, `latest.yml` `8edafd…` all match |

## Per-asset checks

For each expected asset, against the entry in the API's `assets[]`:

1. **Presence** — the name appears. Absent → hard failure (this is the 0.3.0 /
   0.3.1 / 0.3.2 class, and per decision 1 a missing blockmap counts).
2. **Upload state** — `state === "uploaded"`. GitHub uses `"starter"` for an
   asset row whose bytes never landed.
3. **Size** — `asset.size` equals the local file's size. This is what catches
   "an `.exe` of a few hundred bytes that returned 200".
4. **Integrity** — sha256 of the **local** file equals `asset.digest`'s
   `sha256:` payload. Zero bytes downloaded; the script is holding the
   source-of-truth files it just built. If `digest` is `null` (a relatively new
   API field), degrade to state + size and **say so loudly** in the output rather
   than crashing or silently skipping.
5. **Manifest cross-check** — `latest.yml`'s `files[0].size` and `sha512`
   (base64) against the local installer. Note `latest.yml` records sha512-base64
   while GitHub's `digest` is sha256-hex, so the two remote values cannot be
   compared to each other; the local file is the bridge, hashed both ways.

Failures must distinguish **"the release is broken"** from **"the check could
not run"** (rate limit, missing token scope, malformed JSON, 404). The second
must not read as the first, or the verifier becomes the thing that blocks
releases.

## Test-runner decision: `node:test`, not vitest

The choice is forced and the research left it open. There is no root vitest
config, no root `devDependencies` block, and no test of any `scripts/*.mjs`;
both vitest suites are workspace-scoped (`packages/core`, `apps/gui`).

**Chosen: `node:test` + `node:assert/strict`, run as
`"test:scripts": "node --test scripts/"` and folded into the root `"test"`
script.** Why it beats the alternatives:

- Every file in `scripts/` states in its header that it is deliberately
  dependency-free. A test runner that needs a root devDependency and a root
  config file to test them contradicts the one rule the directory is explicit
  about.
- **No `package-lock.json` churn.** `release.mjs:111-116` refuses on a dirty
  tree, and `files.md` flags the lockfile as a release hazard. `node:test` is
  built into Node; `engines.node` is already `>=20` and the dev machine is on
  v24.
- No new root config file, no first-ever root `devDependencies` block, no
  question about whether a hoisted vitest resolves from the root.
- Against option (c), a `--self-test` flag on the script itself: that mixes test
  fixtures into a file that runs during a real release, and it would not be
  picked up by `npm test` without extra wiring anyway.

The cost is a second runner in the repo, and `npm test` output gains a
`node --test` section. That is worth it: `npm test` is step 1 of the release
GATE (`release.mjs:149-163`) and item 1 of `AGENTS.md §10`, so once wired **these
fixtures gate every future release** — which is the actual prize here, more than
the verifier itself.

## Steps

1. **`scripts/verify-release-assets.mjs`** — the pure core.
   `expectedAssets({version, localDir})` per the derivation above (returns
   entries with `{name, localPath, size, sha256, comparable}` plus `notes[]`);
   `verifyAssets({expected, assets})` → `{ok, problems: [{asset, kind, detail,
   severity}]}`, no `fetch`/`fs`/`exit`; `fetchReleaseAssets({owner, repo, tag,
   token, fetchImpl = fetch})` for the one REST call, with distinct error kinds
   for 404 / rate-limit / malformed JSON; `formatProblems()` for human output.
   Dependency-free: `node:fs`, `node:crypto`, `node:path`, `fetch`.
2. **CLI entry in the same file** — `node scripts/verify-release-assets.mjs
   <version> [--dir <localDir>]` runs the whole thing standalone against any
   published tag and exits non-zero on a hard failure. This is what makes the
   integration proof possible without cutting a release.
3. **`scripts/verify-release-assets.test.mjs`** — `node:test`. Golden fixtures
   captured from the three real releases: **v0.3.0 must FAIL** with exactly one
   problem, the absent blockmap; **v0.3.1 and v0.3.2 must PASS**. Synthetic
   cases: `state: "starter"`, a 412-byte `.exe`, a size mismatch, a digest
   mismatch, `digest: null` (degrades, does not crash, and is reported), a
   space-named asset (the rename regression), an extra unexpected asset
   (informational, not a failure), an empty expected set (the sanity floor
   fires). `fetchImpl` stubs for 404 / 403-rate-limit / malformed JSON.
   `expectedAssets` tested against a temp dir holding several versions'
   filenames, asserting the version filter and the rename.
4. **Wire the runner** — root `package.json`: add `"test:scripts": "node --test
   scripts/"` and fold it into `"test"`. No devDependency, no lockfile change,
   no new config file.
5. **`scripts/release.mjs` §9** — replace the `HEAD latest.yml` check with the
   module. Keep the existing `/releases/latest` `tag_name` check: it tests a
   different thing (draft/prerelease invisibility) and is the one guard against
   the failure `AGENTS.md` gotcha 11 describes. On a gap: log the problems, run
   **one** `npx electron-builder --win --publish always` in `guiDir`, re-fetch,
   re-verify, and on a second failure `refuse()` with the problem list and a
   `fix` naming the manual demote command. Set
   `process.env.EP_GH_IGNORE_TIME = "true"` once near the top, before both packs
   (`run()` uses `execSync`, which inherits `process.env`, so no per-call
   plumbing), with a comment saying why it is load-bearing.
6. **Truthful narration** — update the dry-run step 7 line (`release.mjs:174`) so
   it stops promising the weaker behaviour, and the residual manual checklist
   (`:246-261`) so the `EP_GH_IGNORE_TIME` bullet no longer asks a human to
   remember what the script now does.
7. **`AGENTS.md`** — §6 command table (`npm test` now covers `scripts/` too; the
   `npm run release` row) and §8 gotcha 11 (the release now verifies all three
   assets, self-repairs once, and sets `EP_GH_IGNORE_TIME` itself).
8. **`docs/functional/frd/FRD-021-auto-update.md`** — an "Amended — GUI-066"
   section recording R3's new as-built behaviour, matching the existing
   "Amended — GUI-064" pattern.
9. **Verification run** — the rail plus the integration proof (below); produces
   `proof.md`.

## Verification

Rail: `npm test` (now including `node --test scripts/`) and `npm run typecheck`.

The read-only integration proof, which needs no new release because the
published history already contains one good state and one bad one:

```
node scripts/verify-release-assets.mjs 0.3.2   # must PASS
node scripts/verify-release-assets.mjs 0.3.0   # must FAIL: blockmap missing
```

Both go into `proof.md` with their output verbatim. Also `node
scripts/release.mjs 0.9.9 --dry-run`-style narration is *not* run — a dry run
executes the full GATE including a build, and the changed section is past the
dry-run exit anyway.

**Stated limit, to be repeated in `proof.md`: the republish path itself stays
unproven until a real release.** Its trigger (a detected gap) is unit-tested and
its bound (exactly one pass) is readable, but no pre-release exercise actually
runs `electron-builder --publish always` a second time. Do not paper over this.

**DO NOT RUN THE RELEASE SCRIPT.** All verification here is read-only against
existing published releases.

## Accepted gap (recorded, not a task)

**v0.3.0 is missing `Kanmer-Setup-0.3.0.exe.blockmap` on GitHub and stays that
way** — confirmed live again while planning. Operator declined the backfill: it
needs a rebuild of 0.3.0 from its tag, and the cost falls only on clients still
on that version, who pay one full ~78 MB download on their next update and are
then current. It is recorded here so it does not read as forgotten. A future
verifier that sweeps *old* releases would make this permanently red, which is
why that sweep is parked (`open-questions.md`) — it would need an allowlist this
ticket does not owe.

## Risks / mitigations

- **The expected set under-counts and verification passes vacuously.** The
  worst outcome, because it looks green. Mitigated by the sanity floor (step 1),
  by a unit test asserting the floor fires on an empty set, and by the v0.3.0
  fixture, which proves the check can actually fail.
- **`release.mjs` has no CI and the changed section only runs during a real
  release, after the tag is public** (`14f2715` moved the push ahead of the
  publish). Mitigated by keeping `release.mjs`'s share of the change as thin as
  possible — all logic lives in the tested module — and by the standalone CLI,
  which exercises the same code path against production data today.
- **New failure surface: the check itself can fail** (rate limit, token scope,
  `digest` absent, API shape drift). Each gets a distinct error kind and a
  message that says "the check could not run", never "the release is broken".
- **`npm test` mis-wired blocks every release and every merge.** Mitigated by
  the runner choice: a `node --test` line added to an existing `&&` chain, no
  lockfile and no config file involved.
- **File collision with [[MCP-012]]**, which also edits `scripts/release.mjs`
  (adding a bundle rebuild after the version bump, i.e. around §5/§6 — a
  different region from §9). `git fetch origin && git rebase origin/main`
  before opening the PR, re-run the rail after, and state in the report exactly
  what changed in that file and where.
