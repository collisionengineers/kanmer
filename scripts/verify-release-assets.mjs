// Prove that a published GitHub release actually carries every asset it should.
//
// Release publication is explicit, but a successful upload command is still not
// evidence that the public release is complete and internally coherent. Verify
// the public asset metadata and, in independent CI, the downloaded update bytes.
//
// Split so the interesting part is testable without cutting a release:
//
//   expectedAssets({version, localDir})   pure-ish (reads disk), no network
//   verifyAssets({expected, assets})      PURE: no fetch, no fs, no exit
//   fetchReleaseAssets({...,fetchImpl})   release metadata request, injectable
//
// GET /repos/{owner}/{repo}/releases/tags/v{version} returns, per asset, `name`,
// `size`, `state` AND `digest: "sha256:<hex>"`. Since the caller is holding the
// freshly built local files, local release verification compares those hashes.
// Remote-coherent mode instead downloads the public manifest and installer so
// an independently signed CI build is never treated as byte-identical evidence.
//
// Dependency-free, matching the other scripts in this directory.
//
// Usage: node scripts/verify-release-assets.mjs <version> [--dir <localDir>]
//        [--owner <o>] [--repo <r>]
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseAssetNames } from "./release-publish.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_OWNER = "collisionengineers";
export const DEFAULT_REPO = "kanmer";
export const DEFAULT_LOCAL_DIR = join(root, "apps", "gui", "release");

/** The feed manifest every installed client polls. Its name carries no version,
 *  so it can never fall out of a version filter — it is required by name. */
export const MANIFEST = "latest.yml";

/**
 * The GitHub upload name for an on-disk artifact.
 *
 * computeSafeArtifactNameIfNeeded (platformPackager.js:690) replaces spaces with
 * dashes because GitHub only accepts [0-9A-Za-z._-]: "Kanmer Setup 0.3.2.exe" on
 * disk is published as "Kanmer-Setup-0.3.2.exe". GitHubProvider.resolveFiles
 * re-derives the same mapping independently, so the two must agree or every
 * client's download 404s. Same rule as check-updater-package.mjs:124-159.
 */
export function githubName(diskName) {
  return diskName.replace(/ /g, "-");
}

