import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "check-updater-package.mjs");

async function writeAsarHeader(path) {
  const header = Buffer.from(JSON.stringify({
    files: { node_modules: { files: { "electron-updater": { files: { "package.json": {} } } } } },
  }));
  const prefix = Buffer.alloc(16);
  prefix.writeUInt32LE(header.length, 12);
  await writeFile(path, Buffer.concat([prefix, header]));
}

async function fixture() {
  const out = await mkdtemp(join(tmpdir(), "kanmer-updater-package-"));
  const unpacked = join(out, "win-unpacked");
  const resources = join(unpacked, "resources");
  await mkdir(join(resources, "mcp"), { recursive: true });
  await mkdir(join(resources, "plugins", "kanmer", ".claude-plugin"), { recursive: true });
  await mkdir(join(resources, ".claude-plugin"), { recursive: true });
  await mkdir(join(resources, ".agents", "plugins"), { recursive: true });
  await writeFile(join(resources, "app-update.yml"), "provider: github\nowner: collisionengineers\nrepo: kanmer\n");
  await writeAsarHeader(join(resources, "app.asar"));
  await writeFile(join(out, "latest.yml"), "files:\n  - url: Kanmer-Setup-0.3.3.exe\n    sha512: fixture\npath: Kanmer-Setup-0.3.3.exe\n");
  await writeFile(join(out, "Kanmer-Setup-0.3.3.exe"), "fixture");
  await writeFile(join(resources, "elevate.exe"), "fixture");
  await writeFile(join(resources, "mcp", "kanmer-mcp.cjs"), "fixture");
  await writeFile(join(resources, "plugins", "kanmer", ".claude-plugin", "plugin.json"), "{}");
  await writeFile(join(resources, ".claude-plugin", "marketplace.json"), "{}");
  await writeFile(join(resources, ".agents", "plugins", "marketplace.json"), "{}");
  await writeFile(join(unpacked, "kanmer-mcp.cmd"), [
    'reg.exe query "HKCU\\Software\\Kanmer" /v "InstallDir"',
    "%SystemRoot%\\System32\\reg.exe",
    '"--probe"',
    "resources\\mcp\\kanmer-mcp.cjs",
    "EXTERNAL_BUNDLE=%EXTERNAL_DIR%\\resources\\mcp\\kanmer-mcp.cjs",
    "%LOCALAPPDATA%\\Kanmer\\mcp\\current",
    "kanmer-mcp.exe",
    "icudtl.dat",
    "v8_context_snapshot.bin",
    "ELECTRON_RUN_AS_NODE=1",
  ].join("\n"));
  return out;
}

async function run(out) {
  try {
    const result = await execFileAsync(process.execPath, [script, "--out", out], { cwd: root });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { code: error.code ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("check-updater-package accepts a complete synthetic packaged output", async () => {
  const out = await fixture();
  try {
    const result = await run(out);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /updater package OK \(8 checks\)/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("check-updater-package reports a missing launcher without hiding other checks", async () => {
  const out = await fixture();
  try {
    await rm(join(out, "win-unpacked", "kanmer-mcp.cmd"));
    const result = await run(out);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /missing .*kanmer-mcp\.cmd/);
    assert.match(result.stderr, /updater package FAILED/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("check-updater-package rejects a malformed launcher contract", async () => {
  const out = await fixture();
  try {
    await writeFile(join(out, "win-unpacked", "kanmer-mcp.cmd"), "@echo off\necho C:\\Users\\build\\checkout\n");
    const result = await run(out);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /missing launcher-contract marker/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("check-updater-package rejects a missing MCP bundle", async () => {
  const out = await fixture();
  try {
    await rm(join(out, "win-unpacked", "resources", "mcp", "kanmer-mcp.cjs"));
    const result = await run(out);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /missing .*kanmer-mcp\.cjs/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
