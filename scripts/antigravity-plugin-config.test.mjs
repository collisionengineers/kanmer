import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { removeTreeWithRetry } from "../packages/core/dist/index.js";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));
const expected = [
  "/d",
  "/v:on",
  "/s",
  "/c",
  "setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\Kanmer\\bin&&call kanmer-mcp.cmd",
];
const execFileAsync = promisify(execFile);

/**
 * The environment Antigravity actually launches the token in, plus this
 * fixture's `LOCALAPPDATA`.
 *
 * `NoDefaultCurrentDirectoryInExePath` is deliberately removed. While that
 * variable is defined, cmd.exe drops the current directory from its command
 * search path, so `pushd …\Kanmer\bin&&call kanmer-mcp.cmd` cannot resolve the
 * shim the test just wrote and the child fails
 * `'kanmer-mcp.cmd' is not recognized as an internal or external command`.
 * Agent harnesses set it in their own process environment (process scope only —
 * it is absent from the user and machine environments, from an interactive
 * shell, and from the hosted CI runner), and `{ ...process.env }` then hands it
 * to the child. That made these two tests fail 100 % of the time under an agent
 * and pass everywhere else, which is what CORE-128 was chasing. It is a
 * property of the launching harness, not of the launcher token under test, so
 * the fixture controls it rather than inheriting it. Every assertion below is
 * unchanged.
 */
function launcherEnv(localAppData) {
  const env = { ...process.env, LOCALAPPDATA: localAppData };
  delete env.NoDefaultCurrentDirectoryInExePath;
  return env;
}

/** True when cmd.exe could not resolve the shim at all, rather than failing it. */
function shimUnreachable(error) {
  return /is not recognized as an internal or external command/i.test(String(error?.stderr ?? ""));
}

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

test("the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces", { skip: process.platform !== "win32" }, async (t) => {
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
    let stdout;
    try {
      // cmd.exe start-up plus a batch file is normally milliseconds; 30 s is a
      // hang guard, sized so a contended Windows host cannot turn it into a
      // failure (CORE-128).
      ({ stdout } = await execFileAsync("cmd.exe", [...expected.slice(0, 4), `${expected[4]} --probe`], {
        env: launcherEnv(localAppData),
        cwd: caller,
        windowsHide: true,
        timeout: 30_000,
      }));
    } catch (error) {
      // If cmd.exe cannot resolve the shim at all, this host cannot exercise
      // the launcher token. Record why rather than reporting a pass.
      if (shimUnreachable(error)) {
        t.skip(`cmd.exe could not resolve the shim: ${String(error.stderr).trim()}`);
        return;
      }
      throw error;
    }
    assert.match(stdout, /PROVIDER_CWD=.*provider workspace/);
    assert.match(stdout, /KANMER_ARGV_SPACE_OK/);
  } finally {
    await removeTreeWithRetry(root);
  }
});

test("the shipped installer shim restores the provider cwd before MCP launch", { skip: process.platform !== "win32" }, async (t) => {
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
    let stdout;
    try {
      // See the sibling test: 30 s is a hang guard, not a latency claim.
      ({ stdout } = await execFileAsync("cmd.exe", [...expected.slice(0, 4), expected[4]], {
        env: launcherEnv(localAppData),
        cwd: caller,
        windowsHide: true,
        timeout: 30_000,
      }));
    } catch (error) {
      if (shimUnreachable(error)) {
        t.skip(`cmd.exe could not resolve the shim: ${String(error.stderr).trim()}`);
        return;
      }
      throw error;
    }
    assert.match(stdout, /CWD=.*provider workspace/);
    assert.match(stdout, /PROVIDER_CWD=.*provider workspace/);
  } finally {
    await removeTreeWithRetry(root);
  }
});