function sha256Hex(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha512Base64(path) {
  return createHash("sha512").update(readFileSync(path)).digest("base64");
}

/** The `version:` key of a latest.yml, or null if it has none / cannot be read. */
export function manifestVersion(text) {
  const m = text.match(/^version:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

/** files[0].{url,size,sha512} out of a latest.yml, best-effort. */
export function parseManifest(text) {
  const url = text.match(/^\s*-\s*url:\s*(.+)$/m);
  const sha512 = text.match(/^\s*sha512:\s*(.+)$/m);
  const size = text.match(/^\s*size:\s*(\d+)\s*$/m);
  return {
    url: url ? url[1].trim() : null,
    sha512: sha512 ? sha512[1].trim() : null,
    size: size ? Number(size[1]) : null,
  };
}

/**
 * What SHOULD be on the release for `version`, derived from the local pack output.
 *
 * Deliberately derived, never hardcoded, and the derivation has three rules that
 * all matter:
 *
 *  1. VERSION-FILTERED. apps/gui/release/ accumulates every past version's
 *     artifacts — 0.3.0, 0.3.1 and 0.3.2 exes are all sitting there — so an
 *     unfiltered listing would demand assets that belong to other releases.
 *  2. RENAME-MAPPED through githubName().
 *  3. PLUS latest.yml, always required present. Its bytes are only compared when
 *     the local manifest actually describes this version; otherwise the entry is
 *     present-only and `notes` says so, rather than pretending it was checked.
 *
 * Reading the disk rather than hardcoding three names means a target added to
 * electron-builder.yml later WIDENS this check automatically instead of silently
 * narrowing it. The cost is that a wrong localDir yields a tiny expected set and
 * a check that cannot fail — see sanityCheckExpected(), which is the floor.
 *
 * @returns {{expected: Array, notes: string[]}}
 */
export function expectedAssets({ version, localDir = DEFAULT_LOCAL_DIR }) {
  const notes = [];
  if (!existsSync(localDir)) {
    return { expected: [], notes: [`no local pack output at ${localDir}`] };
  }

  const entries = readdirSync(localDir).filter((f) => {
    try {
      return statSync(join(localDir, f)).isFile();
    } catch {
      return false;
    }
  });

  const expected = [];
  for (const file of entries) {
    if (file === MANIFEST) continue;
    if (!file.includes(version)) continue;
    const path = join(localDir, file);
    const entry = {
      name: githubName(file),
      diskName: file,
      localPath: path,
      size: statSync(path).size,
      sha256: sha256Hex(path),
      comparable: true,
    };
    // Only the installer is described by latest.yml, and only in sha512-base64.
    // Hashing it both ways is what bridges GitHub's sha256 digest and the
    // manifest's sha512 — the two remote values cannot be compared directly.
    if (file.endsWith(".exe")) entry.sha512 = sha512Base64(path);
    expected.push(entry);
  }

  // latest.yml: required by name, byte-compared only when it is this version's.
  const manifestPath = join(localDir, MANIFEST);
  if (existsSync(manifestPath)) {
    const text = readFileSync(manifestPath, "utf8");
    const mv = manifestVersion(text);
    if (mv === version) {
      expected.push({
        name: MANIFEST,
        diskName: MANIFEST,
        localPath: manifestPath,
        size: statSync(manifestPath).size,
        sha256: sha256Hex(manifestPath),
        comparable: true,
        manifest: parseManifest(text),
      });
    } else {
      expected.push({ name: MANIFEST, comparable: false });
      notes.push(
        `${manifestPath} describes version ${mv ?? "(unreadable)"}, not ${version} — ` +
          `${MANIFEST} is checked for PRESENCE only, its bytes are not compared`,
      );
    }
  } else {
    expected.push({ name: MANIFEST, comparable: false });
    notes.push(`no local ${manifestPath} — ${MANIFEST} is checked for presence only`);
  }

  return { expected, notes };
}

/**
 * Refuse an expected set that is obviously too small.
 *
 * A derivation that under-counts produces a green check that CANNOT FAIL, which
 * is worse than no check at all. This is a floor, not a whitelist: it never
 * limits what else may be in the set, it only rejects a set missing the shape
 * every Kanmer release has.
 *
 * @returns {string[]} problems with the set itself (empty = sane)
 */
export function sanityCheckExpected({ expected, version }) {
  const problems = [];
  const names = expected.map((e) => e.name);
  const installers = names.filter((n) => n.endsWith(".exe"));
  if (installers.length === 0) {
    problems.push(
      `the expected set for ${version} contains no .exe — the local pack output is ` +
        `missing or --dir points at the wrong directory (have: ${names.join(", ") || "nothing"})`,
    );
  }
  for (const exe of installers) {
    if (!names.includes(`${exe}.blockmap`)) {
      problems.push(
        `the expected set has ${exe} but no ${exe}.blockmap — electron-builder always ` +
          `emits one alongside the nsis artifact, so this derivation is wrong`,
      );
    }
  }
  return problems;
}

/**
 * PURE. Compare an expected set against a GitHub-shaped `assets[]`.
 *
 * No fetch, no fs, no process.exit — everything here is decided from its two
 * arguments, which is what makes the golden fixtures possible.
 *
 * Severities are deliberate:
 *   "error" — the release is broken and must be repaired or refused. A missing
 *             .exe.blockmap is an ERROR, by operator decision: treating it as a
 *             warning re-creates exactly the quiet failure this exists to kill
 *             (v0.3.0 shipped without one and passed the old gate).
 *   "info"  — noted, not a problem (an extra asset on the release).
 *
 * @returns {{ok: boolean, problems: Array<{asset, kind, detail, severity}>}}
 */
export function verifyAssets({ expected, assets }) {
  const problems = [];
  const byName = new Map();
  for (const a of assets ?? []) byName.set(a.name, a);

  for (const want of expected) {
    const got = byName.get(want.name);

    if (!got) {
      problems.push({
        asset: want.name,
        kind: "missing",
        severity: "error",
        detail: `not present on the release (have: ${[...byName.keys()].join(", ") || "no assets at all"})`,
      });
      continue;
    }

    if (got.state !== "uploaded") {
      problems.push({
        asset: want.name,
        kind: "state",
        severity: "error",
        detail: `state is "${got.state}", expected "uploaded" — the asset row exists but its bytes never landed`,
      });
    }

    if (!want.comparable) continue;

    if (typeof got.size === "number" && got.size !== want.size) {
      problems.push({
        asset: want.name,
        kind: "size",
        severity: "error",
        detail: `published size ${got.size} != local ${want.size} (${want.diskName}) — a truncated upload that returned 200`,
      });
    }

    const digest = typeof got.digest === "string" ? got.digest : null;
    if (!digest) {
      problems.push({
        asset: want.name,
        kind: "no-digest",
        severity: "error",
        detail:
          "GitHub returned no digest for this asset — integrity NOT verified, " +
          "checked presence, state and size only",
      });
    } else if (!digest.startsWith("sha256:")) {
      problems.push({
        asset: want.name,
        kind: "no-digest",
        severity: "error",
        detail: `digest "${digest}" is not sha256 — integrity NOT verified for this asset`,
      });
    } else if (digest.slice("sha256:".length).toLowerCase() !== want.sha256) {
      problems.push({
        asset: want.name,
        kind: "digest",
        severity: "error",
        detail: `published sha256 ${digest.slice(7)} != local ${want.sha256} (${want.diskName}) — the published bytes are not the bytes that were built`,
      });
    }

    // latest.yml describes the installer; check it describes THIS one. The
    // manifest records sha512-base64 while GitHub's digest is sha256-hex, so
    // these two remote values can never be compared to each other — the local
    // installer is the bridge.
    if (want.manifest) {
      const installer = expected.find((e) => e.name === want.manifest.url);
      if (!installer) {
        problems.push({
          asset: MANIFEST,
          kind: "manifest",
          severity: "error",
          detail: `files[0].url is "${want.manifest.url}", which is not an expected artifact for this version`,
        });
      } else {
        if (want.manifest.size !== null && want.manifest.size !== installer.size) {
          problems.push({
            asset: MANIFEST,
            kind: "manifest",
            severity: "error",
            detail: `files[0].size ${want.manifest.size} != local installer ${installer.size} — the manifest describes a different build`,
          });
        }
        if (
          want.manifest.sha512 !== null &&
          installer.sha512 !== undefined &&
          want.manifest.sha512 !== installer.sha512
        ) {
          problems.push({
            asset: MANIFEST,
            kind: "manifest",
            severity: "error",
            detail: "files[0].sha512 does not match the local installer — the manifest describes a different build",
          });
        }
      }
    }
  }

  const wanted = new Set(expected.map((e) => e.name));
  for (const name of byName.keys()) {
    if (!wanted.has(name)) {
      problems.push({
        asset: name,
        kind: "extra",
        severity: "info",
        detail: "present on the release but not in the expected set — not a failure",
      });
    }
  }

  return { ok: !problems.some((p) => p.severity === "error"), problems };
}

/**
 * Verify that one local pack is internally coherent before remote verification.
 *
 * `verifyAssets` normally compares the local files against GitHub metadata.
 * Here the expected files stand in for a successful upload so its existing
 * `latest.yml` → installer size/SHA-512 cross-check can run without GitHub
 * metadata. This deliberately does not replace remote verification.
 */
export function verifyLocalArtifacts({ expected, version }) {
  const derivation = sanityCheckExpected({ expected, version });
  const problems = derivation.map((detail) => ({
    asset: "(expected set)",
    kind: "derivation",
    severity: "error",
    detail,
  }));

  const manifest = expected.find((entry) => entry.name === MANIFEST);
  if (!manifest?.comparable || !manifest.manifest) {
    problems.push({
      asset: MANIFEST,
      kind: "manifest",
      severity: "error",
      detail: `does not describe version ${version} as a comparable local artifact`,
    });
  }

  const localAssets = expected
    .filter((entry) => entry.comparable && entry.localPath)
    .map((entry) => ({
      name: entry.name,
      size: entry.size,
      state: "uploaded",
      digest: `sha256:${entry.sha256}`,
    }));
  const comparison = verifyAssets({ expected, assets: localAssets });
  problems.push(...comparison.problems);

  return { ok: !problems.some((p) => p.severity === "error"), problems };
}

/** Human-readable problem list, worst first. */
export function formatProblems(problems) {
  const rank = { error: 0, warn: 1, info: 2 };
  return [...problems]
    .sort((a, b) => rank[a.severity] - rank[b.severity])
    .map((p) => `  [${p.severity}] ${p.asset}: ${p.detail}`)
    .join("\n");
}

/**
 * The only network call. Injectable so every failure path is testable.
 *
 * Throws Error with a `.kind` of "not-found" | "rate-limit" | "auth" |
 * "malformed" | "http" — all of which mean "THE CHECK COULD NOT RUN", never
 * "the release is broken". Conflating those two makes the verifier the thing
 * that blocks releases.
 */
export async function fetchReleaseAssets({
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  tag,
  token,
  fetchImpl = fetch,
}) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchImpl(url, { headers });

  if (!res.ok) {
    const err = new Error(`${url} returned ${res.status}`);
    if (res.status === 404) {
      err.kind = "not-found";
      err.message = `no release tagged ${tag} at ${owner}/${repo} (${url} returned 404)`;
    } else if (res.status === 403 || res.status === 429) {
      err.kind = "rate-limit";
      err.message = `GitHub rate-limited or refused the request (${res.status}) — the CHECK could not run`;
    } else if (res.status === 401) {
      err.kind = "auth";
      err.message = `GitHub rejected the token (401) — the CHECK could not run`;
    } else {
      err.kind = "http";
    }
    throw err;
  }

  let body;
  try {
    body = await res.json();
  } catch (cause) {
    const err = new Error(`${url} returned unparseable JSON — the CHECK could not run`);
    err.kind = "malformed";
    err.cause = cause;
    throw err;
  }

  if (!Array.isArray(body?.assets)) {
    const err = new Error(
      `${url} returned no assets[] array (shape drift?) — the CHECK could not run`,
    );
    err.kind = "malformed";
    throw err;
  }

  return body.assets;
}

/** The exact public shape produced by the current Windows-only release. */
export function requiredRemoteAssetNames(version) {
  return releaseAssetNames(version);
}

/**
 * PURE metadata checks for a self-contained public release.  Unlike
 * verifyAssets(), this deliberately has no local build: signed NSIS packages
 * are not reproducible across independent builders.
 */
export function verifyRemoteAssetShape({ version, assets }) {
  const problems = [];
  const required = requiredRemoteAssetNames(version);
  const counts = new Map();
  for (const asset of assets ?? []) counts.set(asset.name, (counts.get(asset.name) ?? 0) + 1);

  for (const name of required) {
    const matches = (assets ?? []).filter((asset) => asset.name === name);
    if (matches.length === 0) {
      problems.push({ asset: name, kind: "missing", severity: "error", detail: "not present on the release" });
      continue;
    }
    if (matches.length !== 1) {
      problems.push({ asset: name, kind: "duplicate", severity: "error", detail: `present ${matches.length} times; expected exactly once` });
      continue;
    }
    const asset = matches[0];
    if (asset.state !== "uploaded") {
      problems.push({ asset: name, kind: "state", severity: "error", detail: `state is "${asset.state}", expected "uploaded"` });
    }
    if (!Number.isSafeInteger(asset.size) || asset.size <= 0) {
      problems.push({ asset: name, kind: "size", severity: "error", detail: `published size ${asset.size} is not a positive integer` });
    }
    if (typeof asset.digest !== "string" || !/^sha256:[0-9a-f]{64}$/i.test(asset.digest)) {
      problems.push({ asset: name, kind: "no-digest", severity: "error", detail: "GitHub did not return a usable sha256 digest" });
    }
    if (typeof asset.browser_download_url !== "string" || !asset.browser_download_url.startsWith("https://")) {
      problems.push({ asset: name, kind: "download-url", severity: "error", detail: "no HTTPS browser_download_url was returned" });
    }
  }

  for (const [name, count] of counts) {
    if (!required.includes(name)) {
      problems.push({ asset: name, kind: "extra", severity: "info", detail: `present ${count} time(s) but not required` });
    }
  }
  return { ok: !problems.some((problem) => problem.severity === "error"), problems };
}

async function fetchAssetBytes(asset, fetchImpl) {
  const response = await fetchImpl(asset.browser_download_url, { headers: { Accept: "application/octet-stream" } });
  if (!response.ok) {
    const error = new Error(`${asset.name} download returned ${response.status} — the CHECK could not run`);
    error.kind = response.status === 404 ? "public-unavailable" : "http";
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

/** Map verifier failures onto the tag workflow's retry contract. */
export function verificationFailureExitCode(error, { remoteCoherent = false } = {}) {
  if (remoteCoherent && (error?.kind === "not-found" || error?.kind === "public-unavailable")) return 1;
  return 2;
}

/** Verify the public release against itself, not against a second signed build. */
export async function verifyRemoteRelease({
  version,
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  token,
  fetchImpl = fetch,
}) {
  const assets = await fetchReleaseAssets({ owner, repo, tag: `v${version}`, token, fetchImpl });
  const shape = verifyRemoteAssetShape({ version, assets });
  if (!shape.ok) return { ...shape, assets, expected: requiredRemoteAssetNames(version), notes: [] };

  const byName = new Map(assets.map((asset) => [asset.name, asset]));
  const manifestAsset = byName.get(MANIFEST);
  const installerName = `Kanmer-Setup-${version}.exe`;
  const installerAsset = byName.get(installerName);
  const [manifestBytes, installerBytes] = await Promise.all([
    fetchAssetBytes(manifestAsset, fetchImpl),
    fetchAssetBytes(installerAsset, fetchImpl),
  ]);
  const problems = [...shape.problems];
  const manifestText = manifestBytes.toString("utf8");
  const manifest = parseManifest(manifestText);
  if (manifestVersion(manifestText) !== version) {
    problems.push({ asset: MANIFEST, kind: "manifest", severity: "error", detail: `version is ${manifestVersion(manifestText) ?? "missing"}, expected ${version}` });
  }
  if (manifest.url !== installerName) {
    problems.push({ asset: MANIFEST, kind: "manifest", severity: "error", detail: `files[0].url is "${manifest.url}", expected "${installerName}"` });
  }
  if (manifest.size !== installerBytes.length || installerAsset.size !== installerBytes.length) {
    problems.push({ asset: MANIFEST, kind: "manifest", severity: "error", detail: `installer size does not agree across manifest, GitHub metadata and downloaded bytes` });
  }
  const installerSha512 = createHash("sha512").update(installerBytes).digest("base64");
  if (manifest.sha512 !== installerSha512) {
    problems.push({ asset: MANIFEST, kind: "manifest", severity: "error", detail: "files[0].sha512 does not match the downloaded installer" });
  }
  for (const [asset, bytes] of [[manifestAsset, manifestBytes], [installerAsset, installerBytes]]) {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (asset.digest.toLowerCase() !== `sha256:${sha256}`) {
      problems.push({ asset: asset.name, kind: "digest", severity: "error", detail: "GitHub digest does not match downloaded bytes" });
    }
  }
  return {
    ok: !problems.some((problem) => problem.severity === "error"),
    problems,
    assets,
    expected: requiredRemoteAssetNames(version),
    notes: ["verified public manifest and installer bytes without comparing an independent signed build"],
  };
}

/**
 * The whole thing, for callers that want one function: derive, sanity-check,
 * fetch, verify.
 *
 * @returns {{ok, problems, expected, notes, assets}}
 */
export async function verifyRelease({
  version,
  localDir = DEFAULT_LOCAL_DIR,
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  token,
  fetchImpl = fetch,
}) {
  const { expected, notes } = expectedAssets({ version, localDir });
  const insane = sanityCheckExpected({ expected, version });
  if (insane.length > 0) {
    return {
      ok: false,
      derivationBroken: true,
      problems: insane.map((detail) => ({
        asset: "(expected set)",
        kind: "derivation",
        severity: "error",
        detail,
      })),
      expected,
      notes,
      assets: [],
    };
  }

  const assets = await fetchReleaseAssets({ owner, repo, tag: `v${version}`, token, fetchImpl });
  const { ok, problems } = verifyAssets({ expected, assets });
  return { ok, derivationBroken: false, problems, expected, notes, assets };
}

// ---------------------------------------------------------------------------
// CLI. Runs standalone against ANY published tag, which is what makes this
// verifiable today against production data without cutting a release:
//
//   node scripts/verify-release-assets.mjs 0.3.2   -> PASS
//   node scripts/verify-release-assets.mjs 0.3.0   -> FAIL (blockmap missing)
// ---------------------------------------------------------------------------
const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const argv = process.argv.slice(2);
  const VALUE_FLAGS = new Set(["dir", "owner", "repo"]);
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      if (VALUE_FLAGS.has(name)) flags[name] = argv[++i];
      else flags[name] = true;
    } else {
      positional.push(a);
    }
  }
  const flag = (name, fallback) => flags[name] ?? fallback;
  const version = positional[0];

  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error("usage: node scripts/verify-release-assets.mjs <version> [--remote-coherent] [--dir <localDir>] [--owner <o>] [--repo <r>]");
    console.error('  version is MAJOR.MINOR.PATCH with no "v" prefix');
    process.exit(2);
  }

  const token = ["GITHUB_RELEASE_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"]
    .map((v) => process.env[v])
    .find((v) => (v ?? "").length > 0);

  const localDir = resolve(root, flag("dir", DEFAULT_LOCAL_DIR));
  const owner = flag("owner", DEFAULT_OWNER);
  const repo = flag("repo", DEFAULT_REPO);

  const remoteCoherent = flags["remote-coherent"] === true;
  console.log(remoteCoherent
    ? `verifying ${owner}/${repo} v${version} as a self-contained public release`
    : `verifying ${owner}/${repo} v${version} against ${localDir}`);

  // Set process.exitCode and let the loop drain; do NOT call process.exit() here.
  // process.exit() straight after a global fetch() trips libuv on Windows
  // ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\\win\\async.c")
  // because the undici connection pool still holds a handle — the process then
  // dies with 127 instead of the exit code we chose, and a caller reading the
  // exit code would see neither PASS nor FAIL. Observed while building this.
  let result;
  try {
    result = remoteCoherent
      ? await verifyRemoteRelease({ version, owner, repo, token })
      : await verifyRelease({ version, localDir, owner, repo, token });
  } catch (err) {
    // Distinct exit code: the check could not run. NOT the same as a broken release.
    console.error(`\nverification could not run (${err.kind ?? "error"}): ${err.message}`);
    if (err.kind === "rate-limit" || err.kind === "auth") {
      console.error("  fix: set GH_TOKEN (or GITHUB_RELEASE_TOKEN / GITHUB_TOKEN) to a PAT with repo scope");
    }
    process.exitCode = verificationFailureExitCode(err, { remoteCoherent });
    result = null;
  }

  if (result) {
    for (const note of result.notes) console.log(`  note: ${note}`);
    console.log(`  expected ${result.expected.length} asset(s): ${result.expected.map((e) => e.name ?? e).join(", ")}`);

    if (result.problems.length > 0) console.log(`\n${formatProblems(result.problems)}`);

    if (result.ok) {
      console.log(remoteCoherent
        ? `\nPASS: v${version} is complete and its public manifest matches the published installer bytes`
        : `\nPASS: every expected asset of v${version} is present, uploaded, and byte-identical to the local build`);
    } else {
      const errs = result.problems.filter((p) => p.severity === "error").length;
      console.error(`\nFAIL: v${version} has ${errs} problem(s) that make the release incomplete`);
      process.exitCode = 1;
    }
  }
}
