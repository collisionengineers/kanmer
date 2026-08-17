// One-command release: verify everything, bump, build, tag, publish, then prove
// that clients can actually see the result.
//
// There is no CI, so this script is the release process. It REFUSES; it never
// guesses. Every check here exists because it is a failure mode that is silent
// or expensive otherwise:
//
//   - a draft release is invisible to every installed client (GitHubProvider
//     reads releases.atom and /releases/latest, neither of which lists drafts);
//   - a version starting with "v" throws deep inside the publisher
//     (gitHubPublisher.js:35-37), after a four-minute pack;
//   - a prerelease version is excluded from /releases/latest, so the updater
//     would never see it;
//   - `--publish always` is load-bearing from a laptop: getOrCreateRelease
//     (gitHubPublisher.js:101) only creates a release when publish === "always"
//     OR a CI tag exists, and there is no CI tag here;
//   - stale release notes ship last release's text;
//   - a stale committed plugin bundle ships an old MCP server to plugin users;
//   - `electron-builder --publish always` can exit 0 having uploaded NOTHING
//     (see EP_GH_IGNORE_TIME below and scripts/verify-release-assets.mjs), which
//     is how three consecutive releases shipped with a missing asset.
//
// Dependency-free, matching the other scripts in this directory.
//
// Usage: node scripts/release.mjs <version> [--dry-run]
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyRelease, formatProblems } from "./verify-release-assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guiDir = join(root, "apps", "gui");
const guiPkgPath = join(guiDir, "package.json");
const rootPkgPath = join(root, "package.json");
// The two plugin manifests carry a version too, and it is not decoration:
// bundledSkillsVersion() reads .claude-plugin/plugin.json, and codex keys its
// plugin cache directory by the version. Left out of the bump they froze at
// 0.1.0 across three releases and killed the "Update skills" affordance
// (MCP-011). plugin:check fails when they disagree; bumping them here is what
// stops the disagreement happening in the first place.
const pluginManifestPaths = [
  join(root, "plugins", "kanmer", ".claude-plugin", "plugin.json"),
  join(root, "plugins", "kanmer", ".codex-plugin", "plugin.json"),
];
const notesPath = join(guiDir, "release-notes.md");

const OWNER = "collisionengineers";
const REPO = "kanmer";
const releaseDir = join(guiDir, "release");

// ---------------------------------------------------------------------------
// EP_GH_IGNORE_TIME is load-bearing, not cosmetic. Set it once, here, before
// anything packs — run() uses execSync, which inherits process.env, so no
// per-call plumbing is needed.
//
// Without it, gitHubPublisher.js getOrCreateRelease() returns *null* for a
// release whose published_at is more than two hours old (:85-96), and doUpload()
// then merely logs "skipped publishing" and returns — no throw, exit 0 (:126-131).
// Both manual re-publishes of the incomplete 0.3.x releases needed this. It is
// especially load-bearing for the repair pass in section 9: without it, the
// repair would itself silently no-op into a second identical failure.
// ---------------------------------------------------------------------------
process.env.EP_GH_IGNORE_TIME = "true";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const version = argv.find((a) => !a.startsWith("--"));

/**
 * Stop the script from a refusal without calling process.exit().
 *
 * process.exit() straight after a fetch() trips libuv on Windows —
 * "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\win\async.c:76"
 * — because undici's connection pool still holds a handle. The process then
 * dies with **127** instead of the code we chose, and prints a crash banner
 * directly under a refusal that was supposed to be the clearest line in the log.
 * An operator cannot tell "the script refused" from "the script crashed", which
 * defeats the whole point of refusing.
 *
 * So refuse() sets the exit code and throws a sentinel nothing catches: the
 * script stops just as dead, the loop drains normally, and the exit code
 * survives. Measured on Node 24 / Windows — 3/3 crash with exit(), 3/3 clean
 * this way. Do not "simplify" this back to process.exit().
 */
class Refusal extends Error {}
const onFatal = (err) => {
  if (err instanceof Refusal) return; // already reported by refuse()
  console.error(err);
  process.exitCode = 1;
};
process.on("uncaughtException", onFatal);
process.on("unhandledRejection", onFatal);

