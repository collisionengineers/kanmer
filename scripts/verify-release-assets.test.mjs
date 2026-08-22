// Tests for the release-asset verifier.
//
// node:test, not vitest, deliberately: every script in this directory states it
// is dependency-free, and both vitest suites are workspace-scoped
// (packages/core, apps/gui) with no root config and no root devDependencies.
// node:test is built in (engines.node >= 20), so this adds no dependency, no
// package-lock.json churn — which matters, because release.mjs:111-116 refuses
// on a dirty tree — and no new config file. Run by `npm run test:scripts`
// (`node scripts/test-scripts.mjs`),
// which `npm test` chains, which is step 1 of the release GATE: these fixtures
// therefore gate every future release.
//
// The GOLDEN fixtures below are the real GitHub API responses for the three
// releases this ticket exists because of, captured verbatim:
//   v0.3.0 must FAIL — its blockmap is genuinely absent, still, today
//   v0.3.1 must PASS — complete after its manual re-publish
//   v0.3.2 must PASS
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  expectedAssets,
  verifyLocalArtifacts,
  verifyAssets,
  sanityCheckExpected,
  fetchReleaseAssets,
  githubName,
  manifestVersion,
  parseManifest,
  formatProblems,
  MANIFEST,
} from "./verify-release-assets.mjs";

// ---------------------------------------------------------------------------
// Golden fixtures — real `assets[]` from
// GET /repos/collisionengineers/kanmer/releases/tags/v<version>
// ---------------------------------------------------------------------------
const GOLDEN = {
  "0.3.0": [
    {
      name: "Kanmer-Setup-0.3.0.exe",
      size: 78033138,
      state: "uploaded",
      digest: "sha256:99c381301dfc07204db503f6137b714b4ef1c1a4538bc3471b816be0034660c5",
    },
    // NOTE: no Kanmer-Setup-0.3.0.exe.blockmap. This is the bug.
    {
      name: "latest.yml",
      size: 340,
      state: "uploaded",
      digest: "sha256:88670e6e213805220c57e0a14c8cbfc49608feae860fb56b0428a20324e67430",
    },
  ],
  "0.3.1": [
    {
      name: "Kanmer-Setup-0.3.1.exe",
      size: 78034599,
      state: "uploaded",
      digest: "sha256:8da45859e550977c29ab77cdda42e51d36e4698aa4ce6b42fbf16d164f4fabb0",
    },
    {
      name: "Kanmer-Setup-0.3.1.exe.blockmap",
      size: 82137,
      state: "uploaded",
      digest: "sha256:dba19a9558c863a0d689951373f81eb99e7491cd10a151e79979ea84eea35d47",
    },
    {
      name: "latest.yml",
      size: 340,
      state: "uploaded",
      digest: "sha256:cf4a0602a53e451476b7a2aada16c9098c6dd253e2bd204103fe1d262a443568",
    },
  ],
  "0.3.2": [
    {
      name: "Kanmer-Setup-0.3.2.exe",
      size: 78035151,
      state: "uploaded",
      digest: "sha256:94f10624f7a776d105ac992830b5048188fe80ea5328829fbc5dea5556d83a98",
    },
    {
      name: "Kanmer-Setup-0.3.2.exe.blockmap",
      size: 82158,
      state: "uploaded",
      digest: "sha256:75633601f8769483560760781538da1df12aae98bccd1469bf8791150863bd7a",
    },
    {
      name: "latest.yml",
      size: 340,
      state: "uploaded",
      digest: "sha256:8edafd7f0bd582d57f5f97948d4be463af503056382c2c87779f1507d66259e0",
    },
  ],
};

/**
 * An expected-set entry matching a golden asset exactly, so a fixture "passes"
 * unless the test deliberately perturbs it. Mirrors what expectedAssets()
 * produces from real local files, without needing 78 MB on disk.
 */
function expectedFrom(assets) {
  return assets.map((a) => ({
    name: a.name,
    diskName: a.name.replace(/-/g, " ").replace("Kanmer Setup", "Kanmer Setup"),
    size: a.size,
    sha256: a.digest.slice("sha256:".length),
    comparable: true,
  }));
}

const errors = (r) => r.problems.filter((p) => p.severity === "error");
const kinds = (r) => errors(r).map((p) => p.kind);

