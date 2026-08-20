// Disposable-board scenario coverage for the kanmer-auto durable-run contract.
// The orchestration is prose, so this exercises the files it requires an agent
// to create and resume rather than pretending there is a new runtime engine.

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const fingerprint = "sha256:disposable-board";

const runRecord = ({ runId, status = "running", ledger = "queued" }) => `---
kind: auto-run
schema: 1
run_id: ${runId}
group: HZN-016
project_fingerprint: ${fingerprint}
controller: codex-auto
status: ${status}
created_at: 2026-08-21T12:00:00Z
updated_at: 2026-08-21T12:00:00Z
lane_limit: 3
stop_reason:
---
# Auto run — ${runId}
## Selection contract
- Included tickets: SKILL-016, SKILL-017, SKILL-018
## Run invariants
- Existing tools and phase skills only; no automatic merge.
## Ticket ledger
| Ticket | Disposition | Last action |
| --- | --- | --- |
| SKILL-016 | ${ledger} | ${ledger === "finished" ? "report written" : "research"} |
| SKILL-017 | skipped | taken by another controller |
| SKILL-018 | queued | plan |
## Event log
- created
## Resume instruction
Reconcile live state and live gates before dispatch.
`;

const pointer = ({ runId, status = "running", controller = "codex-auto", project = fingerprint }) => `---
kind: auto-current
schema: 1
run_id: ${runId}
run_path: automation/runs/${runId}.md
group: HZN-016
project_fingerprint: ${project}
controller: ${controller}
status: ${status}
updated_at: 2026-08-21T12:00:00Z
---
# Current auto run — HZN-016
## Resume instruction
Read the history record before dispatch.
`;

const metadata = (document, key) => document.match(new RegExp(`^${key}: (.+)$`, "m"))?.[1];

function resumeDecision(current, { controller, project }) {
  const status = metadata(current, "status");
  if (!["running", "paused", "blocked"].includes(status)) return "new-run";
  if (metadata(current, "project_fingerprint") !== project) return "refuse-project";
  if (metadata(current, "controller") !== controller) return "refuse-controller";
  return "resume";
}

test("a disposable three-ticket group run survives interruption and preserves its history", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "kanmer-auto-state-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const automation = join(root, ".kanmer", "groups", "HZN-016", "automation");
  const runs = join(automation, "runs");
  await mkdir(runs, { recursive: true });

  const firstId = "20260821T120000Z-codex-auto";
  const firstPath = join(runs, `${firstId}.md`);
  const currentPath = join(automation, "current.md");

  // The full history is durable before the pointer makes it discoverable.
  await writeFile(firstPath, runRecord({ runId: firstId }), "utf8");
  assert.match(await readFile(firstPath, "utf8"), /^## Ticket ledger$/m);
  await writeFile(currentPath, pointer({ runId: firstId }), "utf8");
  const current = await readFile(currentPath, "utf8");
  assert.equal(resumeDecision(current, { controller: "codex-auto", project: fingerprint }), "resume");

  // A resumed controller sees the finished ledger entry and does not dispatch it again.
  await writeFile(firstPath, runRecord({ runId: firstId, status: "paused", ledger: "finished" }), "utf8");
  const resumed = await readFile(firstPath, "utf8");
  assert.match(resumed, /\| SKILL-016 \| finished \| report written \|/);
  assert.match(resumed, /\| SKILL-017 \| skipped \| taken by another controller \|/);
  assert.match(resumed, /\| SKILL-018 \| queued \| plan \|/);
  assert.doesNotMatch(resumed, /\| SKILL-016 \| queued \|/);

  // Foreign controller/project records refuse before a mutation. A new run has a new file.
  assert.equal(resumeDecision(current, { controller: "other", project: fingerprint }), "refuse-controller");
  assert.equal(resumeDecision(pointer({ runId: firstId, project: "sha256:other" }), { controller: "codex-auto", project: fingerprint }), "refuse-project");
  const secondId = "20260821T130000Z-codex-auto";
  await writeFile(join(runs, `${secondId}.md`), runRecord({ runId: secondId, status: "completed", ledger: "finished" }), "utf8");
  assert.match(await readFile(firstPath, "utf8"), new RegExp(`run_id: ${firstId}`));
  assert.match(await readFile(join(runs, `${secondId}.md`), "utf8"), new RegExp(`run_id: ${secondId}`));
});