/** Refuse, loudly and with the fix. */
function refuse(why, fix) {
  console.error(`release refused: ${why}`);
  if (fix) console.error(`  fix: ${fix}`);
  process.exitCode = 1;
  throw new Refusal(why);
}

function run(command, cwd = root) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

function capture(command, cwd = root) {
  return execSync(command, { cwd, encoding: "utf8" }).trim();
}

/** [major, minor, patch] -> comparable. */
function cmp(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Pre-flight. All of it before any work, so a bad invocation fails in 200ms
// rather than after a four-minute pack.
// ---------------------------------------------------------------------------
if (!version) {
  refuse("no version given", "node scripts/release.mjs <version> [--dry-run]");
}

// 2. Version shape. Checked before anything else touches the network or disk.
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  if (version.startsWith("v")) {
    refuse(
      `version "${version}" starts with "v"`,
      'pass "0.2.0", not "v0.2.0" — the publisher throws on a leading v, and the ' +
        "git tag gets its own v prefix",
    );
  }
  refuse(
    `version "${version}" is not MAJOR.MINOR.PATCH`,
    "no prerelease suffixes: GitHub excludes prereleases from /releases/latest, " +
      "so the updater would never see the release",
  );
}

const guiPkg = JSON.parse(readFileSync(guiPkgPath, "utf8"));
const current = guiPkg.version;
if (cmp(version, current) <= 0) {
  refuse(
    `version ${version} is not greater than the current ${current}`,
    "pick a higher version — allowDowngrade is off, so clients ignore anything lower",
  );
}

// 1. Clean tree on main.
//
// These two are about WHERE the release commit lands, so they are hard refusals
// for a real release and advisory for --dry-run: a dry run makes no commit, no
// tag and no push, and its whole purpose is to be runnable from a feature
// branch before merging. Refusing there would just mean nobody runs it.
function requireOrWarn(bad, why, fix) {
  if (!bad) return;
  if (dryRun) console.warn(`warning (a real release would refuse): ${why}`);
  else refuse(why, fix);
}
const status = capture("git status --porcelain");
requireOrWarn(
  status.length > 0,
  "the working tree is not clean",
  // The rule used to read "only the version bump". It is now wider, on purpose
  // (MCP-012): the release commit contains the version bump AND the artifacts
  // derived from it — `plugins/kanmer/mcp/kanmer-mcp.cjs`, which is rebuilt
  // after the bump because the version is compiled into it, and
  // `package-lock.json`. What must still be true when you START is that
  // nothing ELSE is pending: everything the commit carries is produced by this
  // script, below, and nothing is swept in from your working tree.
  "commit or stash first — the release commit must contain only the version bump " +
    "and the artifacts this script regenerates from it",
);
const branch = capture("git rev-parse --abbrev-ref HEAD");
requireOrWarn(branch !== "main", `on branch "${branch}", not main`, "release from main");

// 3. A token, in this precedence order.
const tokenVar = ["GITHUB_RELEASE_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"].find(
  (v) => (process.env[v] ?? "").length > 0,
);
if (!tokenVar) {
  refuse(
    "no GitHub token in the environment",
    "set GH_TOKEN (or GITHUB_RELEASE_TOKEN / GITHUB_TOKEN) to a PAT with repo scope",
  );
}

// 4. Release notes that mention THIS version.
if (!existsSync(notesPath)) {
  refuse(`no ${notesPath}`, "write the release notes — they become the GitHub release body");
}
if (!readFileSync(notesPath, "utf8").includes(version)) {
  refuse(
    `${notesPath} does not mention ${version}`,
    "update the notes — this is the guard against shipping last release's text",
  );
}

console.log(`release ${current} -> ${version}`);
console.log(`token: ${tokenVar} (set)`);
console.log(`notes: ${notesPath}`);

