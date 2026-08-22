// Protected-main release: prepare a version PR, then publish only after that
// PR is merged and its release commit is reachable from main.
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
// Usage: node scripts/release.mjs <version> --ticket <id> [--dry-run]
//        node scripts/release.mjs <version> --publish --release-commit <sha>
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseReleaseArgs,
  releaseBranch,
  releaseBranchRef,
  releaseTag,
  releaseTagRef,
  isFullCommitSha,
} from "./release-flow.mjs";

import {
  expectedAssets,
  formatProblems,
  verifyLocalArtifacts,
  verifyRelease,
} from "./verify-release-assets.mjs";
import { exactUploadSpecs, settlePublication } from "./release-publish.mjs";
import { VERIFY_STEPS } from "./verify.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guiDir = join(root, "apps", "gui");
const guiPkgPath = join(guiDir, "package.json");
const rootPkgPath = join(root, "package.json");
// The three plugin manifests carry a version too, and it is not decoration:
// bundledSkillsVersion() reads .claude-plugin/plugin.json, and codex keys its
// plugin cache directory by the version. Left out of the bump they froze at
// 0.1.0 across three releases and killed the "Update skills" affordance
// (MCP-011). plugin:check fails when they disagree; bumping them here is what
// stops the disagreement happening in the first place.
const pluginManifestPaths = [
  join(root, "plugins", "kanmer", ".claude-plugin", "plugin.json"),
  join(root, "plugins", "kanmer", ".codex-plugin", "plugin.json"),
  // Antigravity reads this root manifest directly rather than through a
  // marketplace manifest; it must move with the same release version.
  join(root, "plugins", "kanmer", "plugin.json"),
];
const mcpbManifestPath = join(root, "mcpb", "manifest.json");
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

const argv = process.argv.slice(2);
let parsedArgs;
try {
  parsedArgs = parseReleaseArgs(argv);
} catch (error) {
  refuse(
    error.message,
    "use <version> --ticket <id> [--dry-run] or <version> --publish --release-commit <full-sha>",
  );
}
const {
  dryRun,
  publish: publishMode,
  releaseCommit: requestedReleaseCommit,
  ticket: releaseTicket,
} = parsedArgs ?? {};
const version = parsedArgs?.version;

function run(command, cwd = root) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

function capture(command, cwd = root) {
  return execSync(command, { cwd, encoding: "utf8" }).trim();
}

function assertLocalPackageCoherent() {
  const { expected, notes } = expectedAssets({ version, localDir: releaseDir });
  for (const note of notes) console.log(`  local-pack note: ${note}`);

  const check = verifyLocalArtifacts({ expected, version });
  if (!check.ok) {
    refuse(
      `the local package is incoherent:\n${formatProblems(check.problems)}`,
      "rebuild once with `npx electron-builder --win --publish always` and inspect the resulting manifest before retrying",
    );
  }
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
  refuse("no version given", "node scripts/release.mjs <version> --ticket <id> [--dry-run]");
}

