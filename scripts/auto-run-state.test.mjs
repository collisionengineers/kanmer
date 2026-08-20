// Disposable real-board proof for SKILL-016's group-document resume contract.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { KanmerStore } from "../packages/core/dist/index.js";

const fingerprint = "sha256:disposable-board";
const run = (id, group, status = "running", first = "queued") => `---
kind: kanmer-auto-run
schema: 1
run_id: ${id}
group: ${group}
project_fingerprint: ${fingerprint}
controller: codex-auto
status: ${status}
---
# Auto run
## Ticket ledger
| Ticket | Disposition | Last action |
| --- | --- | --- |
| SKILL-001 | ${first} | ${first === "finished" ? "moved" : "prepare"} |
## Event log
- created
## Resume instruction
Read live tickets and activity before dispatch.
`;
const pointer = (id, group) => `---
kind: kanmer-auto-current
schema: 1
run_id: ${id}
run_path: automation/runs/${id}.md
group: ${group}
project_fingerprint: ${fingerprint}
controller: codex-auto
status: running
---
# Current auto run
`;

test("durable auto resume uses actual group documents and live board reconciliation", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "kanmer-auto-real-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new KanmerStore(root);
  await store.init();
  const group = await store.createGroup("horizon", "Disposable run");
  const first = await store.createItem({ type: "ticket", title: "first", groups: [group.id], profile: "custom", requires: {} });
  const second = await store.createItem({ type: "ticket", title: "second", groups: [group.id], profile: "custom", requires: {} });
  const runId = "20260821T120000Z-codex-auto";
  const runPath = `automation/runs/${runId}.md`;
  const initial = run(runId, group.id);

  await store.setGroupDoc(group.id, runPath, initial);
  assert.match(await store.getGroupDoc(group.id, runPath), /Ticket ledger/);
  await store.setGroupDoc(group.id, "automation/current.md", pointer(runId, group.id));
  assert.match(await store.getGroupDoc(group.id, "automation/current.md"), new RegExp(`run_path: ${runPath}`));

  // Fresh controller context reads group docs, observes an independent live move,
  // records reconciliation, and does not repeat the mutation.
  await store.moveItem(first.id, "preparing");
  const activity = await store.getActivity({ id: first.id });
  assert.ok(activity.length > 0, "live ticket transition is recorded in board activity");
  assert.equal((await store.getItem(first.id)).status, "preparing");
  await store.setGroupDoc(group.id, runPath, run(runId, group.id, "paused", "finished"));
  assert.match(await store.getGroupDoc(group.id, runPath), /SKILL-001 \| finished \| moved/);
  assert.equal((await store.getActivity({ id: first.id })).length, activity.length, "no replay");

  // Mismatch/foreign-owner decisions are read-only; history survives a later run.
  assert.match(await store.getGroupDoc(group.id, "automation/current.md"), /controller: codex-auto/);
  assert.match(await store.getGroupDoc(group.id, runPath), new RegExp(`run_id: ${runId}`));
  const secondId = "20260821T130000Z-codex-auto";
  await store.setGroupDoc(group.id, `automation/runs/${secondId}.md`, run(secondId, group.id, "completed", "finished"));
  assert.match(await store.getGroupDoc(group.id, runPath), new RegExp(`run_id: ${runId}`));
  assert.match(await store.getGroupDoc(group.id, `automation/runs/${secondId}.md`), new RegExp(`run_id: ${secondId}`));
  assert.equal((await store.getGroup(group.id)).members.length, 2);
  assert.equal(second.groups?.[0], group.id);
});
