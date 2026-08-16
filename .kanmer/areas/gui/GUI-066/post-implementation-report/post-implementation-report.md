# Post-implementation report — GUI-066

## Summary

`release.mjs`'s post-publish proof checked one asset of three. It now checks all
of them, from the outside, against the GitHub REST API — presence, `state ==
"uploaded"`, size against the local build, and GitHub's `sha256` digest against a
locally computed one, which is a full integrity check that downloads **zero
bytes** because the script is holding the files it just built. The deciding logic
lives in a new, pure, dependency-free `scripts/verify-release-assets.mjs` and is
unit-tested against golden fixtures captured from the three real releases that
shipped incomplete. A missing `.exe.blockmap` is a hard failure; on any gap the
script re-publishes **exactly once**, re-verifies, and then refuses loudly
**without demoting the release**. `EP_GH_IGNORE_TIME` is now set by the script
rather than by someone remembering. The verifier also runs standalone against any
published tag, which is how the whole thing is demonstrable today without cutting
a release.

## Changes

| File | Change | Why |
|---|---|---|
| `scripts/verify-release-assets.mjs` | **added** (~430 lines) | The verifier, split so the deciding part is testable without a release: `verifyAssets({expected, assets})` is pure — no `fetch`, no `fs`, no `process.exit`; `expectedAssets({version, localDir})` derives the expected set from the pack output; `fetchReleaseAssets({…, fetchImpl})` isolates the one REST call behind an injectable fetch. Dependency-free (`node:fs`, `node:crypto`, `node:path`, `fetch`), matching every other script in the directory. Also a CLI entry, which is what makes the change provable read-only against production data. |
| `scripts/verify-release-assets.test.mjs` | **added**, 41 tests | Golden fixtures are the **real** API responses for v0.3.0 / v0.3.1 / v0.3.2, so the suite encodes the actual incidents rather than an imagined one. Plus `state:"starter"`, a 412-byte exe, size mismatch, digest mismatch, `digest:null`, a non-sha256 digest, a space-named asset (the rename regression), an extra asset, an empty release, manifest cross-checks, the sanity floor, and stubbed `fetchImpl` for 404 / 401 / 403 / 429 / 500 / malformed JSON / API shape drift. |
| `scripts/release.mjs` | **modified**, four regions — see the section below | The behaviour change itself. |
| `package.json` (root) | **modified**, 1 line changed + 1 added | `"test:scripts": "node --test \"scripts/*.test.mjs\""`, chained onto `"test"`. **No `devDependencies`, no `package-lock.json` change, no new config file.** |
| `AGENTS.md` | **modified** | §6 gains rows for `test:scripts` and `verify-release-assets.mjs` and corrects the `npm test` / `npm run release` rows; §8 gains **gotcha 12**, the full "a publish can exit 0 having uploaded nothing" mechanism with source citations, plus the accepted v0.3.0 gap. |
| `docs/functional/frd/FRD-021-auto-update.md` | **modified**, appended | An "Amended — GUI-066" section recording R3's new as-built behaviour. |

### Exactly what changed in `scripts/release.mjs`, and where

Called out precisely because **[[MCP-012]] also edits this file** (it adds a
bundle rebuild after the version bump, around §5/§6). The four regions touched
here are disjoint from that:

1. **Header comment** (~`:17-22`) — one bullet added to the "failure modes that
   are silent or expensive" list, pointing at the new mechanism, and the import
   of `verifyRelease` / `formatProblems`.
2. **Constants block** (after `OWNER`/`REPO`, ~`:36-52`) — `const releaseDir`, and
   `process.env.EP_GH_IGNORE_TIME = "true"` with the comment explaining why it is
   load-bearing rather than cosmetic. Placed before anything packs; `run()` uses
   `execSync`, which inherits `process.env`, so no per-call plumbing.
3. **Dry-run narration** (the step-7 line) — rewritten and extended to a step 8,
   so the dry run stops promising the weaker behaviour.
4. **§9, the post-publish proof** — split into **9a** (the `/releases/latest`
   `tag_name` check, kept verbatim: it tests draft/prerelease *invisibility*, a
   different question from "are the bytes there") and **9b** (the new asset
   verification, the bounded repair, the refusal). And **§10**'s residual manual
   checklist, whose `EP_GH_IGNORE_TIME` bullet is gone because the script now
   does it, replaced by the accepted-gap note and the standalone re-verify
   command.

**No change** to §5 (bump), §6 (pass 1 + `check-updater-package.mjs`), §7 (commit
/ tag / push), or §8 (pass 2) — the regions MCP-012 is expected to touch.

### Decisions worth a reviewer's attention

- **The expected set is derived, never hardcoded.** `apps/gui/release/` holds
  every past version's artifacts, so it is version-filtered, and it is mapped
  through the space→dash rename (`computeSafeArtifactNameIfNeeded`), so the
  on-disk name is never assumed to be the published one. Reading the disk means a
  target added to `electron-builder.yml` later *widens* the check instead of
  silently narrowing it.
- **A sanity floor guards against the opposite failure.** A derivation that
  under-counts produces a green check that *cannot fail*, which is worse than no
  check. `sanityCheckExpected()` refuses a set with no `.exe`, or an `.exe`
  without its `.blockmap`. It is a floor, not a whitelist — extra targets pass.
  It fired for real during development (see Verification).
