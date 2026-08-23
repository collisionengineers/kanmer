import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const expected = ["/d", "/s", "/c", "pushd %LOCALAPPDATA%\\Kanmer\\bin && call kanmer-mcp.cmd"];
const execFileAsync = promisify(execFile);

function validate(entry) {
  assert.equal(entry.command, "cmd.exe");
  assert.deepEqual(entry.args, expected);
  assert.equal(entry.args[3].includes('"'), false);
  assert.equal(entry.cwd, undefined);
  assert.deepEqual(Object.keys(entry.env ?? {}), ["KANMER_BOARD_BRANCH"]);
}

test("native Antigravity descriptor uses a quote-free space-safe launcher token", () => {
  const config = JSON.parse(readFileSync(join(root, "plugins/kanmer/mcp_config.json"), "utf8"));
  validate(config.mcpServers.kanmer);
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
  await writeFile(join(bin, "kanmer-mcp.cmd"), "@echo KANMER_ARGV_SPACE_OK\\r\\n", "utf8");
  try {
    const { stdout } = await execFileAsync("cmd.exe", ["/d", "/s", "/c", `${expected[3]} --probe`], {
      env: { ...process.env, LOCALAPPDATA: localAppData },
      windowsHide: true,
      timeout: 5_000,
    });
    assert.match(stdout, /KANMER_ARGV_SPACE_OK/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