// ---------------------------------------------------------------------------
describe("verifyAssets — golden fixtures from the three real releases", () => {
  test("v0.3.2 PASSES: all three assets present, uploaded, digests match", () => {
    const assets = GOLDEN["0.3.2"];
    const r = verifyAssets({ expected: expectedFrom(assets), assets });
    assert.equal(r.ok, true, formatProblems(r.problems));
    assert.deepEqual(r.problems, []);
  });

  test("v0.3.1 PASSES (complete after its manual re-publish)", () => {
    const assets = GOLDEN["0.3.1"];
    const r = verifyAssets({ expected: expectedFrom(assets), assets });
    assert.equal(r.ok, true, formatProblems(r.problems));
  });

  test("v0.3.0 FAILS on exactly one thing: the absent blockmap", () => {
    // The expected set is what 0.3.0 SHOULD have had: the two published assets
    // plus the blockmap that never uploaded.
    const expected = [
      ...expectedFrom(GOLDEN["0.3.0"]),
      { name: "Kanmer-Setup-0.3.0.exe.blockmap", diskName: "Kanmer Setup 0.3.0.exe.blockmap", size: 82157, sha256: "6748a57d799aad888015a455016aea7e8ba2e8d6297cb24d717fa777a8e19589", comparable: true },
    ];
    const r = verifyAssets({ expected, assets: GOLDEN["0.3.0"] });
    assert.equal(r.ok, false, "a release missing its blockmap must not pass");
    assert.deepEqual(kinds(r), ["missing"]);
    assert.equal(errors(r)[0].asset, "Kanmer-Setup-0.3.0.exe.blockmap");
  });

  test("a missing blockmap is an ERROR, not a warning (operator decision)", () => {
    // Guards the severity call itself: downgrading this to a warning re-creates
    // the quiet failure that shipped v0.3.0.
    const expected = expectedFrom(GOLDEN["0.3.2"]);
    const assets = GOLDEN["0.3.2"].filter((a) => !a.name.endsWith(".blockmap"));
    const r = verifyAssets({ expected, assets });
    assert.equal(r.ok, false);
    assert.equal(errors(r).length, 1);
    assert.equal(errors(r)[0].severity, "error");
  });
});

