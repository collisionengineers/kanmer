// Owns the single `node --test` file list behind `npm run test:http`. Keeping
// the list here (rather than inlined in package.json) means the rail's
// "already built" variant (`--assume-built`, used by `npm run test:built`)
// runs the exact same tests without duplicating the list anywhere.
//
// Default behaviour matches the historic `test:http` script exactly: build
// the workspace, then run the tests. `--assume-built` skips the build and
// instead refuses (via build-stamp's assertBuilt) if the server output does
// not match the rail's build-once stamp.
//
// CORE-145: `@kanmer/mcp-server`'s own `build` script never builds
// `@kanmer/core` first, so on a genuinely fresh `npm ci` (no prior root
// `npm run build`) the workspace build below fails in esbuild resolving
// `@kanmer/core`. Building core here (rather than adding it to
// `@kanmer/mcp-server`'s `package.json` `build` script) keeps the root
// `npm run build` from building core twice — it already runs
// `npm run build -w @kanmer/core` before `npm run build -w
// @kanmer/mcp-server`. This is skipped whenever `packages/core/dist/index.js`
// already exists (the common case — the rail's own root build, or a prior
// local build), so it only fires on a cold checkout.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..");
const coreDistIndex = join(repoRoot, "packages", "core", "dist", "index.js");

// The exact file list historically inlined in packages/mcp-server/package.json's
// "test:http" script. Keep in sync by construction: this is now the only place
// it is written.
export const TEST_FILES = [
  "src/check-pr.test.mjs",
  "src/delivery.test.mjs",
  "src/release.test.mjs",
  "src/reconciliation.test.mjs",
  "src/step-reconciliation.test.mjs",
  "src/http-auth.test.mjs",
  "src/http-secret.test.mjs",
  "src/http.test.mjs",
  "src/project-registry.test.mjs",
  "src/sources.test.mjs",
  "src/remote-host.test.mjs",
  "src/remote-cli.test.mjs",
  "src/doctor.test.mjs",
  "src/integration/remote-public.test.mjs",
  "src/tunnels/cloudflared-config.test.mjs",
  "src/tunnels/cloudflared-validate.test.mjs",
  "src/tunnels/cloudflared.test.mjs",
  "src/tunnels/fixtures/fake-cloudflared.test.mjs",
  "src/tunnels/logs.test.mjs",
  "src/tunnels/readiness.test.mjs",
  "src/tunnels/supervisor.test.mjs",
];

function runTests() {
  const result = spawnSync(process.execPath, ["--test", ...TEST_FILES], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`node --test terminated with signal ${result.signal}`);
  return result.status ?? 1;
}

async function main() {
  const assumeBuilt = process.argv.includes("--assume-built");
  if (assumeBuilt) {
    const { assertBuilt } = await import(pathToFileURL(join(repoRoot, "scripts", "build-stamp.mjs")).href);
    assertBuilt(["server"]);
  } else {
    if (!existsSync(coreDistIndex)) {
      execFileSync("npm", ["run", "build:core"], { cwd: repoRoot, stdio: "inherit", shell: true });
    }
    execFileSync("npm", ["run", "build"], { cwd: packageRoot, stdio: "inherit", shell: true });
  }
  process.exitCode = runTests();
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = process.exitCode || 1;
});
