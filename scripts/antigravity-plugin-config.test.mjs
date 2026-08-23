import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const expected = [
  "/d",
  "/v:on",
  "/s",
  "/c",
  "setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\Kanmer\\bin&&call kanmer-mcp.cmd",
];
const execFileAsync = promisify(execFile);

function validate(entry) {
  assert.equal(entry.command, "cmd.exe");
  assert.deepEqual(entry.args, expected);
  assert.equal(entry.args[3].includes('"'), false);
  assert.equal(entry.cwd, undefined);
  assert.deepEqual(Object.keys(entry.env ?? {}), ["KANMER_BOARD_BRANCH"]);
}

test("native Antigravity descriptor uses a quote-free space-safe launcher token and preserves cwd", () => {
  const config = JSON.parse(readFileSync(join(repoRoot, "plugins/kanmer/mcp_config.json"), "utf8"));
  validate(config.mcpServers.kanmer);
  assert.match(expected[4], /KANMER_PROVIDER_CWD=!CD!/);
  assert.match(expected[4], /!LOCALAPPDATA!/);
});

test("direct launcher tokens are rejected because they fail when LOCALAPPDATA has spaces", () => {
  assert.throws(
    () => validate({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"],
      env: { KANMER_BOARD_BRANCH: "kanmer-board" },
    }),
    /deep-equal|strict equal|expected|actual/,
  );
});

test("the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces", { skip: process.platform !== "win32" }, async () => {
  const root = await mkdtemp(join(tmpdir(), "kanmer-agy-"));
  const localAppData = join(root, "Kanmer Test Space");
  const bin = join(localAppData, "Kanmer", "bin");
  await mkdir(bin, { recursive: true });
  await writeFile(
    join(bin, "kanmer-mcp.cmd"),
    "@echo CWD=%CD%\\r\\n@echo PROVIDER_CWD=%KANMER_PROVIDER_CWD%\\r\\n@echo KANMER_ARGV_SPACE_OK\\r\\n",
    "utf8",
  );
  const caller = join(root, "provider workspace");
  await mkdir(caller, { recursive: true });
  try {
    const { stdout } = await execFileAsync("cmd.exe", [...expected.slice(0, 4), `${expected[4]} --probe`], {
      env: { ...process.env, LOCALAPPDATA: localAppData },
      cwd: caller,
      windowsHide: true,
      timeout: 5_000,
    });
    assert.match(stdout, /PROVIDER_CWD=.*provider workspace/);
    assert.match(stdout, /KANMER_ARGV_SPACE_OK/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the shipped installer shim restores the provider cwd before MCP launch", { skip: process.platform !== "win32" }, async () => {
  const root = await mkdtemp(join(tmpdir(), "kanmer-agy-cwd-"));
  const localAppData = join(root, "Kanmer Test Space");
  const bin = join(localAppData, "Kanmer", "bin");
  await mkdir(bin, { recursive: true });
  const sourceShim = readFileSync(join(repoRoot, "apps", "gui", "build", "kanmer-mcp.cmd"), "utf8");
  const testShim = sourceShim
    .replace(/:resolve[\s\S]*?:invalid_install\r?\n/, ":resolve\r\nexit /b 0\r\n\r\n:invalid_install\r\n")
    .replace(
      /set "ELECTRON_RUN_AS_NODE=1"\r?\n"%KANMER_EXE%" "%MCP_BUNDLE%"/,
      "@echo CWD=%CD%\r\n@echo PROVIDER_CWD=%KANMER_PROVIDER_CWD%",
    );
  await writeFile(join(bin, "kanmer-mcp.cmd"), testShim, "utf8");
  const caller = join(root, "provider workspace");
  await mkdir(caller, { recursive: true });
  try {
    const { stdout } = await execFileAsync("cmd.exe", [...expected.slice(0, 4), expected[4]], {
      env: { ...process.env, LOCALAPPDATA: localAppData },
      cwd: caller,
      windowsHide: true,
      timeout: 5_000,
    });
    assert.match(stdout, /CWD=.*provider workspace/);
    assert.match(stdout, /PROVIDER_CWD=.*provider workspace/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