// ---------------------------------------------------------------------------
describe("verifyAssets — the failure modes that were never recorded", () => {
  const base = () => GOLDEN["0.3.2"].map((a) => ({ ...a }));

  test('state "starter" fails: the row exists but the bytes never landed', () => {
    const assets = base();
    assets[0].state = "starter";
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, false);
    assert.ok(kinds(r).includes("state"));
  });

  test("a 412-byte .exe fails on size — the upload that returned 200", () => {
    const assets = base();
    assets[0].size = 412;
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, false);
    assert.ok(kinds(r).includes("size"));
  });

  test("a size mismatch on the manifest fails too", () => {
    const assets = base();
    assets[2].size = 339;
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, false);
    assert.equal(errors(r)[0].asset, MANIFEST);
  });

  test("a digest mismatch fails: published bytes are not the built bytes", () => {
    const assets = base();
    assets[1].digest = `sha256:${"0".repeat(64)}`;
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, false);
    assert.deepEqual(kinds(r), ["digest"]);
  });

  test("digest: null DEGRADES to state+size and says so — it does not crash or pass silently", () => {
    const assets = base();
    assets[0].digest = null;
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, true, "an absent digest must not fail an otherwise good release");
    const warn = r.problems.find((p) => p.kind === "no-digest");
    assert.ok(warn, "the un-verified asset must be reported");
    assert.equal(warn.severity, "warn");
    assert.match(warn.detail, /integrity NOT verified/);
  });

  test("digest: null still catches a bad size (the degrade is partial, not a pass)", () => {
    const assets = base();
    assets[0].digest = null;
    assets[0].size = 412;
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, false);
    assert.ok(kinds(r).includes("size"));
  });

  test("a non-sha256 digest degrades rather than mis-comparing", () => {
    const assets = base();
    assets[0].digest = "sha512:deadbeef";
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, true);
    assert.ok(r.problems.some((p) => p.kind === "no-digest"));
  });

  test("a SPACE-named asset fails as missing — the rename regression", () => {
    // If anyone ever renames an asset by hand, or the space->dash mapping
    // changes, GitHubProvider.resolveFiles and the builder disagree and every
    // client 404s. This must be loud.
    const assets = base();
    assets[0].name = "Kanmer Setup 0.3.2.exe";
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, false);
    assert.ok(errors(r).some((p) => p.kind === "missing" && p.asset === "Kanmer-Setup-0.3.2.exe"));
    assert.ok(r.problems.some((p) => p.kind === "extra" && p.severity === "info"));
  });

  test("an extra asset is informational, never a failure", () => {
    const assets = [...base(), { name: "notes.txt", size: 10, state: "uploaded", digest: null }];
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets });
    assert.equal(r.ok, true);
    const extra = r.problems.find((p) => p.kind === "extra");
    assert.equal(extra.severity, "info");
    assert.equal(extra.asset, "notes.txt");
  });

  test("a release with NO assets at all fails, naming every absentee", () => {
    const r = verifyAssets({ expected: expectedFrom(GOLDEN["0.3.2"]), assets: [] });
    assert.equal(r.ok, false);
    assert.equal(errors(r).length, 3);
    assert.match(errors(r)[0].detail, /no assets at all/);
  });

  test("a present-only entry (comparable: false) checks presence and state, not bytes", () => {
    const expected = [{ name: MANIFEST, comparable: false }];
    assert.equal(verifyAssets({ expected, assets: GOLDEN["0.3.0"] }).ok, true);
    assert.equal(verifyAssets({ expected, assets: [] }).ok, false);
    const bad = verifyAssets({
      expected,
      assets: [{ name: MANIFEST, size: 1, state: "starter", digest: null }],
    });
    assert.equal(bad.ok, false, "state is still checked for present-only entries");
  });

  test("latest.yml's files[0] is cross-checked against the local installer", () => {
    const expected = [
      { name: "Kanmer-Setup-0.3.2.exe", diskName: "Kanmer Setup 0.3.2.exe", size: 78035151, sha256: GOLDEN["0.3.2"][0].digest.slice(7), sha512: "GOODSHA512", comparable: true },
      { name: "Kanmer-Setup-0.3.2.exe.blockmap", diskName: "b", size: 82158, sha256: GOLDEN["0.3.2"][1].digest.slice(7), comparable: true },
      {
        name: MANIFEST,
        diskName: MANIFEST,
        size: 340,
        sha256: GOLDEN["0.3.2"][2].digest.slice(7),
        comparable: true,
        manifest: { url: "Kanmer-Setup-0.3.2.exe", size: 999, sha512: "GOODSHA512" },
      },
    ];
    const r = verifyAssets({ expected, assets: GOLDEN["0.3.2"] });
    assert.equal(r.ok, false, "a manifest describing a different build must fail");
    assert.ok(errors(r).some((p) => p.kind === "manifest" && /files\[0\]\.size/.test(p.detail)));
  });

  test("a manifest sha512 that disagrees with the local installer fails", () => {
    const expected = [
      { name: "Kanmer-Setup-0.3.2.exe", diskName: "e", size: 78035151, sha256: GOLDEN["0.3.2"][0].digest.slice(7), sha512: "GOODSHA512", comparable: true },
      { name: "Kanmer-Setup-0.3.2.exe.blockmap", diskName: "b", size: 82158, sha256: GOLDEN["0.3.2"][1].digest.slice(7), comparable: true },
      {
        name: MANIFEST,
        diskName: MANIFEST,
        size: 340,
        sha256: GOLDEN["0.3.2"][2].digest.slice(7),
        comparable: true,
        manifest: { url: "Kanmer-Setup-0.3.2.exe", size: 78035151, sha512: "WRONG" },
      },
    ];
    const r = verifyAssets({ expected, assets: GOLDEN["0.3.2"] });
    assert.equal(r.ok, false);
    assert.ok(errors(r).some((p) => p.kind === "manifest" && /sha512/.test(p.detail)));
  });
});

