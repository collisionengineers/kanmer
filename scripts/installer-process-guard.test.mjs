import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "apps", "gui", "build", "installer.nsh"), "utf8");

test("the NSIS process guard overrides the broken Electron Builder predicate", () => {
  assert.match(source, /!macro customCheckAppRunning/);
  assert.match(source, /Win32_Process/);
  assert.match(source, /\$\$_\.ExecutablePath/);
  assert.doesNotMatch(source, /\$\$_\.Path\b/);
});

test("process discovery is path-safe, bounded, and fail-closed before install", () => {
  assert.match(source, /SetEnvironmentVariable\(t "KANMER_INSTALL_ROOT", t "\$INSTDIR"\) i\.R9/);
  assert.match(source, /TrimEnd\('\\'\) \+ '\\'/);
  assert.match(source, /StringComparison\]::OrdinalIgnoreCase/);
  assert.match(source, /Sleep 1000/);
  assert.match(source, /Sleep 500/);
  assert.match(source, /Stop-Process -Id \$\$_\.ProcessId -Force -ErrorAction SilentlyContinue/);
  assert.match(source, /process enumeration failed; refusing partial replacement/);
  assert.match(source, /processes remain; refusing partial replacement/);
  assert.match(source, /No application files will be replaced\.[^\n]+\/SD IDOK/);
  assert.match(source, /SetErrorLevel 22\s+Quit/);
  assert.match(source, /SetErrorLevel 23\s+Quit/);
});

test("only a real updater parent bypasses the interactive replacement prompt", () => {
  assert.match(source, /GetOptions[^\n]+\/KEEP_APP_DATA/);
  assert.match(source, /KANMER_UPDATER_PARENT/);
  assert.match(source, /\$R7 == "updater"[\s\S]+Sleep 1000/);
  assert.match(source, /MessageBox MB_OKCANCEL[\s\S]+\/SD IDCANCEL/);
  assert.doesNotMatch(source, /\$\{If\} \$\{isUpdated\}\s+Sleep 1000/);
});

test("same-version repair stages an immutable external runtime generation", () => {
  assert.match(source, /GetCurrentProcessId\(\) i\.R9/);
  assert.match(source, /StrCpy \$R8 "\$\{VERSION\}-\$R9"/);
  assert.match(source, /IfFileExists "\$LOCALAPPDATA\\Kanmer\\mcp\\\$R8" gui106_runtime_collision/);
  assert.match(source, /StrCpy \$R8 "\$\{VERSION\}-\$R9-\$R7"/);
  assert.match(source, /\$R7 >= 1000/);
  assert.match(source, /mklink \/J[^\n]+\\mcp\\\$R8/);
  assert.match(source, /StrCmp \$R1 "\$R8" gui106_runtime_prune_next/);
});

test("external MCP generation contains the complete Electron runtime", () => {
  assert.match(source, /xcopy \/E \/I \/Q \/Y "\$INSTDIR\\\*"[^\n]+\\mcp\\\$R8/);
  assert.match(source, /\\mcp\\\$R8\\ffmpeg\.dll/);
  assert.match(source, /\\mcp\\\$R8\\resources\.pak/);
});
