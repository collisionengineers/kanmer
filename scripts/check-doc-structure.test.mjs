import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { checkDocStructure, resolveRepoDocs } from "./check-doc-structure.mjs";
import { removeTreeWithRetrySync } from "../packages/core/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const canonical = readFileSync(
  join(root, "plugins/kanmer/skills/kanmer-docs/assets/doc-structure.md"),
  "utf8",
);

test("the committed mirror resolves this board while the asset stays target-neutral", () => {
  const mirror = readFileSync(join(root, "docs/contributing/doc-structure.md"), "utf8");
  assert.deepEqual(checkDocStructure({ canonical, mirror }), []);
  assert.notEqual(canonical, mirror);
});

test("the freshness check rejects a stale format-2 mirror fixture", () => {
  const mirror = readFileSync(join(root, "docs/contributing/doc-structure.md"), "utf8");
  const stale = mirror
    .replace("Format 3 uses one folder per document type", "storage format 2 uses loose files")
    .replace("`files/*.md`", "`impact.md`")
    .replace("`scratch/<slug>.md`", "`scratch-<slug>.md`");
  const problems = checkDocStructure({ canonical, mirror: stale });
  assert.ok(problems.some((problem) => problem.includes("retired marker")));
});

test("the freshness check uses injected effective board globs", () => {
  const mirror = readFileSync(join(root, "docs/contributing/doc-structure.md"), "utf8")
    .replaceAll("docs/product/prd/**", "docs/custom/prd/**")
    .replaceAll("docs/functional/frd/**", "docs/custom/frd/**")
    .replaceAll("docs/architecture/adr/**", "docs/custom/adr/**");
  const repoDocs = {
    prd: "docs/custom/prd/**",
    frd: "docs/custom/frd/**",
    adr: "docs/custom/adr/**",
  };
  assert.deepEqual(checkDocStructure({ canonical, mirror, repoDocs }), []);
  assert.ok(checkDocStructure({
    canonical,
    mirror,
    repoDocs: { ...repoDocs, frd: "docs/other/frd/**" },
  }).some((problem) => problem.includes("repoDocs.frd")));
});

test("the freshness check discovers repoDocs from a board worktree", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-doc-structure-board-"));
  try {
    mkdirSync(join(fixture, ".kanmer", "data"), { recursive: true });
    writeFileSync(join(fixture, ".kanmer", "data", "board.yml"), [
      "repoDocs:",
      "  prd: docs/custom/prd/**",
      "  frd: docs/custom/frd/**",
      "  adr: docs/custom/adr/**",
    ].join("\n"));
    assert.deepEqual(resolveRepoDocs({ root: fixture, boardRoot: fixture }), {
      prd: "docs/custom/prd/**",
      frd: "docs/custom/frd/**",
      adr: "docs/custom/adr/**",
    });
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});
