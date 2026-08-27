import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("kanmer gate follows the configured board branch", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pr.yml", import.meta.url), "utf8");
  const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8");
  assert.match(workflow, /types: \[opened, synchronize, reopened, ready_for_review, edited\]/);
  assert.match(workflow, /verify:\s+name: verify\s+if: github\.event\.action != 'edited'/);
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
  // CORE-123: main pushes get a bound verify result and re-gate open PRs,
  // workflow_dispatch re-gates by hand, and the strict switch reaches check-pr
  // as an env var. A `push: kanmer-board` trigger must NOT be listed here: it
  // can never fire from main's tree (GitHub runs push workflows from the
  // pushed ref), so the board-push hook is the operator-installed file below.
  assert.match(workflow, /^\s+push:\s+(#.*\n\s+)*branches: \[main\]/m);
  assert.doesNotMatch(workflow, /branches: \[[^\]]*kanmer-board[^\]]*\]/);
  assert.match(workflow, /^\s+workflow_dispatch:/m);
  assert.match(workflow, /kanmer-gate:\s+name: kanmer-gate\s+if: github\.event_name == 'pull_request'/);
  assert.match(workflow, /KANMER_GATE_STRICT: \$\{\{ vars\.KANMER_GATE_STRICT \|\| '' \}\}/);
  assert.match(workflow, /regate:\s+name: regate\s+if: >-\s+github\.event_name == 'workflow_dispatch' \|\|\s+\(github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'\)/);
  assert.match(workflow, /gh run rerun "\$run_id" --job "\$job_id"/);
  assert.match(workflow, /select\(\.name == "kanmer-gate"\)/);
  assert.match(workflow, /board-regate\.yml/);
  // The operator-installed board-branch workflow only dispatches pr.yml on main.
  const boardRegate = await readFile(new URL("../.github/workflows/board-regate.yml", import.meta.url), "utf8");
  assert.match(boardRegate, /^on:\s+push:\s+branches: \[kanmer-board\]/m);
  assert.match(boardRegate, /permissions:\s+actions: write\s+contents: read/);
  assert.match(boardRegate, /run: gh workflow run pr\.yml --ref main/);
  assert.match(boardRegate, /OPERATOR-INSTALLED/);
  assert.match(boardRegate, /Agents never commit to the board branch/);
  assert.match(agents, /board-regate\.yml/);
  assert.match(agents, /operator/i);
  assert.match(agents, /### Pull-request merge gate/);
  assert.match(agents, /Kanmer: <ID>/);
  assert.match(agents, /`verify` job deliberately skips edited events/);
  assert.match(agents, /board worktree separate from the pull-request checkout/);
  assert.match(agents, /packages\/mcp-server\/src\/check-pr\.mjs/);
  assert.match(agents, /scripts\/pr-workflow\.test\.mjs/);
});
