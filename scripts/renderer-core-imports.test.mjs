// Guard: apps/gui/src/renderer must never import runtime helpers from the
// Node core entry (@kanmer/core) — that entry pulls in node:crypto and other
// Node builtins, and Vite bundles the whole file into the browser context,
// breaking `npm run build -w @kanmer/gui` (GUI-146). Type-only imports are
// fine (erased at build time), and `@kanmer/core/browser` is the browser-safe
// runtime entry.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rendererDir = join(scriptsDir, "..", "apps", "gui", "src", "renderer");

// Matches a whole `import ... from "@kanmer/core"` statement (single- or
// multi-line), capturing whether it is `import type`. Deliberately excludes
// `@kanmer/core/browser` by requiring the specifier to end at the closing
// quote right after `@kanmer/core`.
const IMPORT_RE = /import\s+(type\s+)?[^;]*?\sfrom\s+["']@kanmer\/core["'];?/gs;

export function findRuntimeCoreImports(text) {
  const offenders = [];
  for (const match of text.matchAll(IMPORT_RE)) {
    const isTypeOnly = Boolean(match[1]);
    if (!isTypeOnly) {
      offenders.push(match[0]);
    }
  }
  return offenders;
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test("no renderer file runtime-imports the Node @kanmer/core entry", () => {
  assert.ok(statSync(rendererDir).isDirectory(), `expected renderer dir at ${rendererDir}`);
  const files = walk(rendererDir);
  assert.ok(files.length > 0, "expected to find renderer source files");

  const offenders = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const found = findRuntimeCoreImports(text);
    if (found.length > 0) {
      offenders.push({ file, found });
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `runtime import of @kanmer/core found in renderer files (use @kanmer/core/browser instead): ${JSON.stringify(offenders, null, 2)}`,
  );
});

test("findRuntimeCoreImports rejects a single-line runtime import", () => {
  const offenders = findRuntimeCoreImports('import { isCaptureItem } from "@kanmer/core";');
  assert.deepEqual(offenders, ['import { isCaptureItem } from "@kanmer/core";']);
});

test("findRuntimeCoreImports rejects a multi-line runtime import", () => {
  const text = [
    "import {",
    "  isCaptureItem,",
    '} from "@kanmer/core";',
  ].join("\n");
  const offenders = findRuntimeCoreImports(text);
  assert.equal(offenders.length, 1);
  assert.match(offenders[0], /isCaptureItem/);
});

test("findRuntimeCoreImports accepts a single-line import type", () => {
  const offenders = findRuntimeCoreImports('import type { X } from "@kanmer/core";');
  assert.deepEqual(offenders, []);
});

test("findRuntimeCoreImports accepts a multi-line import type", () => {
  const text = [
    "import type {",
    " X,",
    '} from "@kanmer/core";',
  ].join("\n");
  assert.deepEqual(findRuntimeCoreImports(text), []);
});

test("findRuntimeCoreImports accepts the browser entry", () => {
  const offenders = findRuntimeCoreImports('import { isCaptureItem } from "@kanmer/core/browser";');
  assert.deepEqual(offenders, []);
});
