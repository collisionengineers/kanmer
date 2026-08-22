// Tests for the governing-doc numbering guard.
//
// node:test, not vitest — same reasoning as verify-release-assets.test.mjs:
// scripts/ is dependency-free by convention, node:test is built in, and this
// runs under `npm run test:scripts` (`node scripts/test-scripts.mjs`), which
// `npm test` chains.
//
// Two things are checked here:
//   1. the real docs/ tree in this repo has exactly one file per (kind, number)
//      — this is the guard actually doing its job on every test run;
//   2. a deliberately planted duplicate is caught — proving the guard would
//      have failed loudly on the ADR-0013 collision this ticket fixes, had it
//      existed at the time. The fixture is created in a temp directory and
//      removed at the end of the test; nothing is left behind.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { findDuplicates, groupByNumber } from "./check-doc-numbering.mjs";

describe("check-doc-numbering", () => {
  test("the real docs/ tree has no duplicate ADR/FRD/PRD numbers", () => {
    const problems = findDuplicates();
    assert.deepEqual(problems, []);
  });

  test("groupByNumber groups by the leading number and ignores non-matching files", () => {
    const dir = mkdtempSync(join(tmpdir(), "kanmer-doc-numbering-"));
    try {
      writeFileSync(join(dir, "ADR-0001-first.md"), "");
      writeFileSync(join(dir, "ADR-0002-second.md"), "");
      writeFileSync(join(dir, "README.md"), ""); // does not match ADR-####-*.md
      const groups = groupByNumber(dir, "ADR");
      assert.equal(groups.size, 2);
      assert.deepEqual(groups.get("0001"), ["ADR-0001-first.md"]);
      assert.deepEqual(groups.get("0002"), ["ADR-0002-second.md"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a directory that does not exist yet reports no duplicates (not an error)", () => {
    const groups = groupByNumber(join(tmpdir(), "kanmer-doc-numbering-does-not-exist"), "ADR");
    assert.equal(groups.size, 0);
  });

  test("fails on a deliberately planted duplicate ADR number", () => {
    const dir = mkdtempSync(join(tmpdir(), "kanmer-doc-numbering-dup-"));
    try {
      // Plant exactly the shape of the real collision this ticket fixes: two
      // ADR-0013s with different slugs.
      writeFileSync(join(dir, "ADR-0013-hosts-own-their-registration-file.md"), "");
      writeFileSync(join(dir, "ADR-0013-staleness-by-content-not-version.md"), "");
      writeFileSync(join(dir, "ADR-0014-some-other-decision.md"), "");

      const problems = findDuplicates([{ kind: "ADR", dir }]);

      assert.equal(problems.length, 1);
      assert.match(problems[0], /^ADR-0013 has 2 files:/);
      assert.match(problems[0], /ADR-0013-hosts-own-their-registration-file\.md/);
      assert.match(problems[0], /ADR-0013-staleness-by-content-not-version\.md/);
      // The clean number must not be reported.
      assert.doesNotMatch(problems[0], /ADR-0014/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails independently per kind (ADR duplicate does not hide a clean FRD, and vice versa)", () => {
    const adrDir = mkdtempSync(join(tmpdir(), "kanmer-doc-numbering-adr-"));
    const frdDir = mkdtempSync(join(tmpdir(), "kanmer-doc-numbering-frd-"));
    try {
      writeFileSync(join(adrDir, "ADR-0001-a.md"), "");
      writeFileSync(join(adrDir, "ADR-0001-b.md"), "");
      writeFileSync(join(frdDir, "FRD-001-clean.md"), "");

      const problems = findDuplicates([
        { kind: "ADR", dir: adrDir },
        { kind: "FRD", dir: frdDir },
      ]);

      assert.equal(problems.length, 1);
      assert.match(problems[0], /^ADR-0001 has 2 files:/);
    } finally {
      rmSync(adrDir, { recursive: true, force: true });
      rmSync(frdDir, { recursive: true, force: true });
    }
  });
});
