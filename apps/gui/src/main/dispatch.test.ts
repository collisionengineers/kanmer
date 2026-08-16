import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item, KanmerStore } from "@kanmer/core";

vi.mock("electron", () => ({ app: { getPath: () => join(tmpdir(), "kanmer-dispatch-test") } }));

const { __setSpawnForTests, dispatchTicket, killAllDispatches, listDispatches } =
  await import("./dispatch.js");

function child(pid: number) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    pid: number;
    kill: () => void;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.pid = pid;
  proc.kill = () => {};
  return proc;
}

function store(root: string): KanmerStore {
  return {
    paths: { projectRoot: root },
    getItem: async (id: string) => ({ id, title: id } as Item),
    appendScratch: async () => ({ version: "1" }),
  } as unknown as KanmerStore;
}

afterEach(() => {
  __setSpawnForTests(null);
  killAllDispatches();
});

describe("project-scoped dispatches", () => {
  it("allows matching ticket ids in separate projects and lists only the requested project", async () => {
    const first = child(101);
    const second = child(102);
    let next = 0;
    __setSpawnForTests(() => [first, second][next++] as never);

    const one = await dispatchTicket(store("/one"), "claude", "/one", "TICK-1", {}, "/one");
    const two = await dispatchTicket(store("/two"), "claude", "/two", "TICK-1", {}, "/two");

    expect(one.projectId).toBe("/one");
    expect(two.projectId).toBe("/two");
    expect(listDispatches("/one").map((d) => d.dispatchId)).toEqual([one.dispatchId]);
    expect(listDispatches("/two").map((d) => d.dispatchId)).toEqual([two.dispatchId]);

    first.emit("close", 0);
    second.emit("close", 0);
  });

  it("still locks a ticket within its own project", async () => {
    const proc = child(103);
    __setSpawnForTests(() => proc as never);
    const project = store("/one");
    await dispatchTicket(project, "claude", "/one", "TICK-1", {}, "/one");
    await expect(dispatchTicket(project, "claude", "/one", "TICK-1", {}, "/one")).rejects.toThrow(/in flight/);
    proc.emit("close", 0);
  });
});
