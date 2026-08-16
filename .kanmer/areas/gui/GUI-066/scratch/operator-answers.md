## OPERATOR ANSWERS — 2026-08-16

**Q "Is a missing/corrupt `.exe.blockmap` a hard failure or a warning?"
ANSWERED: HARD FAILURE.** Treat it like any other missing asset — verify,
re-publish once, re-verify, then fail loudly. The operator's reasoning matches the
research: making it a warning re-creates exactly the quiet failure this ticket
exists to kill, which is how v0.3.0 shipped without one.

**Q "On a second failure, should the script demote the release (prerelease/draft)
so `/releases/latest` stops pointing at it?" ANSWERED: NO. Fail loudly, leave it
published.**

The script refuses and says precisely what is wrong and what to do — including the
manual demote command as a suggestion. It does not rewrite a public artifact
unattended. Release state is a judgement call and the operator wants to be told,
not second-guessed. Use the house `refuse(why, fix)` idiom at
`release.mjs:41-45`; a refusal that does not say what to do is half a refusal.

**Earlier operator decisions on this ticket, still binding, from `scratch/notes.md`:**
- **Auto-republish on a detected gap — yes**, then re-verify, failing only if the
  second pass still has a gap. **Bounded: one re-publish, then fail.**
- **Set `EP_GH_IGNORE_TIME` in the script — yes.** Research showed this is
  load-bearing, not cosmetic: `gitHubPublisher.js:85-96` returns `null` for a
  release older than 2h without it, and `doUpload()` then logs "skipped
  publishing" and returns with **no throw, exit 0**. Without the env var the
  repair pass would itself silently no-op. `overwriteArtifact` makes a repeat
  publish idempotent rather than duplicating.
- **Backfill v0.3.0's blockmap — no.** Record it as a known, accepted gap in the
  plan. (It is still genuinely missing on GitHub — confirmed via the API during
  research, so this is a live state, not history.)

### What research settled that you should not re-derive

- **The asset set is exactly three**: `Kanmer-Setup-<v>.exe` (~78MB),
  `.exe.blockmap` (~82KB), `latest.yml` (~340B). `win.target: [nsis]`, no arch
  list, so no per-arch variants.
- **Names differ on disk and on GitHub** — spaces locally, dashes on GitHub via
  `computeSafeArtifactNameIfNeeded` — and `apps/gui/release/` holds every past
  version's artifacts. So the expected set must be **version-filtered and
  rename-mapped**, never hardcoded.
- **One API call gives presence, size, upload state AND a checksum.**
  `GET /repos/<o>/<r>/releases/tags/v<v>` returns per-asset `name`, `size`,
  `state`, and `digest: "sha256:…"`. The script already holds the freshly built
  local files, so it can sha256 them locally and compare — **full integrity, zero
  bytes downloaded**. Note `latest.yml` records **sha512 base64** of the installer
  only, so it cannot be compared to `digest` directly; the local file is the bridge.

### How this gets tested without cutting a release

Extract a pure `verifyAssets({expected, assets})` over a plain GitHub-shaped
`assets[]` — no fetch, no fs, no exit — plus `expectedAssets({version, localDir})`,
keeping the network in a thin `fetchReleaseAssets({…, fetchImpl})`. Golden fixtures
were already captured from the three real releases during research: **v0.3.0 must
FAIL** (blockmap absent), **v0.3.1 and v0.3.2 must PASS**, plus synthetic
`state:"starter"`, a 412-byte exe, size mismatch, digest mismatch, `digest:null`,
and a space-named asset.

Then the read-only integration proof that needs no new release:
`node scripts/verify-release-assets.mjs 0.3.2` must PASS and `… 0.3.0` must FAIL.

**Wiring caveat:** there is no root vitest config, no root devDependencies, and no
test of any `scripts/*.mjs`. Covering `scripts/` needs a deliberate choice (root
vitest + devDep, `node:test`, or `--self-test`). Make it explicitly in the plan and
say why. Once wired, `npm test` is step 1 of the release gate, so these fixtures
gate every future release — that is the real prize here.

**The republish path itself stays unproven until a real release.** State that as a
limit in `proof.md`; do not paper over it.

**File collision:** [[MCP-012]] also edits `scripts/release.mjs` (it adds a rebuild
step after the version bump) and is queued in lane A. Whichever lands second
rebases. Say in your report exactly what you changed and where.
