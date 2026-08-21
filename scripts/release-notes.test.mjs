import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("release notes turn shorthand PR refs into repository links", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/release-notes.mjs", "--since", "v0.3.2"],
    { cwd: root, encoding: "utf8" },
  );

  assert.match(
    output,
    /\(\[PR\]\(https:\/\/github\.com\/collisionengineers\/kanmer\/pull\/96\)\)/,
  );
  assert.doesNotMatch(output, /\(\[PR\]\((?:#)?96\)\)/);
});
