import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shimBytes = readFileSync(join(root, "apps", "gui", "build", "kanmer-mcp.cmd"));
const shim = shimBytes.toString("utf8");
const installer = readFileSync(join(root, "apps", "gui", "build", "installer.nsh"), "utf8");
const builder = readFileSync(join(root, "apps", "gui", "electron-builder.yml"), "utf8");

describe("installer-owned MCP launcher contract", () => {
  test("uses the fixed HKCU indirection and packaged Electron-as-Node target", () => {
    assert.ok(shimBytes.includes(Buffer.from("\r\n")), "the Windows command file must use CRLF");
    for (const marker of [
      "HKCU\\Software\\Kanmer",
      '"InstallDir"',
      "%SystemRoot%\\System32\\reg.exe",
      "Kanmer.exe",
      "resources\\mcp\\kanmer-mcp.cjs",
      "EXTERNAL_BUNDLE=%EXTERNAL_DIR%\\resources\\mcp\\kanmer-mcp.cjs",
      "%LOCALAPPDATA%\\Kanmer\\mcp\\current",
      "kanmer-mcp.exe",
      "icudtl.dat",
      "v8_context_snapshot.bin",
      "ELECTRON_RUN_AS_NODE=1",
    ]) assert.ok(shim.includes(marker), `missing ${marker}`);
  });

  test("keeps cwd and protocol stdio safe", () => {
    assert.ok(!/^\s*(cd|pushd|start)\b/im.test(shim));
    assert.ok(!shim.includes("%*"));
    assert.match(shim, /if "%~1"=="" if "%~2"=="" goto :launch/);
    assert.match(shim, /set "CHILD_EXIT=%ERRORLEVEL%"/);
    assert.match(shim, /endlocal & exit \/b %CHILD_EXIT%/);
    assert.match(shim, /if \/I "%~1"=="--probe" if "%~2"=="" goto :probe/);
  });

  test("has distinct refusal paths without launching the child", () => {
    for (const [code, detail] of [[65, "installation is missing or invalid"], [66, "Kanmer.exe is missing"], [67, "bundled MCP server is missing"], [64, "invalid arguments"]]) {
      assert.ok(shim.includes(`exit /b ${code}`), `missing exit ${code}`);
      assert.ok(shim.includes(detail), `missing ${detail}`);
    }
    assert.match(shim, /:probe[\s\S]*?call :resolve[\s\S]*?echo Kanmer MCP launcher: healthy/);
    assert.match(shim, /malformed\. Repair or reinstall Kanmer/);
  });

  test("wires a static source shim and installer-owned lifecycle", () => {
    assert.match(builder, /extraFiles:[\s\S]*?from: build\/kanmer-mcp\.cmd[\s\S]*?to: kanmer-mcp\.cmd/);
    assert.match(builder, /nsis:[\s\S]*?include: build\/installer\.nsh/);
    for (const marker of ["!macro customInstall", "!macro customUnInstall", "WriteRegStr HKCU", "Kernel32::lstrcmpi", "Kernel32::MoveFileEx", "DeleteRegValue HKCU", "mklink /J", "${VERSION}", "RMDir /r \"$LOCALAPPDATA\\Kanmer\\mcp\"", "xcopy /E /I /Q /Y", "resources\\plugins\\kanmer\\skills", "FindFirst"]) {
      assert.ok(installer.includes(marker), `missing ${marker}`);
    }
    assert.match(installer, /\$\{isUpdated\}[\s\S]*?launcher_done/);
    assert.match(installer, /IfFileExists "\$LOCALAPPDATA\\Kanmer\\mcp\\current\\kanmer-mcp\.exe"/);
    assert.doesNotMatch(installer, /IfFileExists "\$LOCALAPPDATA\\Kanmer\\mcp\\current\\Kanmer\.exe"/);
    assert.match(installer, /overlaps the external MCP runtime/);
    assert.doesNotMatch(installer, /HKLM|RMDir \/r \"\$INSTDIR/i);
    assert.doesNotMatch(shim, /target\.txt|PowerShell|WScript|(^|\r?\n)\s*(cd|pushd|start)\b/i);
  });
});
