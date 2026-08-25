// Fail if the PACKAGED app cannot auto-update.
//
// Every failure this catches is silent at runtime: the app boots, the board
// works, and the updater simply never finds a feed — or throws on an import
// that was bundled away. Compiling proves none of it. Only the packed output
// does, which is why this script reads `release/` rather than `src/`.
//
// Dependency-free on purpose (node:fs / node:path only), matching
// check-plugin-sync.mjs: it runs inside `npm run dist:check`, which is the last
// gate before an installer is handed to a user.
//
// Usage: node scripts/check-updater-package.mjs [--out apps/gui/release]
import { existsSync, openSync, readSync, closeSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
const outFlag = argv.indexOf("--out");
const outDir = resolve(root, outFlag === -1 ? "apps/gui/release" : (argv[outFlag + 1] ?? ""));

const failures = [];
/** Record a failed assertion together with the fix, and keep going. */
function fail(what, fix) {
  failures.push(`${what}\n    fix: ${fix}`);
}

if (!existsSync(outDir)) {
  console.error(`No packaged output at ${outDir} — run \`npm run dist\` first.`);
  process.exit(1);
}

const unpacked = join(outDir, "win-unpacked");
const resources = join(unpacked, "resources");

// ---------------------------------------------------------------------------
// 1. app-update.yml exists and names the real feed.
//
// With `--publish never`, getPublishConfigs runs with errorIfCannot = false, so
// a MALFORMED publish block yields null silently instead of throwing. This
// check is what catches that. Do not remove it.
// ---------------------------------------------------------------------------
const feed = join(resources, "app-update.yml");
if (!existsSync(feed)) {
  fail(
    `missing ${feed}`,
    "add/repair the `publish:` block in apps/gui/electron-builder.yml — " +
      "without it the installed app has no update feed at all",
  );
} else {
  const text = readFileSync(feed, "utf8");
  const want = ["provider: github", "owner: collisionengineers", "repo: kanmer"];
  const absent = want.filter((w) => !text.includes(w));
  if (absent.length > 0) {
    fail(
      `${feed} does not contain: ${absent.join(", ")}`,
      "the `publish:` block in apps/gui/electron-builder.yml",
    );
  }
}

// ---------------------------------------------------------------------------
// 2. electron-updater is actually inside app.asar.
//
// The main bundle imports it at module top level and Vite externalizes it, so
// if electron-builder did not pack it the main process fails to load entirely.
// Read the asar header with no dependency: 16-byte pickle prefix, then a JSON
// header of `headerSize` bytes at offset 16.
// ---------------------------------------------------------------------------
const asar = join(resources, "app.asar");
if (!existsSync(asar)) {
  fail(`missing ${asar}`, "`npm run dist` did not produce an asar — check the electron-builder log");
} else {
  let header = null;
  const fd = openSync(asar, "r");
  try {
    const prefix = Buffer.alloc(16);
    readSync(fd, prefix, 0, 16, 0);
    const headerSize = prefix.readUInt32LE(12);
    const buf = Buffer.alloc(headerSize);
    readSync(fd, buf, 0, headerSize, 16);
    header = JSON.parse(buf.toString("utf8").replace(/\0+$/, ""));
  } catch (err) {
    fail(
      `could not read the asar header of ${asar}: ${err instanceof Error ? err.message : err}`,
      "inspect it by hand with `npx asar list <asar>` — this check's parser may need updating",
    );
  } finally {
    closeSync(fd);
  }
  if (header) {
    const entry = header.files?.node_modules?.files?.["electron-updater"];
    if (!entry) {
      fail(
        "app.asar does not contain node_modules/electron-updater",
        'the "dependencies" entry in apps/gui/package.json, then `npm install` — ' +
          "electron-builder only packs node_modules when the app has real dependencies",
      );
    } else if (!entry.files?.["package.json"]) {
      fail(
        "app.asar has node_modules/electron-updater but no package.json inside it",
        "the packed module is incomplete — check `files:` in apps/gui/electron-builder.yml",
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 3. latest.yml — the feed manifest every installed client polls.
//
// Written even with `--publish never`: PublishManager gates the
// updateFileWriteTask on `event.isWriteUpdateInfo` and a resolvable publish
// config, not on whether it is publishing.
// ---------------------------------------------------------------------------
const latest = join(outDir, "latest.yml");
if (!existsSync(latest)) {
  fail(
    `missing ${latest}`,
    "the `publish:` block in apps/gui/electron-builder.yml — with no resolvable " +
      "publish config electron-builder writes no update manifest, so clients see nothing",
  );
} else {
  // -------------------------------------------------------------------------
  // 4. Its urls name a real local artifact, under the space->dash rename.
  //
  //    latest.yml carries the name the asset will have ON GITHUB, not on disk:
  //    computeSafeArtifactNameIfNeeded (platformPackager.js:690) replaces
  //    spaces with dashes because GitHub only accepts [0-9A-Za-z._-], so
  //    "Kanmer Setup 0.1.0.exe" on disk is published as
  //    "Kanmer-Setup-0.1.0.exe". GitHubProvider.resolveFiles re-derives the
  //    download URL from latest.yml independently, so the two derivations must
  //    agree or every client's download 404s. Match the manifest name back to
  //    exactly one local artifact rather than requiring it verbatim on disk.
  // -------------------------------------------------------------------------
  const text = readFileSync(latest, "utf8");
  const named = [];
  const urlMatch = text.match(/^\s*-?\s*url:\s*(.+)$/m);
  const pathMatch = text.match(/^path:\s*(.+)$/m);
  if (urlMatch) named.push(["files[0].url", urlMatch[1].trim()]);
  if (pathMatch) named.push(["path", pathMatch[1].trim()]);
  if (named.length < 2) {
    fail(
      `${latest} has no files[0].url and/or no legacy path key`,
      "electron-builder wrote an unexpected manifest shape — inspect latest.yml by hand",
    );
  }
  const local = readdirSync(outDir);
  for (const [key, name] of named) {
    const matches = local.filter((f) => f === name || f.replace(/ /g, "-") === name);
    if (matches.length !== 1) {
      fail(
        `${latest} ${key} names "${name}", which matches ${matches.length} artifact(s) in ${outDir}` +
          ` (have: ${local.join(", ")})`,
        "never rename release assets by hand — the space->dash rename is derived " +
          "independently by the builder and by GitHubProvider, and they must agree",
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 5. elevate.exe — electron-updater's EACCES fallback. Without it, an update
//    that needs elevation fails instead of prompting.
// ---------------------------------------------------------------------------
if (!existsSync(join(resources, "elevate.exe"))) {
  fail(
    `missing ${join(resources, "elevate.exe")}`,
    "electron-builder ships this with the nsis target — a missing one means the " +
      "packed resources are incomplete; re-run `npm run dist`",
  );
}

// ---------------------------------------------------------------------------
// 6. The MCP server bundle still ships. Not an updater concern per se, but the
//    updater's whole risk model (an update kills agent MCP sessions) assumes
//    extraResources keeps packing it — and it is the one packaging regression
//    that would otherwise surface only on a user's machine.
// ---------------------------------------------------------------------------
if (!existsSync(join(resources, "mcp", "kanmer-mcp.cjs"))) {
  fail(
    `missing ${join(resources, "mcp", "kanmer-mcp.cjs")}`,
    "the `extraResources:` block in apps/gui/electron-builder.yml, and " +
      "`npm run build` to produce packages/mcp-server/dist/standalone/kanmer-mcp.cjs",
  );
}

// ---------------------------------------------------------------------------
// 7. GUI-099's source launcher lives at the install root. The installer owns
// the stable LOCALAPPDATA copy, but a package missing this input would write a
// registry pointer for a launcher that cannot exist. Check the packed bytes,
// rather than merely the source configuration: packaging is the boundary that
// must preserve the fixed launcher contract.
// ---------------------------------------------------------------------------
const launcher = join(unpacked, "kanmer-mcp.cmd");
if (!existsSync(launcher)) {
  fail(
    `missing ${launcher}`,
    "add apps/gui/build/kanmer-mcp.cmd through electron-builder extraFiles",
  );
} else {
  const launcherText = readFileSync(launcher, "utf8");
  const markers = [
    "HKCU\\Software\\Kanmer",
    '"InstallDir"',
    "%SystemRoot%\\System32\\reg.exe",
    "resources\\mcp\\kanmer-mcp.cjs",
    "EXTERNAL_BUNDLE=%EXTERNAL_DIR%\\resources\\mcp\\kanmer-mcp.cjs",
    "%LOCALAPPDATA%\\Kanmer\\mcp\\current",
    "kanmer-mcp.exe",
    "icudtl.dat",
    "v8_context_snapshot.bin",
    "ELECTRON_RUN_AS_NODE=1",
    '"--probe"',
  ];
  const absent = markers.filter((marker) => !launcherText.includes(marker));
  if (absent.length > 0) {
    fail(
      `${launcher} is missing launcher-contract marker(s): ${absent.join(", ")}`,
      "restore the fixed GUI-099 launcher contract; do not substitute a build-machine path",
    );
  }
  if (/^\s*(pushd|start)\b/im.test(launcherText) || launcherText.includes("%*") || /[A-Za-z]:\\Users\\/i.test(launcherText)) {
    fail(
      `${launcher} changes cwd, forwards arbitrary arguments, or embeds a build-machine user path`,
      "the static shim must use only the fixed HKCU indirection and inherited provider cwd/stdio",
    );
  }
}

const builderConfig = readFileSync(join(root, "apps", "gui", "electron-builder.yml"), "utf8");
if (!/extraFiles:\s*[\s\S]*?from:\s*build\/kanmer-mcp\.cmd[\s\S]*?to:\s*kanmer-mcp\.cmd/.test(builderConfig)) {
  fail(
    "apps/gui/electron-builder.yml does not package build/kanmer-mcp.cmd as the install-root launcher",
    "add the GUI-099 extraFiles entry so NSIS receives the static launcher source",
  );
}
if (!/nsis:[\s\S]*?include: build\/installer\.nsh/.test(builderConfig)) {
  fail(
    "apps/gui/electron-builder.yml does not configure build/installer.nsh",
    "set nsis.include to the GUI-099 lifecycle hook; extraFiles alone cannot own upgrades or uninstall",
  );
}

const installer = readFileSync(join(root, "apps", "gui", "build", "installer.nsh"), "utf8");
const installerMarkers = [
  "!macro customCheckAppRunning",
  "Win32_Process",
  "ExecutablePath",
  "-not $$_.ExecutablePath",
  "/TIMEOUT=10000",
  "KANMER_INSTALL_ROOT",
  "StringComparison]::OrdinalIgnoreCase",
  "refusing partial replacement",
  "!macro customInstall",
  "!macro customUnInstall",
  'HKCU "Software\\Kanmer" "InstallDir"',
  "${isUpdated}",
  "lstrcmpi",
  "mklink /J",
  "${VERSION}",
  "kanmer-mcp.exe",
  "xcopy /E /I /Q /Y",
  '"$INSTDIR\\*"',
  "ffmpeg.dll",
  "resources.pak",
  "resources\\plugins\\kanmer\\skills",
  "KANMER_RUNTIME_ROOT",
  "overlaps the external MCP runtime",
  'RMDir /r "$LOCALAPPDATA\\Kanmer\\mcp"',
  'DeleteRegValue HKCU "Software\\Kanmer" "InstallDir"',
];
const missingInstallerMarkers = installerMarkers.filter((marker) => !installer.includes(marker));
if (missingInstallerMarkers.length > 0) {
  fail(
    `apps/gui/build/installer.nsh is missing lifecycle marker(s): ${missingInstallerMarkers.join(", ")}`,
    "restore the GUI-099 install/uninstall ownership hooks before shipping the package",
  );
}
if (/\$\$_\.Path\b/.test(installer)) {
  fail(
    "apps/gui/build/installer.nsh queries nonexistent Win32_Process.Path",
    "use ExecutablePath in the customCheckAppRunning override; Path makes the installer miss every live runtime",
  );
}

// ---------------------------------------------------------------------------
// 8. The packaged app is a working local plugin marketplace.
//
//    Three files, and the marketplace exists only if all three are packed: the
//    plugin tree, and the two marketplace manifests that are the only way to
//    tell a host about it. `plugin marketplace add <dir>` searches <dir> for one
//    of these and exits 1 when it is absent.
//
//    Shipped wrong until MCP-013: only `plugins/kanmer` was packed, beside a
//    comment saying Connect could "register a local marketplace for the
//    packaged app". `check-plugin-sync.mjs` asserts the same three in the
//    electron-builder CONFIG; this asserts them in the ARTIFACT, because a
//    correct `from:` path that silently packs nothing is exactly the failure a
//    config-level check cannot see.
//
//    Paths are relative to `resources/`, reproducing the repo-root layout, so
//    each manifest's `./plugins/kanmer` resolves and connect.ts's
//    marketplaceRoot() (pluginRoot() minus two segments) lands on `resources/`.
// ---------------------------------------------------------------------------
for (const rel of [
  ["plugins", "kanmer", ".claude-plugin", "plugin.json"],
  [".claude-plugin", "marketplace.json"],
  [".agents", "plugins", "marketplace.json"],
]) {
  const target = join(resources, ...rel);
  if (!existsSync(target)) {
    fail(
      `missing ${target}`,
      "the `extraResources:` block in apps/gui/electron-builder.yml must pack " +
        "plugins/kanmer AND both marketplace manifests — without the manifests the " +
        "packaged app has no local marketplace source and Connect's install exits 1",
    );
  }
}

if (failures.length > 0) {
  console.error(`updater package FAILED (${failures.length} of 8 checks):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("updater package OK (8 checks)");
