// Owns the root `npm test` chain so both the public command and the rail's
// "already built" variant (`npm run test:built`, used inside `npm run verify`
// after `build-stamp --write`) run from one definition. Dependency-free,
// matching the other scripts in this directory.
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd: root, stdio: "inherit" });
}

function main() {
  const assumeBuilt = process.argv.includes("--assume-built");
  run("npm run check:manual");
  run("npm run test -w @kanmer/core");
  run("npm run test -w @kanmer/gui");
  run(assumeBuilt ? "npm run test:http:built -w @kanmer/mcp-server" : "npm run test:http -w @kanmer/mcp-server");
  run("npm run test:scripts");
}

main();
