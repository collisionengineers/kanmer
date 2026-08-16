# Files — GUI-066

## Files the change touches

| Path | What changes | Risk |
|---|---|---|
| `scripts/release.mjs` | §9 (`:225-244`) replaced: fetch `/releases/tags/v<version>` and verify all three assets via the new module; on a gap, one repair `npx electron-builder --win --publish always` in `guiDir`, then re-verify, then `refuse()`. Set `process.env.EP_GH_IGNORE_TIME = "true"` near the top (before both packs). Update the dry-run narration step 7 (`:165-177`) and the residual manual checklist (`:246-261`) so they stop promising the weaker behaviour. | **High.** This file *is* the release process, has no CI, and the changed section only ever executes on a real release — after the tag is public (`14f2715` moved the push ahead of the publish). A bug here either blocks a legitimate release or repairs the wrong thing. |
| `scripts/verify-release-assets.mjs` *(new)* | The pure core: `expectedAssets({version, localDir})` over the disk listing with the space→dash rename, and `verifyAssets({expected, assets})` over a plain GitHub-shaped `assets[]` returning `{ok, problems[]}`. Plus a thin `fetchReleaseAssets({owner, repo, tag, token, fetchImpl})` and a CLI entry so it runs standalone against any published tag. Must stay dependency-free (`node:fs`/`node:crypto`/`fetch`), matching every other script in this directory. | **Medium.** New code, but pure and directly unit-testable. Main risk is the expected-set derivation quietly under-counting (e.g. not filtering by version, or missing the rename) so verification passes vacuously — a check that can't fail is worse than none. |
| `scripts/verify-release-assets.test.mjs` *(new, name/location depends on the runner decision)* | Fixtures from the three real releases — v0.3.0 (blockmap absent → must fail), v0.3.1/v0.3.2 (complete → must pass) — plus synthetic `state:"starter"`, truncated `.exe`, size mismatch, digest mismatch, `digest:null`, space-named asset. | Low. |
| `package.json` (root) | Test wiring so `scripts/` is actually covered: either a `test:scripts` folded into `"test"` (`:15`), or nothing if the self-test route is taken. Possibly a first-ever root `devDependencies` block for `vitest`. | **Medium.** `npm test` is step 1 of the release GATE (`release.mjs:149-163`) and item 1 of `AGENTS.md §10` — mis-wiring it blocks every release and every merge. Adding a root devDependency churns `package-lock.json`. |
| `vitest.config.mjs` (root, *new — only if the vitest route wins*) | Include `scripts/**/*.test.mjs`. There is no root vitest config today. | Low-medium; see the open question on the runner. |
| `AGENTS.md` | §6 command table and/or §8 gotcha 11: record that the release now verifies all three assets, self-repairs once, and sets `EP_GH_IGNORE_TIME` itself. | Low, but skipping it leaves the guide describing a script that no longer behaves that way. |
| `docs/functional/frd/FRD-021-auto-update.md` | R3 as-built amendment — R3 currently cites only the stale-notes refusal and `dist:check`. Asset verification is a new, verified release-discipline behaviour. | Low. Governing doc for this ticket (`refs`), so the plan's Governing-docs section will be checked against it at review. |

## Deliberately NOT changed

- `apps/gui/electron-builder.yml` — read-only **input**: it defines the asset set
  (single x64 nsis target, `releaseType: release`). Changing targets here changes
  what must be verified; that is a different ticket.
- `scripts/check-updater-package.mjs` — verifies the *local packed output*
  pre-publish; this ticket verifies the *remote release* post-publish. Different
  question, different data. Its space→dash matching (`:124-159`) is the pattern to
  reuse; a shared extraction is optional and probably not worth the coupling.
- v0.3.0's missing blockmap — **accepted gap by operator decision**; no backfill,
  no rebuild from the tag.
- `apps/gui/src/main/updater.ts` and the renderer update surface — client side,
  untouched by a release-script change.

## Ripple effects

- **Release runtime.** A gap triggers a second full `electron-builder` pack
  (~4 min) plus a re-upload of ~78 MB. On the happy path the cost is one extra
  API request plus a local sha256 of a 78 MB file (a couple of seconds).
- **`npm test` contents** change if the vitest route is taken → every developer
  run, every pre-merge checklist run, and the release GATE all pick up the new
  fixtures. Intended: the fixtures then gate future releases automatically.
- **`package-lock.json`** churns if a root devDependency is added — and
  `release.mjs` refuses on a dirty tree (`:111-116`), so the lockfile must be
  committed before any release is attempted.
- **Docs drift**: `release.mjs`'s own dry-run narration and residual checklist are
  user-facing text that would otherwise lie; likewise `AGENTS.md` §8 gotcha 11.
- **Failure surface**: verification now fails for reasons other than a genuine
  gap — GitHub rate limits, a missing/insufficient token scope, `digest`
  unavailable, API shape drift. Each needs a refusal message that distinguishes
  "the release is broken" from "the check could not run", or the script becomes
  the thing that blocks releases.
- **`proof.md`** gains a genuinely runnable, no-release-required demonstration:
  `node scripts/verify-release-assets.mjs 0.3.0` must FAIL and `… 0.3.2` must PASS.

## Context files — read these before touching anything

| Path | What it tells you |
|---|---|
| `scripts/release.mjs:1-22, 146-177, 220-261` | The script's contract in its own words ("It REFUSES; it never guesses"), the GATE list, the dry-run narration that must stay truthful, and the residual manual checklist that already describes this exact failure as prose. |
| `scripts/check-updater-package.mjs:109-160` | The space→dash rename handled correctly, with the reasoning: `latest.yml` carries the **GitHub** name, and `GitHubProvider.resolveFiles` re-derives it independently — the two derivations must agree. Copy this logic's shape; do not invent a second one. |
| `apps/gui/electron-builder.yml` | The authority on what a release publishes: `win.target: [nsis]`, no arch list → one x64 installer, its blockmap, and `latest.yml`. `releaseType: release` (never revert). |
| `apps/gui/release/latest.yml` | The real manifest shape: `files[0].{url,sha512,size}`, plus the legacy top-level `path`/`sha512`. Note **sha512 base64**, not sha256 — it cannot be compared to GitHub's `digest` directly. |
| `node_modules/electron-publish/out/gitHubPublisher.js:58-131` | Why a publish can exit 0 with nothing uploaded: `getOrCreateRelease()` returns `null` (type mismatch, or `published_at` > 2h without `EP_GH_IGNORE_TIME`, `:85-96`) and `doUpload()` merely logs `"skipped publishing"` and returns (`:126-131`). Also `overwriteArtifact` (`:114-124`), which makes a repeat publish idempotent rather than duplicating assets. |
| `node_modules/electron-updater/out/providers/Provider.js:20-24` | Blockmap URL = installer URL + `.blockmap`; the previous release's is derived by regex-replacing the version. Explains why a missing blockmap costs a full download in *both* directions. |
| `AGENTS.md` §8 gotcha 11, §6 table, §10 checklist | The already-recorded release gotchas and the verification bar this ticket must clear. |
| `docs/functional/frd/FRD-021-auto-update.md` R3 | The governing requirement — release discipline enforced by `release.mjs`, plus the as-built sections this ticket extends. |
| `.kanmer/areas/gui/GUI-066/scratch/notes.md` | The binding operator decision: auto-republish yes (bounded to one), `EP_GH_IGNORE_TIME` in the script yes, v0.3.0 blockmap backfill no. |
