// Run every dependency-free node:test file directly under scripts/.
//
// The package script used to pass a quoted glob to node --test. Git Bash on
// Windows preserves that pattern, and the Node 20 test runner then tries to
// open the literal `scripts/*.test.mjs` path. Enumerating the files here keeps
// the authoritative rail independent of the shell that launched it.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));

export function testFilesIn(directory = scriptsDir) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    .map((entry) => join(directory, entry.name));
}

export function runScriptTests(files = testFilesIn()) {
  if (files.length === 0) {
    console.error(`No scripts/*.test.mjs files found in ${scriptsDir}`);
    return 1;
  }

  const result = spawnSync(process.execPath, ["--test", ...files], {
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Could not start Node's test runner: ${result.error.message}`);
    return 1;
  }
  if (result.signal) {
    console.error(`Node's test runner terminated with signal ${result.signal}`);
    return 1;
  }
  return result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runScriptTests();
}
