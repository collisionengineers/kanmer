import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("kanmer gate follows the configured board branch", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pr.yml", import.meta.url), "utf8");
  const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8");
  assert.match(workflow, /types: \[opened, synchronize, reopened, ready_for_review, edited\]/);
  // CORE-139: the rail runs for a pull request that is not merely edited, and
  // for a push to main — never for a workflow_dispatch. The old condition
  // tested `github.ref`, which is `refs/heads/main` on a dispatch too.
  assert.match(
    workflow,
    /verify:\s+name: verify\s+if: >-\s+\(github\.event_name == 'pull_request' && github\.event\.action != 'edited'\)\s+\|\| \(github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'\)/,
  );
  const verifyIf = workflow.match(/verify:\s+name: verify\s+if: >-\n((?:\s{6}\S.*\n)+)/)?.[1];
  assert.ok(verifyIf, "verify job has a folded `if:` block");
  // The negative form is what prevents the regression: no dispatch admission,
  // and no `github.ref == 'refs/heads/main'` that is not qualified by the push event.
  assert.doesNotMatch(verifyIf, /workflow_dispatch/);
  assert.doesNotMatch(verifyIf, /(?<!github\.event_name == 'push' && )github\.ref == 'refs\/heads\/main'/);
  // Superseded runs are cancelled per PR (or per ref for a dispatch); a push to
  // main is never cancelled because its verify result is the post-merge receipt.
  // CORE-138 (closes CORE-139 F-001): an `edited` PR event is carved into its
  // own `meta-`-prefixed group so a body edit never cancels a running
  // verify/kanmer-gate for the same PR.
  assert.match(
    workflow,
    /^concurrency:\s+group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.event_name \}\}-\$\{\{ github\.event\.action == 'edited' && 'meta-' \|\| '' \}\}\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}\s+cancel-in-progress: \$\{\{ github\.event_name != 'push' \}\}/m,
  );
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
  // CORE-138: `kanmer-gate` has no draft skip — it still runs `if:
  // github.event_name == 'pull_request'` with no draft exclusion — and passes
  // `--draft` conditionally so a draft PR gets an advisory rather than a
  // skipped (Pending) required check.
  assert.match(workflow, /kanmer-gate:\s+name: kanmer-gate\s+if: github\.event_name == 'pull_request'/);
  const kanmerGateJob = workflow.match(/kanmer-gate:\s+name: kanmer-gate[\s\S]*?(?=\n  regate:)/)?.[0];
  assert.ok(kanmerGateJob, "kanmer-gate job block found");
  assert.doesNotMatch(kanmerGateJob, /github\.event\.pull_request\.draft\s*==\s*(false|true)\s*\)?\s*$/m);
  assert.doesNotMatch(kanmerGateJob, /if:[^\n]*draft/);
  assert.match(workflow, /KANMER_GATE_STRICT: \$\{\{ vars\.KANMER_GATE_STRICT \|\| '' \}\}/);
  assert.match(
    workflow,
    /node packages\/mcp-server\/src\/check-pr\.mjs --board "\$RUNNER_TEMP\/kanmer-board" --event "\$GITHUB_EVENT_PATH" \$\{\{ github\.event\.pull_request\.draft && '--draft' \|\| '' \}\}/,
  );
  assert.match(workflow, /regate:\s+name: regate\s+if: >-\s+github\.event_name == 'workflow_dispatch' \|\|\s+\(github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'\)/);
  assert.match(workflow, /gh run rerun "\$run_id" --job "\$job_id"/);
  assert.match(workflow, /select\(\.name == "kanmer-gate"\)/);
  // CORE-138 (AT-20/AT-23): an in-progress run is waited on (bounded) then
  // retried once instead of being skipped outright.
  const regateJob = workflow.match(/regate:\s+name: regate[\s\S]*$/)?.[0];
  assert.ok(regateJob, "regate job block found");
  assert.match(regateJob, /timeout 900 gh run watch "\$run_id" --exit-status/);
  assert.doesNotMatch(
    regateJob,
    /^\s*if gh run rerun "\$run_id" --job "\$job_id"; then\s*\n\s*echo "PR #\$number \(\$sha\): re-ran kanmer-gate job \$job_id of run \$run_id"\s*\n\s*else\s*\n\s*# A run still in progress cannot be re-run; it will judge the new tip anyway\.\s*\n\s*echo "PR #\$number \(\$sha\): could not re-run job \$job_id of run \$run_id \(in progress or not permitted\); skipping"\s*\n\s*fi\s*$/m,
  );
  assert.match(workflow, /waiting for it to finish/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /board-regate\.yml/);
  // The operator-installed board-branch workflow only dispatches pr.yml on main,
  // coalesces bursts, and dispatches only when an open PR exists to re-gate.
  const boardRegate = await readFile(new URL("../.github/workflows/board-regate.yml", import.meta.url), "utf8");
  assert.match(boardRegate, /^on:\s+push:\s+branches: \[kanmer-board\]/m);
  assert.match(boardRegate, /^concurrency:\s+group: board-regate-\$\{\{ github\.ref \}\}\s+cancel-in-progress: true/m);
  assert.match(boardRegate, /permissions:\s+actions: write\s+contents: read\s+pull-requests: read/);
  assert.match(
    boardRegate,
    /gh pr list --base main --state open --limit 1 --json number --jq 'length'[\s\S]*not dispatching[\s\S]*gh workflow run pr\.yml --ref main/,
  );
  assert.match(boardRegate, /OPERATOR-INSTALLED/);
  assert.match(boardRegate, /Agents never commit to the board branch/);
  assert.doesNotMatch(boardRegate, /pull_request_target/);
  assert.match(agents, /board-regate\.yml/);
  assert.match(agents, /operator/i);
  assert.match(agents, /### Pull-request merge gate/);
  assert.match(agents, /Kanmer: <ID>/);
  assert.match(agents, /`verify` job deliberately skips edited events/);
  assert.match(agents, /`workflow_dispatch` runs only the `regate` job/);
  assert.match(agents, /only when an open pull request into\s+`main` exists/);
  assert.match(agents, /re-copies it onto\s+the board branch/);
  assert.match(agents, /board worktree separate from the pull-request checkout/);
  assert.match(agents, /packages\/mcp-server\/src\/check-pr\.mjs/);
  assert.match(agents, /scripts\/pr-workflow\.test\.mjs/);
});