- **`latest.yml` is handled specially and honestly.** Its name carries no version
  so it can never come out of the version filter; it is required *by name*, and
  its bytes are compared only when the local manifest actually describes this
  version. When it does not, the output says "PRESENCE only" rather than implying
  a check that did not happen.
- **"The release is broken" and "the check could not run" are never conflated.**
  Rate limit, bad token, absent `digest`, API shape drift each get their own
  error kind and their own exit code (2, vs 1 for a genuinely incomplete
  release). Without this the verifier eventually becomes the thing that blocks
  releases.
- **Severities are asserted by tests, not just chosen.** There is a test whose
  only job is that a missing blockmap is `severity: "error"` — downgrading it
  later fails the suite, which is the point, since a warning is exactly how
  v0.3.0 passed the old gate.

## Governing docs

`refs`: `docs/functional/frd/FRD-021-auto-update.md`.

- **Meets R3** — "Release discipline: `release.mjs` refuses to publish unless
  `release-notes.md` names the version; `dist:check` verifies the packaged app can
  actually self-update." R3 is the requirement strengthened here. Its as-built
  section cited only the stale-notes refusal and `dist:check`; the release
  script's *own* post-publish proof covered one asset of three, which is how
  0.3.0 shipped without a blockmap while passing the gate. **The requirement text
  is unchanged** — the behaviour it names is the same, only completely
  implemented now.
- **Modifies as-built prose only** — an "Amended — GUI-066" section appended,
  following the existing "Amended — GUI-064" pattern in the same document. It
  records the mechanism, the new checks, the bounded repair, the no-demote
  decision, the accepted v0.3.0 gap, and the one honest limit. No requirement
  statement was rewritten, so no authorization to change a requirement was needed
  or taken.
- **No new ADR.** Nothing here is an architecture decision. The transport, the
  repair policy and the blockmap severity were all operator decisions, recorded in
  `scratch/operator-answers.md` and `open-questions.md`. The one genuinely new
  engineering choice — `node:test` over vitest for `scripts/` — is a tooling
  decision, argued in `plan.md` and recorded in `AGENTS.md` §6; it changes no
  architecture and is reversible in one line.

## Risks / follow-ups

- **The re-publish path is unproven until a real release.** Stated plainly rather
  than papered over. Its trigger is unit-tested and its bound is one pass, but no
  pre-release run actually invokes `electron-builder --publish always` a second
  time. This is repeated in `proof.md` and in the FRD amendment. The next real
  release is the test.
- **`release.mjs` has no CI and §9b only ever runs during a real release** — after
  the tag is public, since `14f2715` moved the push ahead of the publish.
  Mitigated by keeping `release.mjs`'s share thin (all logic in the tested module)
  and by the standalone CLI, which exercises the same code path against
  production data today.
- **Accepted gap: v0.3.0's blockmap is not backfilled.** Operator decision.
  Recorded in `plan.md`, `AGENTS.md` gotcha 12, the FRD amendment and
  `release.mjs`'s residual checklist so it does not read as forgotten. Clients
  still on 0.3.0 pay one full ~78 MB download on their next update.
- **Parked (from `open-questions.md`):** sweeping *older* releases for missing
  assets would make v0.3.0 permanently red, so it needs an allowlist concept this
  ticket does not owe.
- **Follow-up filed: [[GUI-085]]** — `apps/gui/src/main/kanmerGit.test.ts` fails
  non-deterministically on `origin/main`. Every test in it shells out to real
  `git` and takes 4.6–8.7 s against vitest's 5 s default `testTimeout`, so
  whichever loses the race times out and the `afterEach` `rmSync` then throws
  `EPERM`/`ENOTEMPTY` on the Windows temp dir. **Reproduced with this branch's
  changes stashed and from the main checkout**, so it is pre-existing and not
  GUI-066's — this change touches nothing under `apps/gui/` or `packages/core/`.
  It matters because `npm test` is step 1 of the release gate.
- **Two implementation traps worth knowing**, both now commented in-file:
  `process.exit()` immediately after a `fetch()` trips libuv on Windows and the
  process dies with **127** instead of the chosen exit code (the CLI sets
  `process.exitCode` instead); and `node --test scripts/` does not do directory
  discovery in Node 24 — the glob form `node --test "scripts/*.test.mjs"` is what
  works.

## Verification hand-off

Run on merged `main`:

1. `npm test` — expect `@kanmer/core` and the new `test:scripts` green (41/41).
   `@kanmer/gui`'s `kanmerGit.test.ts` may fail; that is [[GUI-085]], pre-existing,
   and is not evidence about this change. Everything else in the GUI suite passes.
2. `npm run typecheck` — all four workspaces named and clean.
3. `npm run test:scripts` on its own — the fixture suite, 41 tests.
4. The read-only integration proof, needing **no** new release and touching
   nothing:
   ```
   node scripts/verify-release-assets.mjs 0.3.2   # expect PASS, exit 0
   node scripts/verify-release-assets.mjs 0.3.1   # expect PASS, exit 0
   node scripts/verify-release-assets.mjs 0.3.0   # expect FAIL, exit 1, blockmap absent
   ```
   Needs `GH_TOKEN` (or it will be rate-limited as an anonymous caller). Exit code
   1 means the release is incomplete; exit code 2 would mean the check itself
   could not run and is a different thing.

**DO NOT run `scripts/release.mjs`.** Verification for this ticket is read-only
against releases that already exist. The script's changed section is past the
dry-run exit anyway, so a dry run would prove nothing about it while running a
full build.
