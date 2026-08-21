import { execFile, spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { dispatchProviderById, type DispatchProviderId } from "./dispatch-providers.js";

export type DispatchState = "running" | "done" | "failed" | "cancelled" | "timed-out";

/**
 * Provider ids that may appear in a shared status row.  The GUI also carries
 * the register-only Antigravity target in its provider picker; the supervisor
 * never starts it because DispatchStartRequest remains restricted to the
 * dispatch allowlist above.
 */
export type DispatchStatusProviderId = DispatchProviderId | "antigravity";

export interface DispatchStatus {
  dispatchId: string;
  projectId: string;
  projectFingerprint?: string;
  ticketId: string;
  provider: DispatchStatusProviderId;
  task?: string;
  taskLabel?: string;
  deliverable?: string;
  model?: string;
  promptCustomized?: boolean;
  requestedBy: string;
  state: DispatchState;
  startedAt: number;
  endedAt?: number;
  exitCode?: number | null;
  reason?: string;
  cancelledBy?: string;
  recordingError?: string;
}

export interface DispatchLocalStatus extends DispatchStatus {
  /** GUI-only diagnostics; MCP never returns this view. */
  tail?: string[];
  logPath?: string;
}

export interface DispatchTaskDescriptor {
  id: string;
  label: string;
  deliverable: string;
  prompt: string;
}

export interface DispatchStartRequest {
  projectId: string;
  projectFingerprint?: string;
  sourceRoot: string;
  ticketId: string;
  provider: DispatchProviderId;
  requestedBy: string;
  prompt?: string;
  model?: string;
  promptCustomized?: boolean;
  task?: DispatchTaskDescriptor;
  timeoutMs?: number;
}

export interface DispatchSupervisorOptions {
  logDir: string;
  maxActive?: number;
  defaultTimeoutMs?: number;
  maxTimeoutMs?: number;
  spawn?: (command: string, args: readonly string[], options: SpawnOptions) => ChildProcess;
  treeKill?: (child: ChildProcess) => void;
  now?: () => number;
  statusSink?: (status: DispatchLocalStatus) => void;
  recordTerminal?: (status: DispatchStatus, tail: readonly string[]) => Promise<void> | void;
  env?: NodeJS.ProcessEnv;
};

interface Handle {
  child: ChildProcess;
  status: DispatchStatus;
  tail: string[];
  log: WriteStream;
  timer: NodeJS.Timeout;
  terminal: boolean;
  logPath: string;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const MAX_TAIL_LINES = 50;
const MAX_RECENT = 50;

function defaultTreeKill(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => undefined);
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

/** One injectable process lifecycle shared by GUI and MCP. */
export class DispatchSupervisor {
  private readonly active = new Map<string, Handle>();
  private readonly locks = new Map<string, string>();
  private readonly recent: DispatchStatus[] = [];
  private readonly maxActive: number;
  private readonly defaultTimeoutMs: number;
  private readonly maxTimeoutMs: number;
  private spawnFn: NonNullable<DispatchSupervisorOptions["spawn"]>;
  private readonly killFn: NonNullable<DispatchSupervisorOptions["treeKill"]>;
  private readonly now: () => number;
  private readonly sink: (status: DispatchLocalStatus) => void;
  private readonly recorder: (status: DispatchStatus, tail: readonly string[]) => Promise<void> | void;
  private readonly env: NodeJS.ProcessEnv;

  constructor(private readonly options: DispatchSupervisorOptions) {
    this.maxActive = options.maxActive ?? 1;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxTimeoutMs = options.maxTimeoutMs ?? MAX_TIMEOUT_MS;
    this.spawnFn = options.spawn ?? ((command, args, spawnOptions) => spawn(command, [...args], spawnOptions));
    this.killFn = options.treeKill ?? defaultTreeKill;
    this.now = options.now ?? Date.now;
    this.sink = options.statusSink ?? (() => undefined);
    this.recorder = options.recordTerminal ?? (() => undefined);
    this.env = options.env ?? process.env;
    if (!Number.isInteger(this.maxActive) || this.maxActive < 1) throw new Error("maxActive must be a positive integer");
    if (!Number.isFinite(this.defaultTimeoutMs) || this.defaultTimeoutMs < 1) throw new Error("defaultTimeoutMs must be positive");
    if (!Number.isFinite(this.maxTimeoutMs) || this.maxTimeoutMs < this.defaultTimeoutMs) throw new Error("maxTimeoutMs must be >= defaultTimeoutMs");
  }

  async start(request: DispatchStartRequest): Promise<DispatchStatus> {
    const provider = dispatchProviderById(request.provider);
    if (!provider) throw new Error(`Unknown dispatch provider "${request.provider}".`);
    const lock = `${request.projectId}\0${request.ticketId}`;
    if (this.locks.has(lock)) throw new Error(`${request.ticketId} already has a dispatch in flight for this project.`);
    if (this.active.size >= this.maxActive) throw new Error(`Dispatch concurrency limit reached (${this.maxActive}).`);
    const timeoutMs = request.timeoutMs ?? this.defaultTimeoutMs;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > this.maxTimeoutMs) throw new Error(`timeout must be an integer between 1 and ${this.maxTimeoutMs}ms.`);

    const dispatchId = `${request.ticketId}-${randomUUID()}`;
    const startedAt = this.now();
    const status: DispatchStatus = {
      dispatchId,
      projectId: request.projectId,
      ...(request.projectFingerprint ? { projectFingerprint: request.projectFingerprint } : {}),
      ticketId: request.ticketId,
      provider: request.provider,
      ...(request.task ? { task: request.task.id, taskLabel: request.task.label, deliverable: request.task.deliverable } : {}),
      ...(request.model ? { model: request.model } : {}),
      ...(request.promptCustomized ? { promptCustomized: true } : {}),
      requestedBy: request.requestedBy,
      state: "running",
      startedAt,
    };
    await mkdir(this.options.logDir, { recursive: true });
    const logPath = join(this.options.logDir, `${dispatchId}.log`);
    const log = createWriteStream(logPath, { flags: "a" });
    let child: ChildProcess;
    try {
      child = this.spawnFn(provider.cli, provider.buildDispatchArgs({
        prompt: request.prompt ?? request.task?.prompt ?? "",
        sourceRoot: request.sourceRoot,
        ...(request.model ? { model: request.model } : {}),
      }), {
        cwd: request.sourceRoot,
        env: this.env,
        windowsHide: true,
        detached: process.platform !== "win32",
      });
    } catch (error) {
      log.end();
      await rm(logPath, { force: true }).catch(() => undefined);
      throw new Error(`Couldn't start ${provider.cli}: ${error instanceof Error ? error.message : String(error)}. Is its CLI installed and authenticated?`);
    }
    const tail: string[] = [];
    const timer = setTimeout(() => {
      const handle = this.active.get(dispatchId);
      if (!handle || handle.terminal) return;
      handle.status.state = "timed-out";
      handle.status.reason = "timeout";
      this.emit(handle);
      this.killFn(handle.child);
    }, timeoutMs);
    const handle: Handle = { child, status, tail, log, timer, terminal: false, logPath };
    this.active.set(dispatchId, handle);
    this.locks.set(lock, dispatchId);
    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString();
      log.write(text);
      for (const line of text.split(/\r?\n/)) if (line.trim()) {
        tail.push(line);
        if (tail.length > MAX_TAIL_LINES) tail.shift();
      }
      this.emit(handle);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("error", (error) => {
      if (handle.terminal) return;
      handle.terminal = true;
      clearTimeout(handle.timer);
      onData(`\n[dispatch error] ${error.message}\n`);
      handle.status.state = "failed";
      handle.status.exitCode = null;
      handle.status.reason = "spawn-error";
      this.finish(lock, handle);
    });
    child.once("close", (code) => {
      if (handle.terminal) return;
      handle.terminal = true;
      clearTimeout(handle.timer);
      if (handle.status.state === "running") handle.status.state = code === 0 ? "done" : "failed";
      handle.status.exitCode = code;
      this.finish(lock, handle);
    });
    this.emit(handle);
    return { ...status };
  }

  list(filter: { projectId?: string; ticketId?: string; state?: DispatchState; includeRecent?: boolean } = {}): DispatchStatus[] {
    const active = [...this.active.values()].map((handle) => handle.status);
    const all = filter.includeRecent === false ? active : [...active, ...this.recent];
    return all.filter((status) =>
      (filter.projectId === undefined || status.projectId === filter.projectId) &&
      (filter.ticketId === undefined || status.ticketId === filter.ticketId) &&
      (filter.state === undefined || status.state === filter.state),
    ).map((status) => ({ ...status }));
  }

  listLocal(filter: { projectId?: string; ticketId?: string; state?: DispatchState; includeRecent?: boolean } = {}): DispatchLocalStatus[] {
    const statuses = this.list(filter);
    return statuses.map((status) => {
      const handle = this.active.get(status.dispatchId);
      return { ...status, ...(handle ? { tail: handle.tail.slice(-MAX_TAIL_LINES), logPath: handle.logPath } : {}) };
    });
  }

  setSpawnForTests(spawnFn: DispatchSupervisorOptions["spawn"] | null): void {
    this.spawnFn = spawnFn ?? ((command, args, spawnOptions) => spawn(command, [...args], spawnOptions));
  }

  cancel(dispatchId: string, reason = "cancelled", cancelledBy?: string): DispatchStatus | null {
    const handle = this.active.get(dispatchId);
    if (!handle || handle.terminal) return null;
    handle.status.state = "cancelled";
    handle.status.reason = reason;
    if (cancelledBy) handle.status.cancelledBy = cancelledBy;
    this.emit(handle);
    this.killFn(handle.child);
    return { ...handle.status };
  }

  killAll(): void {
    for (const handle of this.active.values()) {
      if (!handle.terminal) {
        handle.status.state = "cancelled";
        handle.status.reason = "server-shutdown";
        this.killFn(handle.child);
      }
    }
  }

  private emit(handle: Handle): void {
    this.sink({ ...handle.status, tail: handle.tail.slice(-MAX_TAIL_LINES), logPath: handle.logPath });
  }

  private finish(lock: string, handle: Handle): void {
    handle.status.endedAt = this.now();
    this.active.delete(handle.status.dispatchId);
    if (this.locks.get(lock) === handle.status.dispatchId) this.locks.delete(lock);
    handle.log.end();
    this.recent.unshift({ ...handle.status });
    if (this.recent.length > MAX_RECENT) this.recent.length = MAX_RECENT;
    void Promise.resolve().then(() => this.recorder({ ...handle.status }, handle.tail.slice(-MAX_TAIL_LINES))).catch((error: unknown) => {
      handle.status.recordingError = error instanceof Error ? error.message : String(error);
      const recent = this.recent.find((s) => s.dispatchId === handle.status.dispatchId);
      if (recent) recent.recordingError = handle.status.recordingError;
      this.emit(handle);
    });
    this.emit(handle);
  }
}
