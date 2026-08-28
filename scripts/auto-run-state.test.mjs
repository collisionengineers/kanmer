// Disposable real-board proof for SKILL-016's group-document resume contract.
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { KanmerStore, removeTreeWithRetry } from "../packages/core/dist/index.js";

const fingerprint = "sha256:disposable-board";
const run = (id, group, status = "running", first = "queued", project = fingerprint, controller = "codex-auto") => `---
kind: kanmer-auto-run
schema: 1
run_id: ${id}
group: ${group}
project_fingerprint: ${project}
controller: ${controller}
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
const pointer = (id, group, project = fingerprint, controller = "codex-auto") => `---
kind: kanmer-auto-current
schema: 1
run_id: ${id}
run_path: automation/runs/${id}.md
group: ${group}
project_fingerprint: ${project}
controller: ${controller}
status: running
---
# Current auto run
`;

const field = (document, name) => document.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];
async function resumeDecision(store, group, controller, project) {
  const current = await store.getGroupDoc(group, "automation/current.md");
  const path = field(current, "run_path");
  const record = await store.getGroupDoc(group, path);
  if (field(current, "project_fingerprint") !== project || field(record, "project_fingerprint") !== project) return "refuse-project";
  if (field(current, "status") === "running" && field(current, "controller") !== controller) return "refuse-controller";
  return "resume";
}

test("durable auto resume uses actual group documents and live board reconciliation", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "kanmer-auto-real-"));
  t.after(() => removeTreeWithRetry(root));
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
  await store.moveItem(first.id, { status: "preparing" });
  const activity = await store.getActivity({ id: first.id });
  assert.ok(activity.length > 0, "live ticket transition is recorded in board activity");
  assert.equal((await store.getItem(first.id)).status, "preparing");
  await store.setGroupDoc(group.id, runPath, run(runId, group.id, "paused", "finished"));
  assert.match(await store.getGroupDoc(group.id, runPath), /SKILL-001 \| finished \| moved/);
  assert.equal((await store.getActivity({ id: first.id })).length, activity.length, "no replay");

  // Wrong-project and foreign-running-controller records are read from actual
  // stored group docs and refuse without changing pointer/history/tickets/activity.
  const snapshot = async () => JSON.stringify({
    current: await store.getGroupDoc(group.id, "automation/current.md"),
    run: await store.getGroupDoc(group.id, runPath),
    first: await store.getItem(first.id),
    activity: await store.getActivity({ id: first.id }),
  });
  const wrongId = "20260821T121000Z-other";
  const wrongPath = `automation/runs/${wrongId}.md`;
  await store.setGroupDoc(group.id, wrongPath, run(wrongId, group.id, "running", "queued", "sha256:other"));
  await store.setGroupDoc(group.id, "automation/current.md", pointer(wrongId, group.id, "sha256:other"));
  const beforeWrong = await snapshot();
  assert.equal(await resumeDecision(store, group.id, "codex-auto", fingerprint), "refuse-project");
  assert.equal(await snapshot(), beforeWrong, "wrong project refuses before mutation");

  await store.setGroupDoc(group.id, "automation/current.md", pointer(runId, group.id, fingerprint, "other-controller"));
  const beforeForeign = await snapshot();
  assert.equal(await resumeDecision(store, group.id, "codex-auto", fingerprint), "refuse-controller");
  assert.equal(await snapshot(), beforeForeign, "foreign running controller refuses before mutation");

  await store.setGroupDoc(group.id, "automation/current.md", pointer(runId, group.id));
  assert.equal(await resumeDecision(store, group.id, "codex-auto", fingerprint), "resume");
  assert.match(await store.getGroupDoc(group.id, runPath), new RegExp(`run_id: ${runId}`));
  const secondId = "20260821T130000Z-codex-auto";
  await store.setGroupDoc(group.id, `automation/runs/${secondId}.md`, run(secondId, group.id, "completed", "finished"));
  assert.match(await store.getGroupDoc(group.id, runPath), new RegExp(`run_id: ${runId}`));
  assert.match(await store.getGroupDoc(group.id, `automation/runs/${secondId}.md`), new RegExp(`run_id: ${secondId}`));
  assert.equal((await store.getGroup(group.id)).members.length, 2);
  assert.equal(second.groups?.[0], group.id);
});
