# Research — GUI-066: verify every published asset, not just `latest.yml`

## The question

`scripts/release.mjs` ends by proving one thing: that `latest.yml` is fetchable.
Three consecutive releases shipped with a missing asset anyway. What is the full
set of assets a release publishes, how can the script assert each one is present
*and correct* on GitHub, and how does that logic get tested without cutting a
real release?

---

## 0. Binding operator decision (do not re-open)

From `scratch/notes.md`, 2026-08-16, quoted verbatim:

> **Operator decision, 2026-08-16.**
>
> Two of the three questions answered, one declined:
>
> - **Auto-republish on a detected gap — yes.** Verify assets, and on a gap re-run
>   the publish and re-verify, failing only if the second pass still has a gap.
>   The reasoning in the ticket holds: a refusal after the tag is pushed leaves
>   `/releases/latest` broken until a human intervenes, which is precisely the
>   state 0.3.1 shipped in.
> - **Set `EP_GH_IGNORE_TIME` in the script — yes.** It was needed for both manual
>   re-publishes, so the script should set it rather than depend on someone
>   remembering.
> - **Backfill v0.3.0's blockmap — no.** Not requested. It needs a rebuild of 0.3.0
>   from its tag, and the cost falls only on clients still on that version. Record
>   it as a known, accepted gap in the plan rather than leaving it looking
>   forgotten — anyone still on 0.3.0 pays a full ~78 MB download on their next
>   update, once, and is then current.
>
> Note the auto-republish path needs a **bounded** retry: one re-publish, then
> re-verify, then fail loudly. A loop that keeps retrying a genuinely broken upload
> turns a visible failure into a hang.

Everything below is written to serve that decision. The republish is **one**
pass, bounded, and `EP_GH_IGNORE_TIME` is the script's business, not a human's.

---

## 1. What the script verifies today

`scripts/release.mjs:225-244` (section 9, "Post-publish proof"):

- `GET https://github.com/<owner>/<repo>/releases/latest` with `Accept:
  application/json`, and refuses unless `body.tag_name === "v<version>"`.
- `HEAD .../releases/download/v<version>/latest.yml`, and refuses on `!head.ok`.

That is the whole proof. It is HTML-endpoint scraping rather than the REST API,
it never looks at the installer or the blockmap, and a `HEAD` that returns 200
says nothing about the bytes behind it.