// ---------------------------------------------------------------------------
// Verification gate. Each must exit 0, in this order.
// ---------------------------------------------------------------------------
const GATE = [
  "npm run build",
  // NOT plugin:build *here*. The original reason still holds at this point in
  // the script: this gate runs BEFORE the version bump, the tree is required to
  // be clean, and rewriting the committed bundle now would dirty it for no
  // gain — plugin:check verifies the same bytes without producing a diff.
  //
  // What changed (MCP-012): the bundle now has the version compiled into it, so
  // it must be rebuilt AFTER the bump — see step 5b below, which is where
  // plugin:build moved to, not where it was deleted from. Here the version is
  // still the current one, so the committed bundle and a fresh build agree and
  // this check is exactly as meaningful as it always was.
  "npm run plugin:check",
  "npm test",
  "node packages/mcp-server/src/smoke.mjs",
  "node packages/mcp-server/src/smoke-protocol.mjs",
  "npm run verify:agents-block",
  // The manual is a committed generated artifact, so a stale one ships
  // silently. `npm test` above runs this too — named here as well because this
  // list is the ship decision and should say what shipping requires (DOC-007;
  // until then nothing in the repo invoked check:manual at all).
  "npm run check:manual",
  // FRD-023 R5. Pure file reads, no build, sub-second — a rail step everyone
  // pays for on every release has to be cheap. It is the only thing that
  // asserts anything about skill prose, so its absence was why the AGENTS
  // block could describe a profile set that no longer existed (SKILL-013).
  "npm run verify:skills",
  // Every workspace, not just the GUI. The -w form here is what let c8b94a4
  // ship: the release rail was the only thing running a typecheck at all, and
  // it ran one workspace's (GUI-067).
  "npm run typecheck",
];
for (const step of GATE) run(step);