describe("verifyLocalArtifacts — pre-publish manifest coherence", () => {
  test("accepts an expected set whose manifest describes its installer", () => {
    const expected = expectedFrom(GOLDEN["0.3.2"]);
    const manifest = expected.find((entry) => entry.name === MANIFEST);
    const installer = expected.find((entry) => entry.name.endsWith(".exe"));
    installer.sha512 = "GOOD";
    manifest.localPath = "latest.yml";
    installer.localPath = "installer.exe";
    expected.find((entry) => entry.name.endsWith(".blockmap")).localPath = "installer.blockmap";
    manifest.manifest = { url: installer.name, size: installer.size, sha512: "GOOD" };
    const result = verifyLocalArtifacts({ expected, version: "0.3.2" });
    assert.equal(result.ok, true, formatProblems(result.problems));
  });

  test("rejects a manifest SHA-512 that differs from its local installer", () => {
    const expected = expectedFrom(GOLDEN["0.3.2"]);
    const manifest = expected.find((entry) => entry.name === MANIFEST);
    const installer = expected.find((entry) => entry.name.endsWith(".exe"));
    installer.sha512 = "GOOD";
    manifest.localPath = "latest.yml";
    installer.localPath = "installer.exe";
    expected.find((entry) => entry.name.endsWith(".blockmap")).localPath = "installer.blockmap";
    manifest.manifest = { url: installer.name, size: installer.size, sha512: "WRONG" };
    const result = verifyLocalArtifacts({ expected, version: "0.3.2" });
    assert.equal(result.ok, false);
    assert.ok(result.problems.some((problem) => problem.kind === "manifest" && /sha512/.test(problem.detail)));
  });

  test("rejects a manifest that does not describe the release version", () => {
    const expected = expectedFrom(GOLDEN["0.3.2"]);
    expected.find((entry) => entry.name === MANIFEST).comparable = false;
    const result = verifyLocalArtifacts({ expected, version: "0.3.2" });
    assert.equal(result.ok, false);
    assert.ok(result.problems.some((problem) => /does not describe version/.test(problem.detail)));
  });
});

// ---------------------------------------------------------------------------
describe("expectedAssets — version filter, rename, manifest handling", () => {
  let dir;
  function fixtureDir(manifestVersionValue = "0.3.2") {
    dir = mkdtempSync(join(tmpdir(), "kanmer-verify-"));
    // apps/gui/release/ accumulates EVERY past version's artifacts.
    writeFileSync(join(dir, "Kanmer Setup 0.3.0.exe"), "zero");
    writeFileSync(join(dir, "Kanmer Setup 0.3.0.exe.blockmap"), "zero-bm");
    writeFileSync(join(dir, "Kanmer Setup 0.3.1.exe"), "one");
    writeFileSync(join(dir, "Kanmer Setup 0.3.1.exe.blockmap"), "one-bm");
    writeFileSync(join(dir, "Kanmer Setup 0.3.2.exe"), "two");
    writeFileSync(join(dir, "Kanmer Setup 0.3.2.exe.blockmap"), "two-bm");
    writeFileSync(join(dir, "builder-debug.yml"), "noise");
    mkdirSync(join(dir, "win-unpacked"));
    writeFileSync(
      join(dir, MANIFEST),
      [
        `version: ${manifestVersionValue}`,
        "files:",
        `  - url: Kanmer-Setup-${manifestVersionValue}.exe`,
        "    sha512: SHA512HERE==",
        "    size: 3",
        `path: Kanmer-Setup-${manifestVersionValue}.exe`,
        "sha512: SHA512HERE==",
        "releaseDate: '2026-08-16T15:14:42.692Z'",
      ].join("\n"),
    );
    return dir;
  }
  const cleanup = () => dir && rmSync(dir, { recursive: true, force: true });

  test("filters to the requested version — other versions' artifacts are ignored", (t) => {
    t.after(cleanup);
    const { expected } = expectedAssets({ version: "0.3.2", localDir: fixtureDir() });
    assert.deepEqual(expected.map((e) => e.name).sort(), [
      "Kanmer-Setup-0.3.2.exe",
      "Kanmer-Setup-0.3.2.exe.blockmap",
      "latest.yml",
    ]);
  });

  test("applies the space->dash rename, and keeps the disk name for messages", (t) => {
    t.after(cleanup);
    const { expected } = expectedAssets({ version: "0.3.1", localDir: fixtureDir() });
    const exe = expected.find((e) => e.name.endsWith(".exe"));
    assert.equal(exe.name, "Kanmer-Setup-0.3.1.exe");
    assert.equal(exe.diskName, "Kanmer Setup 0.3.1.exe");
  });

  test("ignores directories and unrelated files", (t) => {
    t.after(cleanup);
    const { expected } = expectedAssets({ version: "0.3.0", localDir: fixtureDir() });
    assert.ok(!expected.some((e) => e.name === "win-unpacked"));
    assert.ok(!expected.some((e) => e.name === "builder-debug.yml"));
  });

  test("latest.yml is always expected, and byte-compared when it is this version's", (t) => {
    t.after(cleanup);
    const { expected, notes } = expectedAssets({ version: "0.3.2", localDir: fixtureDir("0.3.2") });
    const m = expected.find((e) => e.name === MANIFEST);
    assert.equal(m.comparable, true);
    assert.equal(m.manifest.url, "Kanmer-Setup-0.3.2.exe");
    assert.deepEqual(notes, []);
  });

  test("latest.yml for a DIFFERENT version is present-only, with a note saying so", (t) => {
    t.after(cleanup);
    const { expected, notes } = expectedAssets({ version: "0.3.0", localDir: fixtureDir("0.3.2") });
    const m = expected.find((e) => e.name === MANIFEST);
    assert.equal(m.comparable, false, "must not compare another version's manifest bytes");
    assert.equal(notes.length, 1);
    assert.match(notes[0], /PRESENCE only/);
  });

  test("computes sha512 for the installer only (the manifest bridge)", (t) => {
    t.after(cleanup);
    const { expected } = expectedAssets({ version: "0.3.2", localDir: fixtureDir() });
    assert.ok(expected.find((e) => e.name.endsWith(".exe")).sha512);
    assert.equal(expected.find((e) => e.name.endsWith(".blockmap")).sha512, undefined);
  });

  test("a nonexistent localDir yields an empty set and a note (which the floor then rejects)", () => {
    const { expected, notes } = expectedAssets({
      version: "0.3.2",
      localDir: join(tmpdir(), "kanmer-does-not-exist-9e1f"),
    });
    assert.deepEqual(expected, []);
    assert.equal(notes.length, 1);
    assert.equal(sanityCheckExpected({ expected, version: "0.3.2" }).length, 1);
  });
});

