// Owns the single `node --test` file list behind `npm run test:http`. Keeping
// the list here (rather than inlined in package.json) means the rail's
// "already built" variant (`--assume-built`, used by `npm run test:built`)
// runs the exact same tests without duplicating the list anywhere.
//
// Default behaviour matches the historic `test:http` script exactly: build
// the workspace, then run the tests. `--assume-built` skips the build and
// instead refuses (via build-stamp's assertBuilt) if the server output does
// not match the rail's build-once stamp.
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..");

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
    execFileSync("npm", ["run", "build"], { cwd: packageRoot, stdio: "inherit", shell: true });
  }
  process.exitCode = runTests();
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = process.exitCode || 1;
});
