// The one shared verification rail for PRs and releases. Keep this
// dependency-free: it is both directly executable and imported by release.mjs.
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The authoritative ordered verification commands for PRs and releases. */
export const VERIFY_STEPS = Object.freeze([
  "npm test",
  "npm run typecheck",
  "npm run build",
  "node packages/mcp-server/src/smoke.mjs",
  "npm run smoke:protocol",
  "npm run smoke:discovery",
  "npm run verify:skills",
  "npm run verify:agents-block",
  "npm run plugin:check",
]);

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd: root, stdio: "inherit" });
}

// fileURLToPath avoids URL/path separator differences when this script runs on
// Windows. Importing this module must expose the array without running the rail.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  for (const step of VERIFY_STEPS) run(step);
}