if (!publishMode && (!releaseTicket || !/^[A-Z][A-Z0-9]{1,9}-\d+$/.test(releaseTicket))) {
  refuse(
    "preparation mode needs the current Kanmer ticket id",
    "pass --ticket <ID>, for example --ticket CORE-042",
  );
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
if (publishMode && !requestedReleaseCommit) {
  refuse(
    "publish mode needs the full SHA of the release commit prepared by the merged PR",
    "run `npm run release -- <version> --publish --release-commit <full-sha>` from merged main",
  );
}
if (publishMode && requestedReleaseCommit && !isFullCommitSha(requestedReleaseCommit)) {
  refuse(
    `release commit "${requestedReleaseCommit}" is not a full 40-character SHA`,
    "copy the exact release commit SHA from the merged PR",
  );
}
if (!publishMode && requestedReleaseCommit) {
  refuse("--release-commit is only valid with --publish", "prepare the PR first, then publish after its merge");
}
if (publishMode ? cmp(version, current) !== 0 : cmp(version, current) <= 0) {
  refuse(
    publishMode
      ? `merged main reports version ${current}, not the requested ${version}`
      : `version ${version} is not greater than the current ${current}`,
    publishMode
      ? "update local main after the release PR merges, then retry without changing its manifests"
      : "pick a higher version — allowDowngrade is off, so clients ignore anything lower",
  );
}

// 1. Clean tree on exact main. Both phases begin from main; preparation then
// creates an isolated release branch before it writes anything.
//
// These checks are hard refusals for a real release and advisory for --dry-run:
// a dry run makes no commit, branch, tag, or push.
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
requireOrWarn(branch !== "main", `on branch "${branch}", not main`, "update local main, then start the release from there");

function assertMergedManifestVersions() {
  const paths = [guiPkgPath, rootPkgPath, ...pluginManifestPaths, mcpbManifestPath];
  const mismatches = paths.flatMap((path) => {
    const actual = JSON.parse(readFileSync(path, "utf8")).version;
    return actual === version ? [] : [`${path}: ${actual} (expected ${version})`];
  });
  if (mismatches.length) {
    refuse(
      `merged manifests do not all report ${version}:\n${mismatches.join("\n")}`,
      "merge the complete release PR and update local main before publishing",
    );
  }
}

function assertReleaseCommitReachable() {
  try {
    execSync(`git merge-base --is-ancestor ${requestedReleaseCommit} HEAD`, { cwd: root, stdio: "ignore" });
  } catch (error) {
    const exitCode = error?.status;
    const reason = exitCode === 1 ? "is not an ancestor of local main" : `could not establish ancestry (exit ${exitCode ?? "unknown"})`;
    refuse(
      `release commit ${requestedReleaseCommit} ${reason}`,
      "use the exact release commit from a normally merged PR and update local main",
    );
  }
  console.log(`release commit ${requestedReleaseCommit} is reachable from main`);
}

// 3. A publisher token is needed only after the protected PR merge. The
// preparation phase deliberately uses the operator's normal `gh auth`
// session for branch/PR operations and must not require a second token.
if (publishMode) {
  const tokenVar = ["GITHUB_RELEASE_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"].find(
    (v) => (process.env[v] ?? "").length > 0,
  );
  if (!tokenVar) {
    refuse(
      "no GitHub token in the environment",
      "set GH_TOKEN (or GITHUB_RELEASE_TOKEN / GITHUB_TOKEN) to a PAT with repo scope",
    );
  }
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
// Verification gate. This is the same shared PR rail as `npm run verify`;
// release continues with version bumping, packaging and publication only after
// every step exits 0. `npm test` already runs check:manual, so it appears once.
// ---------------------------------------------------------------------------
for (const step of VERIFY_STEPS) run(step);

if (dryRun) {
  console.log("\n--- dry run: the verification gate passed ---");
  if (publishMode) {
    console.log(`Would verify ${requestedReleaseCommit} is an ancestor of clean main`);
    console.log(`Would create and push only ${releaseTagRef(version)}`);
    console.log("Would build/publish one Windows installer and verify visibility, updater, and every asset digest");
  } else {
    console.log(`Would create ${releaseBranch(version)} from main (without switching in dry-run)`);
    console.log(`Would write ${version} into all release manifests, lockfile, and deterministic artifacts`);
    console.log("Would build the GUI, commit the release change, push only the release branch, and open a PR targeting main");
    console.log("Would stop before creating a tag or publishing any release asset");
    console.log(`After the PR merges, rerun: npm run release -- ${version} --publish --release-commit <full-sha>`);
  }
  console.log("\nNothing was written. The tree is untouched.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 5. Preparation only. The version bump is performed on an isolated branch;
//    publication mode starts from the already-merged manifests instead.
// ---------------------------------------------------------------------------
function bump(path) {
  const text = readFileSync(path, "utf8");
  const bumped = text.replace(/("version":\s*)"[^"]+"/, `$1"${version}"`);
  if (bumped === text) refuse(`could not rewrite the version in ${path}`, "check the file by hand");
  writeFileSync(path, bumped);
  console.log(`bumped ${path}`);
}

function remoteRefExists(ref) {
  try {
    return capture(`git ls-remote --heads origin ${ref}`).length > 0;
  } catch (error) {
    refuse(
      `could not inspect origin for ${ref}`,
      "verify network/authentication, then retry so an existing release branch cannot be overwritten",
    );
  }
}

if (publishMode) {
  assertMergedManifestVersions();
  assertReleaseCommitReachable();
} else {
  const branchName = releaseBranch(version);
  if (capture(`git branch --list ${branchName}`).length > 0 || remoteRefExists(releaseBranchRef(version))) {
    refuse(
      `release branch ${branchName} already exists locally or on origin`,
      "finish or remove the previous release attempt through the normal PR workflow before retrying",
    );
  }
  run(`git switch -c ${branchName}`);
  bump(guiPkgPath);
  bump(rootPkgPath);
  for (const path of pluginManifestPaths) bump(path);
  bump(mcpbManifestPath);
  run("npm install --package-lock-only");
}

if (!publishMode) {
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
run("node scripts/build-mcpb.mjs");
// Paranoia, cheap: prove the committed bundle now matches a fresh build at the
// NEW version before anything is packed, committed, tagged or pushed. If this
// ever fails, the release stops here with the tree still local and fixable.
run("npm run plugin:check");

// ---------------------------------------------------------------------------
// 6. Build the GUI source before committing the release. The sole package is
//    intentionally deferred until after the tag is live: Electron Builder's
//    publish mode creates a published (not draft) GitHub release for that tag.
// ---------------------------------------------------------------------------
run("npm run build -w @kanmer/gui");

// `git commit -am` would silently omit the new flow helper/test files. Stage
// the complete, clean release worktree so the PR contains the policy change
// and its regression rail together with the generated version artifacts.
run("git add -A");
run(`git commit -m "release: v${version}"`);
const preparedCommit = capture("git rev-parse HEAD");
run(`git push --set-upstream origin ${releaseBranchRef(version)}`);
run(
  `gh pr create --base main --head ${releaseBranch(version)} --title "release: v${version}" ` +
    `--body "Kanmer: ${releaseTicket}"`,
);
console.log(`\nprepared release PR for ${version} at commit ${preparedCommit}`);
console.log("Merge this release PR through the required verify and conversation boundary.");
console.log("After merge, update local main and rerun with --publish --release-commit <merged SHA>.");
console.log("No tag or release asset was created; wait for the authorized PR merge before --publish.");
process.exit(0);
}

// ---------------------------------------------------------------------------
// 7. Publish only from merged main. GitHub will not create a non-draft release
//    for a tag it has never seen, so the exact tag ref is pushed only after the
//    supplied preparation commit is proven reachable from this main checkout.
// ---------------------------------------------------------------------------
run(`git tag ${releaseTag(version)}`);
run(`git push origin ${releaseTagRef(version)}`);

// ---------------------------------------------------------------------------
// 8. Build and publish the only Windows installer. `latest.yml`, the installer
//    and its blockmap all originate from this one package invocation. The
//    packaged-app rail runs immediately afterwards; it is intentionally not a
//    second --publish never pass, because NSIS output can differ per package.
// ---------------------------------------------------------------------------
let publisherError = null;
try {
  run("npx electron-builder --win --publish always", guiDir);
} catch (error) {
  publisherError = error;
  console.error("\npublisher exited non-zero; checking the public release before deciding whether it failed:");
  console.error(error.message);
}
const mcpbPath = join(root, "dist", "mcpb", `kanmer-${version}.mcpb`);
if (!existsSync(mcpbPath)) {
  refuse(`MCPB output is missing after the release build: ${mcpbPath}`, "run `npm run mcpb:build` and inspect the generated bundle");
}
copyFileSync(mcpbPath, join(releaseDir, `kanmer-${version}.mcpb`));
console.log(`copied MCPB release asset: ${mcpbPath}`);
run("node scripts/check-updater-package.mjs");
assertLocalPackageCoherent();

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
//     On a gap: upload the exact files from this one package once, then
//     re-verify and refuse if it remains incomplete. Never run the pack a
//     second time: NSIS output can differ per package invocation, so a second
//     publish is exactly how a manifest can describe a different installer.
// ---------------------------------------------------------------------------
async function verifyAssetsNow() {
  return verifyRelease({
    version,
    localDir: releaseDir,
    owner: OWNER,
    repo: REPO,
    token: process.env[tokenVar],
  });
}

const publication = await settlePublication({
  publisherError,
  verify: verifyAssetsNow,
  repair: async (expected) => {
    const uploads = exactUploadSpecs(expected);
    console.error("\nthe published release is INCOMPLETE; uploading the exact one-package assets once…");
    run(`gh release upload v${version} --clobber ${uploads.map((upload) => `"${upload}"`).join(" ")}`);
  },
});

if (publication.status === "check-failed") {
  refuse(
    `could not verify the published assets (${publication.error.kind ?? "error"}): ${publication.error.message}`,
    "this is the CHECK failing, not necessarily the release. Re-run " +
      `\`node scripts/verify-release-assets.mjs ${version}\` once the cause is cleared, ` +
      "and check the release by hand before assuming it is good.",
  );
}

if (publication.status === "local-artifacts-invalid") {
  refuse(
    `the expected asset set could not be derived from ${releaseDir}:\n${formatProblems(publication.check.problems)}`,
    "the pack output is missing or incomplete — this is a bug in the release script's " +
      "assumptions, not in the release. Inspect the directory before touching the release.",
  );
}

if (publication.status === "repair-failed" || publication.status === "still-incomplete") {
  const problems = publication.check?.problems ?? [];
  const repairDetail = publication.status === "repair-failed"
    ? `the exact-file repair failed: ${publication.error.message}`
    : "the release is still incomplete after one exact-file repair";
  refuse(
    `${repairDetail}:\n${formatProblems(problems)}`,
    "the tag and release are already public and are NOT being demoted automatically. " +
      "Fix by hand, then re-verify with " +
      `\`node scripts/verify-release-assets.mjs ${version}\`. To take the release out of ` +
      "/releases/latest while you work, mark it a prerelease:\n" +
      `         gh release edit v${version} --prerelease\n` +
      "       …and undo it with `--latest` once the assets are complete.",
  );
}

const check = publication.check;
console.log(`  expected ${check.expected.length} asset(s): ${check.expected.map((e) => e.name).join(", ")}`);
for (const note of check.notes) console.log(`  note: ${note}`);
if (publication.repaired) console.log("\nthe exact-file repair restored the release without a second package.");
if (publisherError) console.warn("\npublisher reported an error, but the externally verified release is complete.");

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
