import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const expected = ["/d", "/s", "/c", "%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"];

function validate(entry) {
  assert.equal(entry.command, "cmd.exe");
  assert.deepEqual(entry.args, expected);
  assert.equal(entry.args[3].includes('"'), false);
  assert.equal(entry.cwd, undefined);
  assert.deepEqual(Object.keys(entry.env ?? {}), ["KANMER_BOARD_BRANCH"]);
}

test("native Antigravity descriptor uses one unquoted portable launcher token", () => {
  const config = JSON.parse(readFileSync(join(root, "plugins/kanmer/mcp_config.json"), "utf8"));
  validate(config.mcpServers.kanmer);
});

test("embedded JSON quotes are rejected because agy passes them literally", () => {
  assert.throws(
    () => validate({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"'],
      env: { KANMER_BOARD_BRANCH: "kanmer-board" },
    }),
    /deep-equal|strict equal|expected|actual/,
  );
});
