import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDocStructure } from "./check-doc-structure.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const canonical = readFileSync(
  join(root, "plugins/kanmer/skills/kanmer-docs/assets/doc-structure.md"),
  "utf8",
);

test("the committed document mirror matches the canonical skill asset", () => {
  const mirror = readFileSync(join(root, "docs/contributing/doc-structure.md"), "utf8");
  assert.deepEqual(checkDocStructure({ canonical, mirror }), []);
});

test("the freshness check rejects a stale format-2 mirror fixture", () => {
  const stale = canonical
    .replace("Format 3 uses one folder per document type", "storage format 2 uses loose files")
    .replace("`files/*.md`", "`impact.md`")
    .replace("`scratch/<slug>.md`", "`scratch-<slug>.md`");
  const problems = checkDocStructure({ canonical, mirror: stale });
  assert.ok(problems.some((problem) => problem.includes("differs")));
  assert.ok(problems.some((problem) => problem.includes("retired marker")));
});