// ---------------------------------------------------------------------------
describe("sanityCheckExpected — the floor against a vacuous pass", () => {
  test("an empty expected set is refused", () => {
    const p = sanityCheckExpected({ expected: [], version: "1.0.0" });
    assert.equal(p.length, 1);
    assert.match(p[0], /contains no \.exe/);
  });

  test("manifest-only (no artifacts on disk) is refused — this is the vacuous pass", () => {
    const p = sanityCheckExpected({ expected: [{ name: MANIFEST }], version: "1.0.0" });
    assert.equal(p.length, 1);
  });

  test("an .exe without its .blockmap is refused as a broken derivation", () => {
    const p = sanityCheckExpected({
      expected: [{ name: "Kanmer-Setup-1.0.0.exe" }, { name: MANIFEST }],
      version: "1.0.0",
    });
    assert.equal(p.length, 1);
    assert.match(p[0], /no Kanmer-Setup-1\.0\.0\.exe\.blockmap/);
  });

  test("the real shape passes the floor", () => {
    const p = sanityCheckExpected({
      expected: [
        { name: "Kanmer-Setup-1.0.0.exe" },
        { name: "Kanmer-Setup-1.0.0.exe.blockmap" },
        { name: MANIFEST },
      ],
      version: "1.0.0",
    });
    assert.deepEqual(p, []);
  });

  test("the floor is a floor, not a whitelist: extra targets are fine", () => {
    const p = sanityCheckExpected({
      expected: [
        { name: "Kanmer-Setup-1.0.0.exe" },
        { name: "Kanmer-Setup-1.0.0.exe.blockmap" },
        { name: "Kanmer-1.0.0-arm64.exe" },
        { name: "Kanmer-1.0.0-arm64.exe.blockmap" },
        { name: "Kanmer-1.0.0.dmg" },
        { name: MANIFEST },
      ],
      version: "1.0.0",
    });
    assert.deepEqual(p, []);
  });
});

