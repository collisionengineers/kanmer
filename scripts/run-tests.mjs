// Owns the root `npm test` chain so both the public command and the rail's
// "already built" variant (`npm run test:built`, used inside `npm run verify`
// after `build-stamp --write`) run from one definition. Dependency-free,
// matching the other scripts in this directory.
//
// `COMMANDS` is exported as pure data (CORE-144) so scripts/verify-steps.test.mjs
// can statically expand this script's two modes instead of treating this file
// as an opaque leaf — the previous static resolver only understood
// `npm run <script>` indirection in package.json and could not see through
// this `node scripts/run-tests.mjs` invocation at all, which let the
// `--assume-built` flag that picks between these two lists get dropped
// without the build-once guard noticing.
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const COMMANDS = Object.freeze({
  default: Object.freeze([
    "npm run check:manual",
    "npm run test -w @kanmer/core",
    "npm run test -w @kanmer/gui",
    "npm run test:http -w @kanmer/mcp-server",
    "npm run test:scripts",
  ]),
  assumeBuilt: Object.freeze([
    "npm run check:manual",
    "npm run test -w @kanmer/core",
    "npm run test -w @kanmer/gui",
    "npm run test:http:built -w @kanmer/mcp-server",
    "npm run test:scripts",
  ]),
});

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd: root, stdio: "inherit" });
}

function main() {
  const assumeBuilt = process.argv.includes("--assume-built");
  for (const command of COMMANDS[assumeBuilt ? "assumeBuilt" : "default"]) {
    run(command);
  }
}

// Importing this module (e.g. scripts/verify-steps.test.mjs importing COMMANDS)
// must not run the chain — only executing it directly does.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
