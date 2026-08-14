// Dispatch a ticket to a headless agent CLI in the background (request #10).
// spawn (long-running, streamed), not exec: the agent is the worker, driven by
// the shared take-ticket prompt to work the ticket end-to-end via MCP; the
// captured output is diagnostics, summarised once into the ticket's scratch.
import { app } from "electron";
import { exec, type ChildProcess, type SpawnOptions } from "node:child_process";
import crossSpawn from "cross-spawn";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { takeTicketPromptText, type KanmerStore } from "@kanmer/core";
import { providerById, type ProviderId } from "./providers.js";
import type { DispatchStatus } from "../shared/ipc.js";

interface Handle {
  proc: ChildProcess;
  status: DispatchStatus;
  tail: string[];
  timer?: NodeJS.Timeout;
}

/** In-flight dispatches, keyed by their globally unique dispatch id. */
const active = new Map<string, Handle>();
/** Secondary lock: a ticket may run once per project, not once application-wide. */
const activeByProjectTicket = new Map<string, Map<string, string>>();
let emit: (s: DispatchStatus) => void = () => {};

/** Register the renderer status sink (main wires it to a webContents.send). */
export function onDispatchStatus(fn: (s: DispatchStatus) => void): void {
  emit = fn;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
let counter = 0;

type SpawnFn = (command: string, args: readonly string[], options: SpawnOptions) => ChildProcess;
const defaultSpawn: SpawnFn = (command, args, options) => crossSpawn(command, [...args], options);
let spawnFn: SpawnFn = defaultSpawn;

/** Test seam for synchronous and asynchronous agent-launch failures. */
export function __setSpawnForTests(fn: SpawnFn | null): void {
  spawnFn = fn ?? defaultSpawn;
}
export function listDispatches(projectId?: string): DispatchStatus[] {
  return [...active.values()]
    .filter((h) => projectId === undefined || h.status.projectId === projectId)
    .map((h) => ({ ...h.status, tail: h.tail.slice(-50) }));
}

/**
 * Kill a child and its grandchildren. Agent CLIs spawn git/node children; a
 * bare child.kill() orphans them, so on Windows use taskkill /T, elsewhere kill
 * the process group.
 */
function treeKill(proc: ChildProcess): void {
  if (proc.pid === undefined) return;
  if (process.platform === "win32") {
    exec(`taskkill /pid ${proc.pid} /T /F`);
  } else {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {
      proc.kill("SIGTERM");
    }
  }
}

/**
 * Spawn a background agent against a ticket. Guards: the provider must be
 * dispatchable, the ticket must exist and not be taken by someone else, and no
 * dispatch may already be in flight for it. Does NOT create a worktree — the
 * agent's skill owns `git worktree add .worktrees/<id>`.
 */
export async function dispatchTicket(
  store: KanmerStore,
  providerId: ProviderId,
  projectId: string,
  ticketId: string,
  opts: { timeoutMs?: number } = {},
  sourceRoot = store.paths.projectRoot,
): Promise<DispatchStatus> {
  const provider = providerById(providerId);
  if (!provider?.dispatch || !provider.dispatchCli || !provider.dispatchArgs) {
    throw new Error(`"${providerId}" doesn't support background dispatch.`);
  }
  if (activeByProjectTicket.get(projectId)?.has(ticketId)) {
    throw new Error(`${ticketId} already has a dispatch in flight for this project.`);
  }
  const item = await store.getItem(ticketId);
  if (!item) throw new Error(`No ticket "${ticketId}".`);
  if (item.taken_at) {
    throw new Error(
      `${ticketId} is already taken${item.assignee ? ` by ${item.assignee}` : ""} — release it first.`,
    );
  }

  const root = sourceRoot;
  const prompt = takeTicketPromptText(ticketId);
  const args = provider.dispatchArgs(prompt, root);
  const dispatchId = `${ticketId}-${++counter}`;
  const logDir = join(app.getPath("userData"), "dispatch");
  await mkdir(logDir, { recursive: true });
  const logStream = createWriteStream(join(logDir, `${dispatchId}.log`), { flags: "a" });

  let proc: ChildProcess;
  try {
    proc = spawnFn(provider.dispatchCli, args, {
      cwd: root,
      env: process.env,
      windowsHide: true,
      detached: process.platform !== "win32",
    });
  } catch (err) {
    logStream.end();
    throw new Error(
      `Couldn't start ${provider.dispatchCli}: ${err instanceof Error ? err.message : err}. ` +
        `Is its CLI installed and authenticated?`,
    );
  }

  const status: DispatchStatus = {
    dispatchId,
    projectId,
    ticketId,
    provider: providerId,
    state: "running",
    startedAt: Date.now(),
  };
  const tail: string[] = [];
  const handle: Handle = { proc, status, tail };
  active.set(dispatchId, handle);
  const projectDispatches = activeByProjectTicket.get(projectId) ?? new Map<string, string>();
  projectDispatches.set(ticketId, dispatchId);
  activeByProjectTicket.set(projectId, projectDispatches);

  const onData = (buf: Buffer) => {
    const text = buf.toString();
    logStream.write(text);
    for (const line of text.split("\n")) {
      if (line.trim()) {
        tail.push(line);
        if (tail.length > 300) tail.shift();
      }
    }
    emit({ ...status, tail: tail.slice(-50) });
  };
  let terminal = false;
  const removeActive = () => {
    active.delete(dispatchId);
    const projectDispatches = activeByProjectTicket.get(projectId);
    if (!projectDispatches) return;
    projectDispatches.delete(ticketId);
    if (projectDispatches.size === 0) activeByProjectTicket.delete(projectId);
  };
  proc.stdout?.on("data", onData);
  proc.stderr?.on("data", onData);
  proc.once("error", (err) => {
    if (terminal) return;
    terminal = true;
    if (handle.timer) clearTimeout(handle.timer);
    onData(Buffer.from(`\n[dispatch error] ${err.message}\n`));
    status.state = "failed";
    status.exitCode = null;
    removeActive();
    logStream.end();
    emit({ ...status, tail: tail.slice(-50) });
  });

  handle.timer = setTimeout(() => {
    status.state = "timed-out";
    treeKill(proc);
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  proc.on("close", (code) => {
    if (terminal) return;
    terminal = true;
    if (handle.timer) clearTimeout(handle.timer);
    logStream.end();
    if (status.state === "running") status.state = code === 0 ? "done" : "failed";
    status.exitCode = code;
    removeActive();
    const secs = Math.round((Date.now() - status.startedAt) / 1000);
    // One bounded summary to the ticket scratch — never per-chunk churn.
    const summary = [
      `## Dispatch ${dispatchId} — ${providerId}`,
      `- state: ${status.state} (exit ${code}), ${secs}s`,
      "",
      "```",
      ...tail.slice(-50),
      "```",
    ].join("\n");
    void store.appendScratch(ticketId, "dispatch", summary).catch(() => undefined);
    emit({ ...status, tail: tail.slice(-50) });
  });

  emit({ ...status });
  return { ...status };
}

/** Cancel the dispatch identified by its globally unique dispatch id. */
export function cancelDispatch(dispatchId: string): boolean {
  const h = active.get(dispatchId);
  if (!h) return false;
  h.status.state = "cancelled";
  treeKill(h.proc);
  return true;
}

/** Kill every tracked child — called on app quit so no agent is orphaned. */
export function killAllDispatches(): void {
  for (const h of active.values()) {
    if (h.timer) clearTimeout(h.timer);
    treeKill(h.proc);
  }
}