// ---------------------------------------------------------------------------
describe("fetchReleaseAssets — every network failure is 'the CHECK could not run'", () => {
  const ok = (body) => ({ ok: true, status: 200, json: async () => body });
  const bad = (status) => ({ ok: false, status, json: async () => ({}) });

  test("returns assets[] on success and sends the API headers + token", async () => {
    let seen;
    const assets = await fetchReleaseAssets({
      owner: "o",
      repo: "r",
      tag: "v1.2.3",
      token: "T",
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return ok({ assets: GOLDEN["0.3.2"] });
      },
    });
    assert.equal(seen.url, "https://api.github.com/repos/o/r/releases/tags/v1.2.3");
    assert.equal(seen.init.headers.Authorization, "Bearer T");
    assert.equal(seen.init.headers.Accept, "application/vnd.github+json");
    assert.equal(assets.length, 3);
  });

  test("omits Authorization when there is no token", async () => {
    let seen;
    await fetchReleaseAssets({
      tag: "v1.0.0",
      fetchImpl: async (_u, init) => {
        seen = init;
        return ok({ assets: [] });
      },
    });
    assert.equal(seen.headers.Authorization, undefined);
  });

  test("404 -> kind 'not-found'", async () => {
    await assert.rejects(
      fetchReleaseAssets({ tag: "v9.9.9", fetchImpl: async () => bad(404) }),
      (e) => e.kind === "not-found" && /no release tagged v9\.9\.9/.test(e.message),
    );
  });

  test("403 and 429 -> kind 'rate-limit', and the message says the CHECK could not run", async () => {
    for (const status of [403, 429]) {
      await assert.rejects(
        fetchReleaseAssets({ tag: "v1.0.0", fetchImpl: async () => bad(status) }),
        (e) => e.kind === "rate-limit" && /CHECK could not run/.test(e.message),
      );
    }
  });

  test("401 -> kind 'auth'", async () => {
    await assert.rejects(
      fetchReleaseAssets({ tag: "v1.0.0", fetchImpl: async () => bad(401) }),
      (e) => e.kind === "auth",
    );
  });

  test("500 -> kind 'http'", async () => {
    await assert.rejects(
      fetchReleaseAssets({ tag: "v1.0.0", fetchImpl: async () => bad(500) }),
      (e) => e.kind === "http",
    );
  });

  test("malformed JSON -> kind 'malformed', not a crash", async () => {
    await assert.rejects(
      fetchReleaseAssets({
        tag: "v1.0.0",
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError("Unexpected token <");
          },
        }),
      }),
      (e) => e.kind === "malformed",
    );
  });

  test("a body with no assets[] array -> kind 'malformed' (API shape drift)", async () => {
    await assert.rejects(
      fetchReleaseAssets({ tag: "v1.0.0", fetchImpl: async () => ok({ tag_name: "v1.0.0" }) }),
      (e) => e.kind === "malformed" && /shape drift/.test(e.message),
    );
  });
});

// ---------------------------------------------------------------------------
describe("small helpers", () => {
  test("githubName applies the space->dash mapping", () => {
    assert.equal(githubName("Kanmer Setup 0.3.2.exe"), "Kanmer-Setup-0.3.2.exe");
    assert.equal(githubName("latest.yml"), "latest.yml");
  });

  test("manifestVersion reads the version key", () => {
    assert.equal(manifestVersion("version: 0.3.2\nfiles:\n"), "0.3.2");
    assert.equal(manifestVersion("files:\n"), null);
  });

  test("parseManifest reads files[0].{url,sha512,size}", () => {
    const m = parseManifest(
      "version: 0.3.2\nfiles:\n  - url: Kanmer-Setup-0.3.2.exe\n    sha512: AAA==\n    size: 78035151\npath: Kanmer-Setup-0.3.2.exe\n",
    );
    assert.equal(m.url, "Kanmer-Setup-0.3.2.exe");
    assert.equal(m.sha512, "AAA==");
    assert.equal(m.size, 78035151);
  });

  test("formatProblems sorts errors above warnings above info", () => {
    const out = formatProblems([
      { asset: "c", severity: "info", detail: "i" },
      { asset: "a", severity: "error", detail: "e" },
      { asset: "b", severity: "warn", detail: "w" },
    ]).split("\n");
    assert.match(out[0], /\[error] a/);
    assert.match(out[1], /\[warn] b/);
    assert.match(out[2], /\[info] c/);
  });
});
