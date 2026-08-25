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
  assert.match(source, /nsExec::Exec \/TIMEOUT=10000/g);
  assert.match(source, /-not \$\$_\.ExecutablePath -and \$\$_\.Name -ieq 'Kanmer\.exe'/);
  assert.doesNotMatch(source, /-not \$\$_\.ExecutablePath[^\n]+kanmer-mcp\.exe/);
  assert.match(source, /GetCurrentProcessId\(\) i\.R6/);
  assert.match(source, /KANMER_GUARD_PID/);
  assert.match(source, /\$\$_\.ProcessId -ne \$\$guardPid/g);
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
  assert.doesNotMatch(source, /gui106_runtime_prune/);
  assert.doesNotMatch(source, /RMDir \/r "\$LOCALAPPDATA\\Kanmer\\mcp\\\$R1"/);
});

test("runtime overlap canonicalizes roots before comparing either direction", () => {
  assert.match(source, /KANMER_RUNTIME_ROOT/);
  assert.match(source, /GetFullPath[^\n]+TrimEnd\('\\'\) \+ '\\'/);
  assert.match(source, /\$\$install\.StartsWith\(\$\$runtime/);
  assert.match(source, /\$\$runtime\.StartsWith\(\$\$install/);
});

test("external MCP generation contains the complete Electron runtime", () => {
  assert.match(source, /xcopy \/E \/I \/Q \/Y "\$INSTDIR\\\*"[^\n]+\\mcp\\\$R8/);
  assert.match(source, /\\mcp\\\$R8\\ffmpeg\.dll/);
  assert.match(source, /\\mcp\\\$R8\\resources\.pak/);
});

test("an unactivated partial generation is removed on every staging failure", () => {
  assert.match(source, /gui106_runtime_stage_failed:[\s\S]+RMDir "\$LOCALAPPDATA\\Kanmer\\mcp\\current\.next"[\s\S]+RMDir \/r "\$LOCALAPPDATA\\Kanmer\\mcp\\\$R8"[\s\S]+Abort/);
  assert.match(source, /gui106_runtime_copy_failed:[\s\S]+Goto gui106_runtime_stage_failed/);
  assert.match(source, /Could not activate the external Kanmer MCP runtime[\s\S]+Goto gui106_runtime_stage_failed/);
  assert.match(source, /gui106_runtime_activation_failed:[\s\S]+RMDir "\$LOCALAPPDATA\\Kanmer\\mcp\\current"[\s\S]+Goto gui106_runtime_stage_failed/);
});
