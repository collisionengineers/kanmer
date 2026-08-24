import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("kanmer gate follows the configured board branch", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pr.yml", import.meta.url), "utf8");
  assert.match(workflow, /KANMER_BOARD_BRANCH/);
  assert.match(
    workflow,
    /git fetch --no-tags origin "refs\/heads\/\$KANMER_BOARD_BRANCH:refs\/remotes\/origin\/\$KANMER_BOARD_BRANCH"/,
  );
  assert.match(
    workflow,
    /git worktree add "\$RUNNER_TEMP\/kanmer-board" "refs\/remotes\/origin\/\$KANMER_BOARD_BRANCH"/,
  );
  assert.match(workflow, /retains the old custom remote ref/);
  assert.doesNotMatch(workflow, /git fetch origin kanmer-board/);
  assert.doesNotMatch(workflow, /git fetch origin "\$KANMER_BOARD_BRANCH"/);
  assert.doesNotMatch(workflow, /git worktree add "\$RUNNER_TEMP\/kanmer-board" "origin\/\$KANMER_BOARD_BRANCH"/);
  assert.doesNotMatch(workflow, /origin\/kanmer-board/);
});
