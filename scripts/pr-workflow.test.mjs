import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("kanmer gate follows the configured board branch", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pr.yml", import.meta.url), "utf8");
  assert.match(workflow, /KANMER_BOARD_BRANCH/);
  assert.match(workflow, /git fetch origin "\$KANMER_BOARD_BRANCH"/);
  assert.match(workflow, /origin\/\$KANMER_BOARD_BRANCH/);
  assert.doesNotMatch(workflow, /git fetch origin kanmer-board/);
  assert.doesNotMatch(workflow, /origin\/kanmer-board/);
});