Section 10 (`:246-261`) then prints a *residual manual checklist* that names
exactly the failure this ticket is about ("NEVER delete assets from old
releases… a missing old blockmap silently costs every client on that version a
full ~77 MB download") — i.e. the knowledge is already in the file as prose that
the script does not enforce.

The most recent commit `14f2715 fix(scripts): push the release tag before
publishing to GitHub` moved `git push` / `git push --tags` from *after* the
proof to *before* the publish pass (§7, `:214-218`). Consequence for this
ticket: **by the time verification runs, the tag and the release are already
public.** A bare refusal now leaves `/releases/latest` pointing at a broken
release — which is precisely why the operator chose auto-republish.

## 2. The complete asset set a release publishes

From `apps/gui/electron-builder.yml`:

- `win.target: [nsis]`, no `arch` list → a single **x64** NSIS installer. There
  are no per-arch variants, no `-ia32`/`-arm64` suffixed artifacts, no portable
  or zip target, no mac/linux targets.
- `publish: [{provider: github, owner: collisionengineers, repo: kanmer,
  releaseType: release}]`.

So exactly **three** assets per release, confirmed against `apps/gui/release/`
on disk and against the live GitHub releases:

| GitHub asset name | Source | Approx size |
|---|---|---|
| `Kanmer-Setup-<v>.exe` | NSIS target | ~78 MB |
| `Kanmer-Setup-<v>.exe.blockmap` | emitted alongside the nsis artifact | ~82 KB |
| `latest.yml` | `PublishManager` update-info task | ~340 bytes |

**Name mapping trap.** On disk the files are `Kanmer Setup 0.3.2.exe` (spaces);
on GitHub they are `Kanmer-Setup-0.3.2.exe` (dashes) —
`computeSafeArtifactNameIfNeeded`, `platformPackager.js:690`, documented in
`AGENTS.md` gotcha 11 and already handled by
`scripts/check-updater-package.mjs:124-159`, which matches manifest names back to
local files with `f.replace(/ /g, "-") === name`. Any expected-asset list must be
derived through that same rename, and must be filtered by the version being
released, because `apps/gui/release/` accumulates **every** version's artifacts
(0.3.0, 0.3.1 and 0.3.2 exes are all sitting there right now).

**Blockmap naming**, confirmed in `electron-updater/out/providers/Provider.js:20-24`:
the blockmap URL is literally the installer URL + `.blockmap`; the *previous*
release's blockmap URL is derived by regex-replacing the new version with the old
one in that same path. A differential download needs **both** blockmaps, so a
missing blockmap on release N degrades N as a target *and* N→N+1 later.

## 3. Where the silent failure comes from (mechanism, source-cited)

`node_modules/electron-publish/out/gitHubPublisher.js`:

- `getOrCreateRelease()` returns **`null`** — not an error — in two cases: the
  existing release's type does not match (`:70-82`), or the existing release was
  `published_at` more than 2 hours ago and `EP_GH_IGNORE_TIME` is not truthy
  (`:85-96`).
- `doUpload()` `:126-131`: when the release is `null` it calls
  `log.warn({file, ...}, "skipped publishing")` **and returns**. No throw, no
  non-zero exit.

That is a proven path by which `electron-builder --publish always` completes
"successfully" with assets missing, and it is the exact reason both manual
re-publishes needed `EP_GH_IGNORE_TIME=true`. It also means the repair pass the
operator asked for *must* have `EP_GH_IGNORE_TIME` set, or the repair itself can
no-op into a second identical failure.

Upload failures that do surface are retried 4× with backoff (`:136-165`), with a
`422 already_exists` special case that deletes the existing asset and re-uploads
(`overwriteArtifact`, `:114-124`) — so re-publishing over a *complete* release is
safe and idempotent, not additive-duplicating.

Note this mechanism explains the re-publish class cleanly; it does not by itself
explain a first-pass gap on a release minutes old. The honest position for the
plan: **the exit code of `electron-builder` is not evidence of upload, whatever
the cause.** Verify from the outside.

## 4. How to assert presence, size and integrity — without downloading 78 MB

The key finding. `GET /repos/{owner}/{repo}/releases/tags/v{version}` returns an
`assets[]` array in which every asset carries `name`, `size`, `state` **and
`digest`**. Probed live against this repo during research:

```
== v0.3.0 ==   (still missing its blockmap on GitHub, right now)
{"name":"Kanmer-Setup-0.3.0.exe","size":78033138,"state":"uploaded","digest":"sha256:99c381…"}
{"name":"latest.yml","size":340,"state":"uploaded","digest":"sha256:88670e…"}
== v0.3.1 ==   (complete after the manual re-publish)
{"name":"Kanmer-Setup-0.3.1.exe","size":78034599,"state":"uploaded","digest":"sha256:8da458…"}
{"name":"Kanmer-Setup-0.3.1.exe.blockmap","size":82137,"state":"uploaded","digest":"sha256:dba19a…"}
{"name":"latest.yml","size":340,"state":"uploaded","digest":"sha256:cf4a06…"}
== v0.3.2 ==   complete, same three
```

This gives the script everything it needs in **one request**:

1. **Presence** — every expected name appears in `assets[]`.
2. **Upload completed** — `state === "uploaded"`. GitHub uses `"starter"`/`"new"`
   for an asset row that exists but whose bytes never landed; the ticket's "an
   `.exe` of a few hundred bytes is a failed upload that returned 200" is caught
   here and by (3).
3. **Size** — compare `asset.size` against the local file's size in
   `apps/gui/release/` (which the script just built), and for the installer also
   against `files[0].size` recorded inside `latest.yml`.
4. **Integrity** — compute `sha256` of the **local** artifact and compare to
   `asset.digest`. This is a true end-to-end content check with **zero bytes
   downloaded**, because the script is holding the source-of-truth files.

Note the algorithm mismatch: `latest.yml` records `sha512` (base64) of the
installer only — `apps/gui/release/latest.yml` has `sha512:
Itm/Gq9E5t6…` — while GitHub's `digest` is `sha256:<hex>`. They cannot be
compared to each other directly; the local file is the bridge (hash it both ways
if desired). `latest.yml`'s own `files[0].url`, `size` and `sha512` should also be
cross-checked against the *local* installer, which is the check
`check-updater-package.mjs` already does for names but not for size/hash.

Caveats worth a line in the plan: `digest` is a relatively recent field — treat
`digest == null` as "degrade to size + state, and say so" rather than a crash;
and read assets via `/releases/{id}/assets?per_page=100` if the embedded array is
ever suspected of truncation (3 assets today, so not urgent). The request needs
the token the script already requires (`GITHUB_RELEASE_TOKEN` / `GH_TOKEN` /
`GITHUB_TOKEN`, `release.mjs:120-129`) — a public repo works unauthenticated but
is rate-limited. `fetch` is already used, so this adds no dependency, which
matters: every script in `scripts/` is deliberately dependency-free.

## 5. How this gets TESTED without cutting a release

The script talks to GitHub and takes ~10 minutes to run, so the verification
logic must not live inside the network call. Concretely:

**(a) Extract a pure function.** Something shaped like

```js
// scripts/verify-release-assets.mjs
export function expectedAssets({ version, localDir })        // disk listing → [{name, size, sha256}]
export function verifyAssets({ expected, assets })           // → { ok, problems: [{asset, kind, detail, severity}] }
```

`verifyAssets` takes a **plain asset listing** — exactly the shape of GitHub's
`assets[]` — and returns findings. No `fetch`, no `fs`, no `process.exit`. The
network and the exit codes stay in a thin caller.

**(b) Golden fixtures from the three real failures.** The API responses quoted in
§4 are already captured and are the fixture set:
`v0.3.0` (missing blockmap → must fail), `v0.3.1`/`v0.3.2` (complete → must
pass). Add synthetic ones for the cases that never got recorded: `state:
"starter"`, an installer of 412 bytes, a `size` that disagrees with the local
file, a `digest` mismatch, a `digest: null`, and an asset named with spaces
instead of dashes (the rename regression).

**(c) Injectable fetch for the network layer.** `fetchReleaseAssets({ owner,
repo, tag, token, fetchImpl = fetch })` — a test passes a stub returning a
fixture, so 404 / 403-rate-limit / malformed-JSON paths are covered without a
network.

**(d) A real, read-only integration proof that needs no new release.** The
published history already contains one good state and one bad state:

```
node scripts/verify-release-assets.mjs 0.3.2   # must PASS
node scripts/verify-release-assets.mjs 0.3.0   # must FAIL: blockmap missing
```

That is the ticket's "simulate a missing asset" check, obtainable today, against
production data, without touching a draft release. It should be written into
`proof.md` verbatim.

**(e) Where the test file lives is an open wiring question.** Both vitest suites
are workspace-scoped: `packages/core` and `apps/gui` (`npm test` = `npm run test
-w @kanmer/core && npm run test -w @kanmer/gui`, root `package.json:15`), neither
has a `vitest.config`, and there is **no root vitest config, no root
devDependencies block, and no existing test anywhere for `scripts/*.mjs`** —
`node:test` is not used in this repo either. So covering `scripts/` needs one of:
a root `vitest.config.mjs` + a root `vitest` devDependency + a new `test:scripts`
script folded into `npm test`; or a `node:test`/self-check mode kept
dependency-free in the style of the other scripts (`--self-test`). Either way
`npm test` is step 1 of the release GATE (`release.mjs:149-163`) and item 1 of
`AGENTS.md §10`, so once wired the fixtures gate every future release — which is
the point.

**(f) The republish path itself is the part that stays unproven until a real
release.** Its only honest pre-release exercise is a dry-run/flag-driven path
that logs what it *would* re-run. State that limit rather than implying coverage.

## 6. Implications for this ticket

- Replace §9's HTML scrape with a REST call to
  `/repos/collisionengineers/kanmer/releases/tags/v<version>` and a pure
  verification over `assets[]`; keep the `/releases/latest` tag_name check, which
  tests a different thing (draft/prerelease invisibility).
- Expected set is derived from `apps/gui/release/` filtered to the version, put
  through the space→dash rename — not hardcoded — so adding a target later does
  not silently narrow the check.
- Set `process.env.EP_GH_IGNORE_TIME = "true"` once, near the top, before either
  pack; `run()` uses `execSync` which inherits `process.env`, so no per-call
  plumbing is needed.
- On a gap: one `npx electron-builder --win --publish always` repair pass in
  `guiDir`, then re-verify, then `refuse()` loudly. Bounded at one, per the
  operator note.
- Update the dry-run narration (`release.mjs:165-177`, step 7) and the residual
  manual checklist (`:246-261`), which currently promise the weaker behaviour.
- v0.3.0's blockmap stays missing by decision. Record it as an accepted gap; do
  not let a future verifier that scans old releases turn it into a permanent red.