if (dryRun) {
  console.log("\n--- dry run: the verification gate passed ---");
  console.log("Would now:");
  console.log(
    `  1. write ${version} into apps/gui/package.json, package.json and both plugin.json manifests`,
  );
  console.log("  2. npm install --package-lock-only");
  console.log(
    `  3. npm run build && node scripts/build-plugin.mjs && npm run plugin:check` +
      ` — rebuild the MCP bundle so it reports ${version}, not ${current}`,
  );
  console.log("  4. build the GUI, pack with --publish never, run check-updater-package.mjs");
  console.log(
    `  5. git commit -am "release: v${version}" && git tag v${version}` +
      " — the commit carries the bump AND the rebuilt plugin bundle",
  );
  console.log("  6. git push && git push --tags (GitHub requires the tag to exist before it will publish against it)");
  console.log("  7. pack again with --publish always");
  console.log(`  8. verify /releases/latest is v${version}, then verify EVERY published asset`);
  console.log("     (installer, blockmap, latest.yml) is present, uploaded, and byte-identical");
  console.log("     to the local build — comparing GitHub's sha256 digest against the local files");
  console.log("  9. on any gap: re-publish ONCE, re-verify, then refuse loudly without demoting");
  console.log("\nNothing was written. The tree is untouched.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 5. The version bump. apps/gui/package.json is the authoritative one —
//    appInfo.version reads the APP dir's metadata (appInfo.js:29). The root is
//    private and cosmetic, but kept in step so they never disagree.
// ---------------------------------------------------------------------------
function bump(path) {
  const text = readFileSync(path, "utf8");
  const bumped = text.replace(/("version":\s*)"[^"]+"/, `$1"${version}"`);
  if (bumped === text) refuse(`could not rewrite the version in ${path}`, "check the file by hand");
  writeFileSync(path, bumped);
  console.log(`bumped ${path}`);
}
bump(guiPkgPath);
bump(rootPkgPath);
for (const path of pluginManifestPaths) bump(path);
run("npm install --package-lock-only");

// ---------------------------------------------------------------------------
// 5b. Rebuild the MCP bundle, now that the version is the new one.
//
//     The server compiles the release version in at build time (an esbuild
//     `define` reading the root package.json — packages/mcp-server/
//     version-define.mjs) so that `get_status` can report which build is
//     answering. MCP-012 exists because two hosts pointed at the same board
//     were running different server builds enforcing different gates, and
//     nothing anywhere said so.
//
//     That makes the bundle a function of the version, so the order matters:
//       bump  ->  rebuild  ->  pack  ->  commit
//     Without this step v0.3.3 would ship resources/mcp/kanmer-mcp.cjs still
//     reporting 0.3.2 — a stamp that lies is worse than no stamp — and the
//     committed plugin bundle would then be stale against a fresh build, so
//     the NEXT `npm run plugin:check` (including this script's own gate, next
//     release) would fail on main.
//
//     It must run before the pack: electron-builder's extraResources copies
//     dist/standalone/kanmer-mcp.cjs into the app (apps/gui/electron-builder.yml).
//
//     The regenerated plugins/kanmer/mcp/kanmer-mcp.cjs is tracked, so the
//     `git commit -am` in step 7 carries it — that is deliberate, and it is why
//     the clean-tree rule above now says "the bump and the artifacts derived
//     from it". Authorised by the operator for MCP-012.
// ---------------------------------------------------------------------------
run("npm run build");
run("node scripts/build-plugin.mjs");
// Paranoia, cheap: prove the committed bundle now matches a fresh build at the
// NEW version before anything is packed, committed, tagged or pushed. If this
// ever fails, the release stops here with the tree still local and fixable.
run("npm run plugin:check");

// ---------------------------------------------------------------------------
// 6. Pass 1: pack WITHOUT publishing, and check the package. Catching "no
//    app-update.yml" or "electron-updater missing from the asar" before a
//    release exists on GitHub is worth the extra pack.
// ---------------------------------------------------------------------------
run("npm run build -w @kanmer/gui");
run("npx electron-builder --win --publish never", guiDir);
run("node scripts/check-updater-package.mjs");

// ---------------------------------------------------------------------------
// 7. Commit, tag, and push immediately. GitHub will not create a non-draft
//    release for a tag it has never seen: createRelease() sends no
//    target_commitish, and a *published* (draft: false) release requires the
//    tag_name to already exist as a real ref — otherwise the API returns 422
//    "Published releases must have a valid tag". Discovered the hard way on
//    the first non-dry-run execution of this script: publishing before
//    pushing let GitHub silently create a broken release (wrong commit, no
//    assets) while still returning that error to the client. So the tag must
//    be live on origin *before* pass 2 tries to publish against it.
// ---------------------------------------------------------------------------
run(`git commit -am "release: v${version}"`);
run(`git tag v${version}`);
run("git push");
run("git push --tags");

// ---------------------------------------------------------------------------
// 8. Pass 2: publish for real.
// ---------------------------------------------------------------------------
run("npx electron-builder --win --publish always", guiDir);

// ---------------------------------------------------------------------------
// 9a. The release is VISIBLE. Read exactly what GitHubProvider reads: it polls
//     releases.atom and /releases/latest, and neither lists drafts, so a draft
//     release reaches zero installed clients — silently. Kept as its own check
//     because it tests a different thing from 9b: not "are the bytes there" but
//     "can any client ever see this release at all".
// ---------------------------------------------------------------------------
const latestUrl = `https://github.com/${OWNER}/${REPO}/releases/latest`;
const res = await fetch(latestUrl, { headers: { Accept: "application/json" } });
const body = await res.json();
if (body.tag_name !== `v${version}`) {
  refuse(
    `${latestUrl} reports tag_name "${body.tag_name}", expected "v${version}"`,
    "the release is probably a DRAFT — check releaseType in apps/gui/electron-builder.yml. " +
      "Until this is right, no installed client can see the update.",
  );
}
console.log(`\nverified: /releases/latest is v${version}`);

// ---------------------------------------------------------------------------
// 9b. Every published asset is present, uploaded, and byte-identical to what
//     was just built. Three consecutive releases uploaded incompletely while
//     electron-builder logged success (0.3.0 lost its blockmap, 0.3.1 its
//     installer AND manifest, 0.3.2 its manifest), so the publisher's exit code
//     is not evidence of upload. One REST call gets name/size/state/digest for
//     every asset; the local files are hashed and compared, so this is a full
//     integrity check that downloads zero bytes.
//
//     A missing .exe.blockmap is a HARD failure, same as any other missing
//     asset. Treating it as a warning is exactly how 0.3.0 passed the old gate.
//
//     On a gap: re-publish ONCE, re-verify, then refuse. Bounded at one — a loop
//     turns a visible failure into a hang. On the second failure the script does
//     NOT demote the release: rewriting a public artifact unattended is a
//     judgement call the operator wants to make, so refuse() names the manual
//     command instead.
// ---------------------------------------------------------------------------
async function verifyAssetsNow() {
  try {
    return await verifyRelease({
      version,
      localDir: releaseDir,
      owner: OWNER,
      repo: REPO,
      token: process.env[tokenVar],
    });
  } catch (err) {
    // The CHECK could not run. That is NOT the same as "the release is broken",
    // and must never be reported as if it were.
    refuse(
      `could not verify the published assets (${err.kind ?? "error"}): ${err.message}`,
      "this is the CHECK failing, not necessarily the release. Re-run " +
        `\`node scripts/verify-release-assets.mjs ${version}\` once the cause is cleared, ` +
        "and check the release by hand before assuming it is good.",
    );
  }
}

let check = await verifyAssetsNow();
console.log(`  expected ${check.expected.length} asset(s): ${check.expected.map((e) => e.name).join(", ")}`);
for (const note of check.notes) console.log(`  note: ${note}`);

if (!check.ok && check.derivationBroken) {
  // Republishing cannot fix an expected set that is wrong — the local pack
  // output is missing, so there is nothing to compare against and nothing to
  // upload. Refuse straight away rather than burning a repair pass.
  refuse(
    `the expected asset set could not be derived from ${releaseDir}:\n${formatProblems(check.problems)}`,
    "the pack output is missing or incomplete — this is a bug in the release script's " +
      "assumptions, not in the release. Inspect the directory before touching the release.",
  );
}

if (!check.ok) {
  console.error(`\nthe published release is INCOMPLETE:\n${formatProblems(check.problems)}`);
  console.error("\nre-publishing once (EP_GH_IGNORE_TIME is set, overwriteArtifact makes this idempotent)…");
  run("npx electron-builder --win --publish always", guiDir);

  check = await verifyAssetsNow();
  if (!check.ok) {
    refuse(
      `v${version} is STILL incomplete after one re-publish:\n${formatProblems(check.problems)}`,
      "the tag and release are already public and are NOT being demoted automatically. " +
        "Fix by hand, then re-verify with " +
        `\`node scripts/verify-release-assets.mjs ${version}\`. To take the release out of ` +
        "/releases/latest while you work, mark it a prerelease:\n" +
        `         gh release edit v${version} --prerelease\n` +
        "       …and undo it with `--latest` once the assets are complete.",
    );
  }
  console.log("\nthe re-publish repaired the release.");
}

for (const p of check.problems) console.warn(`  [${p.severity}] ${p.asset}: ${p.detail}`);
console.log(
  `\nverified: all ${check.expected.length} assets of v${version} are present, uploaded, ` +
    "and byte-identical to the local build",
);

// ---------------------------------------------------------------------------
// 10. What the script cannot enforce.
// ---------------------------------------------------------------------------
console.log(`
released v${version}

Every asset of this release was verified against GitHub after publishing.

Residual manual checklist:
  - NEVER delete assets from old releases. Provider.getBlockMapFiles derives the
    PREVIOUS release's blockmap URL by string-replacing the version, so a missing
    old blockmap silently costs every client on that version a full ~77 MB
    download instead of a differential one. This script verifies the release it
    just cut; nothing re-checks the older ones.
  - v0.3.0 is missing its blockmap on GitHub and stays that way (accepted gap,
    GUI-066): clients still on 0.3.0 pay one full download on their next update.
  - The installer is unsigned: SmartScreen warns on a manual download, but not on
    an auto-update (no Mark-of-the-Web, spawned by an already-trusted process).

Re-verify any published release at any time, without cutting a new one:
  node scripts/verify-release-assets.mjs <version>
`);
