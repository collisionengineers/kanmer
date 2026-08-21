import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DispatchSupervisor } from "./dispatch-supervisor.js";

function fakeChild(pid = 1234) {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; pid: number; kill: () => void };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = pid;
  child.kill = () => undefined;
  return child;
}

let dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function setup(options: Partial<ConstructorParameters<typeof DispatchSupervisor>[0]> = {}) {
  const dir = await mkdtemp(join(tmpdir(), "kanmer-dispatch-"));
  dirs.push(dir);
  const child = fakeChild();
  const supervisor = new DispatchSupervisor({ logDir: dir, defaultTimeoutMs: 1000, maxTimeoutMs: 5000, spawn: () => child, ...options });
  return { supervisor, child, dir };
}

const request = (ticketId = "MCP-020") => ({ projectId: "/project", projectFingerprint: "kanmer-proj-v1:test", sourceRoot: "/source", ticketId, provider: "claude" as const, requestedBy: "test", task: { id: "research-quick", label: "Research", deliverable: "research", prompt: "prompt" } });

describe("DispatchSupervisor", () => {
  it("uses fixed provider args, random ids, project+ticket locks and bounded recent metadata", async () => {
    const { supervisor, child } = await setup();
    const status = await supervisor.start(request());
    expect(status.model).toBe("cli-default");
    expect(status.dispatchId).toMatch(/^MCP-020-[0-9a-f-]{36}$/);
    expect(supervisor.list({ projectId: "/project", includeRecent: false })).toHaveLength(1);
    await expect(supervisor.start(request())).rejects.toThrow(/already has/);
    child.stdout.emit("data", Buffer.from("safe output\n"));
    child.emit("close", 0);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const recent = supervisor.list({ projectId: "/project" });
    expect(recent[0]).toMatchObject({ state: "done", exitCode: 0, requestedBy: "test", ticketId: "MCP-020" });
    expect(recent[0]).not.toHaveProperty("tail");
  });

  it("times out and cancels through the injected tree-kill seam", async () => {
    const killed: number[] = [];
    const { supervisor, child } = await setup({ defaultTimeoutMs: 5, treeKill: (proc) => killed.push(proc.pid ?? -1) });
    await supervisor.start(request("MCP-021"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(killed).toEqual([1234]);
    child.emit("close", null);
    await new Promise((resolve) => setImmediate(resolve));
    expect(supervisor.list()[0]).toMatchObject({ state: "timed-out", reason: "timeout" });
  });

  it("surfaces terminal recording failures", async () => {
    const { supervisor, child } = await setup({ recordTerminal: () => { throw new Error("scratch unavailable"); } });
    await supervisor.start(request("MCP-022"));
    child.emit("close", 1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(supervisor.list()[0]).toMatchObject({ state: "failed", recordingError: "scratch unavailable" });
  });

  it("writes a local bounded log only after validation", async () => {
    const { supervisor, child, dir } = await setup();
    await expect(supervisor.start({ ...request("MCP-023"), timeoutMs: 99999 })).rejects.toThrow(/timeout/);
    await expect((await import("node:fs/promises")).readdir(dir)).resolves.toEqual([]);
    await supervisor.start(request("MCP-023"));
    child.stdout.emit("data", "hello\n");
    child.emit("close", 0);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const files = await (await import("node:fs/promises")).readdir(dir);
    expect(files).toHaveLength(1);
    expect(await readFile(join(dir, files[0]!), "utf8")).toContain("hello");
  });
});
