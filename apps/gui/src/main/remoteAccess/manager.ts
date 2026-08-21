import { randomBytes, randomUUID } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "electron";
import { emptyRemoteAccess, readRemoteAccess, writeRemoteAccess, type PersistedRemoteAccess } from "./configStore.js";
import { getSecret, putSecret, removeSecret, type SecretBackend } from "./secrets.js";
import type {
  CloudflareRemoteConfig,
  RemoteDoctorResult,
  RemoteProjectIdentity,
  RemoteProjectView,
  RemoteSecretDelivery,
  RemoteState,
  RemoteStatus,
} from "../../shared/remote.js";

interface SpawnedProcess {
  child: ChildProcess;
  directory: string;
  tokenFile: string;
  ownerFile: string;
  ownerNonce: string;
}

interface DoctorProcess {
  child: ChildProcess;
  directory: string;
  configGeneration: string | null;
  runtimeGeneration: string | null;
}

interface SecretDeliveryRecord {
  token: string;
  expiresAt: number;
  projectId: string;
  fingerprint: string;
  webContentsId: number;
  frameRoutingId: number;
}

interface RemoteRecord {
  projectId: string;
  identity: RemoteProjectIdentity;
  status: RemoteStatus;
  process?: SpawnedProcess;
  doctor?: DoctorProcess;
  startAbort?: AbortController;
  outputBuffer: string;
  configGeneration: string | null;
  runtimeGeneration: string | null;
}

type StatusListener = (status: RemoteStatus) => void;
type SpawnFn = (command: string, args: string[], options: { env: NodeJS.ProcessEnv; cwd: string; stdio: ["ignore", "pipe", "pipe"]; detached?: boolean }) => ChildProcess;
type RemoteConfigPatch = Pick<CloudflareRemoteConfig, "executable" | "tunnelId" | "credentialsFile" | "hostname" | "enabled" | "autoStart"> & { expectedConfigGeneration: string | null };

const MAX_OUTPUT_BUFFER = 64 * 1024;

function killOwnedTree(child: ChildProcess): void {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (child.pid === undefined) { child.kill("SIGKILL"); return; }
  if (process.platform === "win32") {
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => undefined);
  } else {
    try { process.kill(-child.pid, "SIGKILL"); }
    catch { child.kill("SIGKILL"); }
  }
}

function childEnvironment(values: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const inherited: NodeJS.ProcessEnv = {};
  const names = process.platform === "win32"
    ? ["Path", "PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "APPDATA", "LOCALAPPDATA"]
    : ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL"];
  for (const name of names) if (process.env[name] !== undefined) inherited[name] = process.env[name];
  return { ...inherited, ...values };
}

function ownerPath(userData: string, fingerprint: string): string {
  const suffix = fingerprint.replace(/[^a-f0-9]/gi, "").slice(-64);
  return join(userData, "remote-access-owners", `${suffix}.json`);
}

function token(): string {
  return randomBytes(32).toString("base64url");
}

function isHostname(value: string): boolean {
  if (value.length < 1 || value.length > 253 || /[/:?#\s]/.test(value)) return false;
  return /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(value);
}

function statusFor(projectId: string, identity: RemoteProjectIdentity, state: RemoteState, patch: Partial<RemoteStatus> = {}): RemoteStatus {
  const local = state === "ready" || state === "degraded" ? "ready" : state === "starting" ? "starting" : state === "stopping" ? "stopping" : state === "error" || state === "missing" ? "error" : "stopped";
  const tunnel = state === "ready" ? "connected" : state === "degraded" ? "degraded" : state === "starting" || state === "stopping" ? "starting" : state === "error" || state === "missing" ? "failed" : "stopped";
  return {
    projectId,
    fingerprint: identity.fingerprint,
    provider: "cloudflared",
    state,
    action: "idle",
    severity: state === "error" || state === "missing" ? "error" : "info",
    health: {
      board: state === "missing" ? "failed" : "ready",
      listener: state === "ready" || state === "degraded" ? "ready" : "not-run",
      authentication: state === "ready" || state === "degraded" ? "ready" : "not-run",
      sessions: state === "ready" || state === "degraded" ? "ready" : "not-run",
      tunnel: state === "ready" ? "ready" : state === "degraded" ? "stale" : "not-run",
      remote: state === "ready" ? "stale" : "not-run",
    },
    local,
    tunnel,
    public: "not-run",
    endpoint: null,
    authRequired: true,
    tokenId: null,
    generation: null,
    configGeneration: null,
    runtimeGeneration: null,
    lastSummary: null,
    lastRepair: null,
    lastDoctorAt: null,
    diagnostics: [],
    lastError: null,
    updatedAt: new Date().toISOString(),
    ...patch,
  };
}

function message(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]").slice(0, 240);
}

export class RemoteAccessManager {
  private readonly records = new Map<string, RemoteRecord>();
  private readonly listeners = new Set<StatusListener>();
  private readonly deliveries = new Map<string, SecretDeliveryRecord>();
  private readonly queues = new Map<string, Promise<void>>();
  private settingsQueue: Promise<void> = Promise.resolve();
  private registrationQueue: Promise<void> = Promise.resolve();
  private loading: Promise<void> | null = null;
  private data: PersistedRemoteAccess = emptyRemoteAccess();
  private loaded = false;
  private closing = false;
  private activeStarts = 0;
  private readonly startWaiters: Array<() => void> = [];

  public constructor(
    private readonly userData: string,
    private readonly spawnProcess: SpawnFn = (command, args, options) => spawn(command, args, options),
    private readonly backend?: SecretBackend,
  ) {}

  private async load(): Promise<void> {
    if (this.loaded) return;
    if (!this.loading) {
      this.loading = readRemoteAccess(this.userData).then((data) => {
        this.data = data;
        this.loaded = true;
      }).finally(() => { this.loading = null; });
    }
    await this.loading;
  }

  private persist(): Promise<void> {
    const previous = this.settingsQueue;
    const run = previous.catch(() => undefined).then(() => writeRemoteAccess(this.userData, this.data));
    this.settingsQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private enqueue<T>(projectId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(projectId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(work);
    const tail = run.then(() => undefined, () => undefined);
    this.queues.set(projectId, tail);
    return run.finally(() => { if (this.queues.get(projectId) === tail) this.queues.delete(projectId); });
  }

  private serializeRegistration<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.registrationQueue;
    const run = previous.catch(() => undefined).then(work);
    this.registrationQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private record(projectId: string, identity: RemoteProjectIdentity): RemoteRecord {
    const existing = this.records.get(projectId);
    if (existing && existing.identity.fingerprint !== identity.fingerprint) {
      throw new Error("REMOTE_PROJECT_IDENTITY_CHANGED");
    }
    if (existing) return existing;
    const configured = this.data.configs[identity.fingerprint];
    const configGeneration = configured?.secretId ? `config:${identity.fingerprint}` : null;
    const record: RemoteRecord = {
      projectId,
      identity,
      status: statusFor(projectId, identity, configured?.enabled && configured.secretId ? "stopped" : "disabled", { configGeneration }),
      outputBuffer: "",
      configGeneration,
      runtimeGeneration: null,
    };
    this.records.set(projectId, record);
    return record;
  }

  async register(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteProjectView> {
    return this.serializeRegistration(async () => {
      await this.load();
      const record = this.record(projectId, identity);
      if (record.status.state === "missing") record.status = statusFor(projectId, identity, this.data.configs[identity.fingerprint]?.enabled && this.data.configs[identity.fingerprint]?.secretId ? "stopped" : "disabled", { configGeneration: record.configGeneration });
      this.data.projects[identity.fingerprint] = { projectId, identity };
      await this.persist();
      return this.view(record);
    });
  }

  async overview(): Promise<RemoteProjectView[]> {
    await this.load();
    return Object.values(this.data.projects)
      .sort((a, b) => a.identity.fingerprint.localeCompare(b.identity.fingerprint))
      .map(({ projectId, identity }) => {
        const existing = this.records.get(projectId);
        const record = existing ?? this.record(projectId, identity);
        if (!existing) record.status = statusFor(projectId, identity, "missing", { configGeneration: record.configGeneration, lastError: "REMOTE_PROJECT_NOT_OPEN" });
        return this.view(record);
      });
  }

  async reconcile(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteProjectView> {
    await this.load();
    const registered = this.data.projects[identity.fingerprint];
    if (registered && registered.projectId !== projectId) throw new Error("REMOTE_PROJECT_IDENTITY_CONFLICT");
    return this.register(projectId, identity);
  }

  async remove(projectId: string, identity: RemoteProjectIdentity): Promise<void> {
    return this.enqueue(projectId, async () => {
      await this.load();
      const record = this.record(projectId, identity);
      if (record.process || record.doctor) throw new Error("REMOTE_STOP_BEFORE_REMOVE");
      const previousConfig = this.data.configs[identity.fingerprint];
      const previousProject = this.data.projects[identity.fingerprint];
      delete this.data.configs[identity.fingerprint];
      delete this.data.projects[identity.fingerprint];
      try { await this.persist(); }
      catch (error) {
        if (previousConfig) this.data.configs[identity.fingerprint] = previousConfig;
        if (previousProject) this.data.projects[identity.fingerprint] = previousProject;
        throw error;
      }
      this.invalidateDeliveries(projectId);
      if (previousConfig?.secretId) await removeSecret(this.userData, previousConfig.secretId).catch(() => undefined);
      this.records.delete(projectId);
    });
  }

  async viewFor(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteProjectView> {
    await this.load();
    return this.view(this.record(projectId, identity));
  }

  private view(record: RemoteRecord): RemoteProjectView {
    const config = this.data.configs[record.identity.fingerprint];
    const safeConfig = config ? (({ secretId: _secretId, ...safe }) => ({ ...safe, secretConfigured: Boolean(config.secretId) }))(config) : null;
    return {
      projectId: record.projectId,
      identity: record.identity,
      config: safeConfig ?? {
        provider: "cloudflared", executable: "", tunnelId: "", credentialsFile: "", hostname: "", enabled: false, autoStart: false, secretConfigured: false,
      },
      status: record.status,
    };
  }

  async saveConfig(projectId: string, identity: RemoteProjectIdentity, patch: RemoteConfigPatch): Promise<RemoteProjectView> {
    return this.enqueue(projectId, () => this.saveConfigNow(projectId, identity, patch));
  }

  private async saveConfigNow(projectId: string, identity: RemoteProjectIdentity, patch: RemoteConfigPatch): Promise<RemoteProjectView> {
    await this.load();
    const record = this.record(projectId, identity);
    if (patch.expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
    if (!patch.executable.trim() || !patch.tunnelId.trim() || !patch.credentialsFile.trim() || !isHostname(patch.hostname.trim())) throw new Error("REMOTE_CONFIG_INVALID");
    const previous = this.data.configs[identity.fingerprint];
    for (const [fingerprint, other] of Object.entries(this.data.configs)) {
      if (fingerprint !== identity.fingerprint && (other.tunnelId === patch.tunnelId.trim() || other.hostname === patch.hostname.trim())) throw new Error("REMOTE_RESOURCE_DUPLICATE");
    }
    if (record.process && (previous?.hostname !== patch.hostname || previous?.tunnelId !== patch.tunnelId || previous?.credentialsFile !== patch.credentialsFile || previous?.executable !== patch.executable)) throw new Error("REMOTE_STOP_BEFORE_RECONFIGURE");
    const configGeneration = randomUUID();
    this.data.configs[identity.fingerprint] = {
      provider: "cloudflared", executable: patch.executable.trim(), tunnelId: patch.tunnelId.trim(), credentialsFile: patch.credentialsFile.trim(), hostname: patch.hostname.trim(), enabled: patch.enabled,
      autoStart: patch.autoStart,
      secretId: previous?.secretId ?? "",
    };
    record.configGeneration = configGeneration;
    record.status = statusFor(projectId, identity, patch.enabled && previous?.secretId ? "stopped" : "disabled", { configGeneration, public: "stale" });
    await this.persist();
    return this.view(record);
  }

  async createSecret(projectId: string, identity: RemoteProjectIdentity, rotate = false, owner: { webContentsId: number; frameRoutingId: number } = { webContentsId: -1, frameRoutingId: -1 }): Promise<RemoteSecretDelivery> {
    return this.enqueue(projectId, () => this.createSecretNow(projectId, identity, rotate, owner));
  }

  private async createSecretNow(projectId: string, identity: RemoteProjectIdentity, rotate = false, owner: { webContentsId: number; frameRoutingId: number }): Promise<RemoteSecretDelivery> {
    await this.load();
    const record = this.record(projectId, identity);
    if (record.process) throw new Error("REMOTE_STOP_BEFORE_ROTATE");
    const config = this.data.configs[identity.fingerprint];
    if (!config) throw new Error("REMOTE_CONFIG_REQUIRED");
    if (config.secretId && !rotate) throw new Error("REMOTE_SECRET_EXISTS");
    const generated = token();
    const previousSecretId = config.secretId;
    const previousConfig = { ...config };
    const previousGeneration = record.configGeneration;
    const stored = await putSecret(this.userData, generated, this.backend);
    config.secretId = stored.id;
    config.enabled = true;
    record.configGeneration = randomUUID();
    record.status = statusFor(projectId, identity, "stopped", { configGeneration: record.configGeneration, public: "stale" });
    try {
      await this.persist();
    } catch (error) {
      this.data.configs[identity.fingerprint] = previousConfig;
      record.configGeneration = previousGeneration;
      record.status = statusFor(projectId, identity, previousConfig.enabled && previousSecretId ? "stopped" : "disabled", { configGeneration: previousGeneration });
      await removeSecret(this.userData, stored.id).catch(() => undefined);
      throw error;
    }
    this.invalidateDeliveries(projectId);
    if (rotate && previousSecretId) await removeSecret(this.userData, previousSecretId).catch((error) => {
      record.status = { ...record.status, severity: "warning", lastError: "REMOTE_OLD_SECRET_CLEANUP_PENDING", diagnostics: [message(error)] };
    });
    const deliveryId = randomUUID();
    const expiresAt = Date.now() + 60_000;
    this.deliveries.set(deliveryId, { token: generated, expiresAt, projectId, fingerprint: identity.fingerprint, ...owner });
    setTimeout(() => this.deliveries.delete(deliveryId), 60_000).unref();
    return { deliveryId, expiresAt: new Date(expiresAt).toISOString(), token: generated };
  }

  private invalidateDeliveries(projectId: string): void {
    for (const [deliveryId, delivery] of this.deliveries) if (delivery.projectId === projectId) {
      delivery.token = "";
      this.deliveries.delete(deliveryId);
    }
  }

  /** Consume the delivery capability after the initiating renderer has shown/copy-confirmed it. */
  consumeSecretDelivery(projectId: string, deliveryId: string, owner: { webContentsId: number; frameRoutingId: number }): boolean {
    const entry = this.deliveries.get(deliveryId);
    this.deliveries.delete(deliveryId);
    if (!entry || entry.expiresAt <= Date.now() || entry.projectId !== projectId || entry.webContentsId !== owner.webContentsId || entry.frameRoutingId !== owner.frameRoutingId) {
      if (entry) entry.token = "";
      return false;
    }
    entry.token = "";
    return true;
  }

  subscribe(listener: StatusListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  private emit(record: RemoteRecord, state: RemoteState, patch: Partial<RemoteStatus> = {}): void {
    const local = state === "ready" || state === "degraded" ? "ready" : state === "starting" ? "starting" : state === "stopping" ? "stopping" : state === "error" || state === "missing" ? "error" : "stopped";
    const tunnel = state === "ready" ? "connected" : state === "degraded" ? "degraded" : state === "starting" || state === "stopping" ? "starting" : state === "error" || state === "missing" ? "failed" : "stopped";
    const health = state === "ready"
      ? { ...record.status.health, listener: "ready" as const, authentication: "ready" as const, sessions: "ready" as const, tunnel: "ready" as const, remote: record.status.public === "verified" ? "ready" as const : "stale" as const }
      : state === "degraded"
        ? { ...record.status.health, listener: "ready" as const, authentication: "ready" as const, sessions: "ready" as const, tunnel: "stale" as const, remote: "stale" as const }
        : { ...record.status.health, listener: "not-run" as const, authentication: "not-run" as const, sessions: "not-run" as const, tunnel: state === "error" ? "failed" as const : "not-run" as const };
    record.status = { ...record.status, ...patch, state, action: state === "starting" ? "starting" : state === "stopping" ? "stopping" : patch.action ?? "idle", severity: state === "error" || state === "missing" ? "error" : patch.severity ?? "info", health, local, tunnel, updatedAt: new Date().toISOString() };
    for (const listener of this.listeners) listener(record.status);
  }

  async start(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }, expectedConfigGeneration: string | null = null): Promise<RemoteStatus> {
    if (this.closing) throw new Error("REMOTE_MANAGER_CLOSING");
    return this.enqueue(projectId, async () => {
      const release = await this.acquireStartSlot();
      try { return await this.startNow(projectId, identity, paths, expectedConfigGeneration); }
      finally { release(); }
    });
  }

  private async acquireStartSlot(): Promise<() => void> {
    if (this.closing) throw new Error("REMOTE_MANAGER_CLOSING");
    if (this.activeStarts < 2) { this.activeStarts++; return () => this.releaseStartSlot(); }
    await new Promise<void>((resolve) => this.startWaiters.push(resolve));
    if (this.closing) throw new Error("REMOTE_MANAGER_CLOSING");
    this.activeStarts++;
    return () => this.releaseStartSlot();
  }

  private releaseStartSlot(): void {
    this.activeStarts = Math.max(0, this.activeStarts - 1);
    this.startWaiters.shift()?.();
  }

  async autoStart(projects: Array<{ projectId: string; identity: RemoteProjectIdentity; paths: { root: string; repoRoot: string } }>): Promise<Array<{ projectId: string; ok: boolean; error?: string }>> {
    await this.load();
    const ordered = [...projects].sort((a, b) => a.identity.fingerprint.localeCompare(b.identity.fingerprint));
    return Promise.all(ordered.map(async (project) => {
      const config = this.data.configs[project.identity.fingerprint];
      if (!config?.enabled || !config.autoStart || !config.secretId) return { projectId: project.projectId, ok: true };
      try {
        const record = this.record(project.projectId, project.identity);
        await this.start(project.projectId, project.identity, project.paths, record.configGeneration);
        return { projectId: project.projectId, ok: true };
      } catch (error) {
        return { projectId: project.projectId, ok: false, error: message(error) };
      }
    }));
  }

  private async startNow(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }, expectedConfigGeneration: string | null): Promise<RemoteStatus> {
    await this.load();
    const record = this.record(projectId, identity);
    if (this.closing) throw new Error("REMOTE_MANAGER_CLOSING");
    if (expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
    const config = this.data.configs[identity.fingerprint];
    if (!config?.enabled || !config.secretId) throw new Error("REMOTE_CONFIG_AND_SECRET_REQUIRED");
    if (record.process) return record.status;
    const runtimeGeneration = randomUUID();
    const ownerNonce = randomUUID();
    const ownerFile = ownerPath(this.userData, identity.fingerprint);
    try {
      await readFile(ownerFile, "utf8");
      throw new Error("REMOTE_OWNER_EXISTS");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    record.runtimeGeneration = runtimeGeneration;
    record.startAbort = new AbortController();
    record.outputBuffer = "";
    this.emit(record, "starting", { lastError: null, diagnostics: [], runtimeGeneration });
    let directory = "";
    let tokenFile = "";
    let child: ChildProcess;
    try {
      const secret = await getSecret(this.userData, config.secretId, this.backend);
      directory = join(tmpdir(), "kanmer-remote", randomUUID());
      await mkdir(directory, { recursive: true, mode: 0o700 });
      tokenFile = join(directory, "token");
      await writeFile(tokenFile, `${secret}\n`, { encoding: "ascii", mode: 0o600 });
      const entry = remoteCliEntry();
      child = this.spawnProcess(process.execPath, [entry], {
        cwd: paths.root,
        detached: process.platform !== "win32",
        env: childEnvironment({
          ...(app.isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
          KANMER_ROOT: paths.root,
          KANMER_REPO_ROOT: paths.repoRoot,
          KANMER_TUNNEL_PROVIDER: "cloudflared",
          KANMER_HTTP_TOKEN_FILE: tokenFile,
          KANMER_TUNNEL_HOSTNAME: config.hostname,
          KANMER_CLOUDFLARED_EXECUTABLE: config.executable,
          KANMER_CLOUDFLARED_TUNNEL_ID: config.tunnelId,
          KANMER_CLOUDFLARED_CREDENTIALS_FILE: config.credentialsFile,
          KANMER_REMOTE_OWNER_FILE: ownerFile,
          KANMER_REMOTE_OWNER_NONCE: ownerNonce,
        }),
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      if (directory) await rm(directory, { recursive: true, force: true });
      record.runtimeGeneration = null;
      this.emit(record, "error", { runtimeGeneration: null, lastError: message(error), diagnostics: [] });
      throw error;
    }
    record.process = { child, directory, tokenFile, ownerFile, ownerNonce };
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => this.readLine(record, chunk, runtimeGeneration));
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", () => { /* diagnostics never include child output or secret material */ });
    child.once("error", (error) => this.processFailed(record, error, runtimeGeneration));
    child.once("exit", (code) => { if (record.process && record.runtimeGeneration === runtimeGeneration) this.processFailed(record, new Error(`REMOTE_PROCESS_EXIT_${code ?? "unknown"}`), runtimeGeneration); });
    return await new Promise<RemoteStatus>((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        void this.stop(projectId, identity).catch((cleanupError) => {
          this.emit(record, "error", { diagnostics: [`REMOTE_TIMEOUT_CLEANUP_FAILED:${message(cleanupError)}`] });
        });
        reject(new Error("REMOTE_START_TIMEOUT"));
      }, 120_000);
      const cancel = () => {
        clearTimeout(timer);
        unsubscribe();
        reject(new Error("REMOTE_START_CANCELLED"));
      };
      record.startAbort?.signal.addEventListener("abort", cancel, { once: true });
      const unsubscribe = this.subscribe((status) => {
        if (status.projectId !== projectId) return;
        if (status.state === "ready") { clearTimeout(timer); unsubscribe(); record.startAbort?.signal.removeEventListener("abort", cancel); record.startAbort = undefined; resolve(status); }
        if (status.state === "error") { clearTimeout(timer); unsubscribe(); record.startAbort?.signal.removeEventListener("abort", cancel); record.startAbort = undefined; reject(new Error(status.lastError ?? "REMOTE_START_FAILED")); }
      });
    });
  }

  private readLine(record: RemoteRecord, chunk: string, runtimeGeneration: string): void {
    if (record.runtimeGeneration !== runtimeGeneration) return;
    record.outputBuffer += chunk;
    if (record.outputBuffer.length > MAX_OUTPUT_BUFFER) record.outputBuffer = record.outputBuffer.slice(-MAX_OUTPUT_BUFFER);
    const parts = record.outputBuffer.split(/\r?\n/);
    record.outputBuffer = parts.pop() ?? "";
    const lines = parts.filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as { kind?: string; endpoint?: string; tokenId?: string; fingerprint?: string; projectFingerprint?: string; status?: { state?: string; local?: string; provider?: string; endpoint?: string; reason?: string; attempt?: number } };
        if (event.kind === "kanmer-mcp-remote-ready" && event.endpoint && event.projectFingerprint === record.identity.fingerprint) {
          this.emit(record, "ready", { endpoint: event.endpoint, tokenId: event.tokenId ?? null, generation: event.tokenId ?? null, runtimeGeneration: record.runtimeGeneration, public: "stale" });
        } else if (event.kind === "kanmer-mcp-remote-status" && event.status) {
          const state = event.status.provider === "degraded" ? "degraded" : event.status.provider === "failed" ? "error" : event.status.provider === "running" ? "ready" : event.status.local === "starting" ? "starting" : record.status.state;
          this.emit(record, state, { endpoint: event.status.endpoint ?? record.status.endpoint, diagnostics: event.status.reason ? [event.status.reason] : [] });
        }
      } catch { /* only protocol JSON is consumed; raw child output is intentionally discarded */ }
    }
  }

  private async removeOwnedOwner(processRecord: SpawnedProcess): Promise<void> {
    try {
      const current = JSON.parse(await readFile(processRecord.ownerFile, "utf8")) as { nonce?: string };
      if (current.nonce === processRecord.ownerNonce) await rm(processRecord.ownerFile, { force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private processFailed(record: RemoteRecord, error: unknown, runtimeGeneration: string): void {
    if (record.runtimeGeneration !== runtimeGeneration) return;
    if (!record.process) return;
    const processRecord = record.process;
    record.process = undefined;
    record.startAbort = undefined;
    record.outputBuffer = "";
    void Promise.all([
      rm(processRecord.directory, { recursive: true, force: true }),
      this.removeOwnedOwner(processRecord),
    ]).catch((cleanupError) => {
      this.emit(record, "error", { diagnostics: [`REMOTE_TEMP_CLEANUP_FAILED:${message(cleanupError)}`] });
    });
    record.runtimeGeneration = null;
    this.emit(record, "error", { endpoint: null, lastError: message(error), diagnostics: [], runtimeGeneration: null });
  }

  async stop(projectId: string, identity: RemoteProjectIdentity, expectedRuntimeGeneration: string | null = null): Promise<RemoteStatus> {
    return this.enqueue(projectId, () => this.stopNow(projectId, identity, expectedRuntimeGeneration));
  }

  private async stopProcess(record: RemoteRecord, deadline = Date.now() + 5_000): Promise<void> {
    const processRecord = record.process;
    if (!processRecord) return;
    this.emit(record, "stopping", { action: "stopping" });
    record.process = undefined;
    record.runtimeGeneration = null;
    record.startAbort?.abort();
    record.startAbort = undefined;
    processRecord.child.kill("SIGTERM");
    const exited = await new Promise<boolean>((resolve) => {
      if (processRecord.child.exitCode !== null || processRecord.child.signalCode !== null) { resolve(true); return; }
      const remaining = Math.max(0, deadline - Date.now());
      const timer = setTimeout(() => resolve(false), remaining);
      processRecord.child.once("exit", () => { clearTimeout(timer); resolve(true); });
    });
    if (!exited) {
      killOwnedTree(processRecord.child);
      await new Promise<void>((resolve) => {
        if (processRecord.child.exitCode !== null || processRecord.child.signalCode !== null) { resolve(); return; }
        processRecord.child.once("exit", () => resolve());
        setTimeout(resolve, 500);
      });
    }
    await Promise.all([
      rm(processRecord.directory, { recursive: true, force: true }),
      this.removeOwnedOwner(processRecord),
    ]);
    record.outputBuffer = "";
    this.emit(record, this.data.configs[record.identity.fingerprint]?.enabled ? "stopped" : "disabled", { action: "idle", endpoint: null, tokenId: null, generation: null, runtimeGeneration: null, public: "stale" });
  }

  private async stopNow(projectId: string, identity: RemoteProjectIdentity, expectedRuntimeGeneration: string | null): Promise<RemoteStatus> {
    await this.load();
    const record = this.record(projectId, identity);
    if (expectedRuntimeGeneration !== null && expectedRuntimeGeneration !== record.runtimeGeneration) throw new Error("REMOTE_RUNTIME_VERSION_CONFLICT");
    if (!record.process) { record.runtimeGeneration = null; this.emit(record, this.data.configs[identity.fingerprint]?.enabled ? "stopped" : "disabled", { action: "idle", runtimeGeneration: null }); return record.status; }
    await this.stopProcess(record);
    return record.status;
  }

  async doctor(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }, expectedConfigGeneration: string | null = null, expectedRuntimeGeneration: string | null = null): Promise<RemoteDoctorResult> {
    return this.enqueue(projectId, () => this.doctorNow(projectId, identity, paths, expectedConfigGeneration, expectedRuntimeGeneration));
  }

  private async doctorNow(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }, expectedConfigGeneration: string | null, expectedRuntimeGeneration: string | null): Promise<RemoteDoctorResult> {
    await this.load();
    const record = this.record(projectId, identity);
    if (expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
    if (expectedRuntimeGeneration !== null && expectedRuntimeGeneration !== record.runtimeGeneration) throw new Error("REMOTE_RUNTIME_VERSION_CONFLICT");
    const config = this.data.configs[identity.fingerprint];
    if (!config?.secretId) throw new Error("REMOTE_CONFIG_AND_SECRET_REQUIRED");
    this.emit(record, record.status.state, { action: "diagnosing", lastError: null });
    const secret = await getSecret(this.userData, config.secretId, this.backend);
    const directory = join(tmpdir(), "kanmer-remote-doctor", randomUUID());
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, `${secret}\n`, { encoding: "ascii", mode: 0o600 });
    const mode = record.process && (record.status.state === "ready" || record.status.state === "degraded") ? "public" : "config";
    const child = this.spawnProcess(process.execPath, [doctorCliEntry(), mode, "--json"], {
      cwd: paths.root,
      detached: process.platform !== "win32",
      env: childEnvironment({
        ...(app.isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
        KANMER_ROOT: paths.root,
        KANMER_REPO_ROOT: paths.repoRoot,
        KANMER_EXPECTED_PROJECT: identity.fingerprint,
        KANMER_REMOTE_HOSTNAME: config.hostname,
        KANMER_TOKEN_FILE: tokenFile,
        KANMER_LOCAL_ENDPOINT: record.status.endpoint ?? "",
        CLOUDFLARED_PATH: config.executable,
        CLOUDFLARED_TUNNEL_ID: config.tunnelId,
        CLOUDFLARED_CREDENTIALS_FILE: config.credentialsFile,
      }), stdio: ["ignore", "pipe", "pipe"],
    });
    record.doctor = { child, directory, configGeneration: record.configGeneration, runtimeGeneration: record.runtimeGeneration };
    return await new Promise<RemoteDoctorResult>((resolve, reject) => {
      let output = "";
      let settled = false;
      const finish = (result: RemoteDoctorResult | Error) => {
        if (settled) return;
        settled = true;
        if (record.doctor?.child === child) record.doctor = undefined;
        if (result instanceof Error) reject(result); else resolve(result);
      };
      const timeout = setTimeout(() => { killOwnedTree(child); void rm(directory, { recursive: true, force: true }); finish(new Error("REMOTE_DOCTOR_TIMEOUT")); }, 120_000);
      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => { if (output.length < MAX_OUTPUT_BUFFER) output += chunk.slice(0, MAX_OUTPUT_BUFFER - output.length); });
      child.stderr?.on("data", () => undefined);
      child.once("error", (error) => { clearTimeout(timeout); void rm(directory, { recursive: true, force: true }); finish(error); });
      child.once("exit", async (code) => {
        clearTimeout(timeout);
        await rm(directory, { recursive: true, force: true });
        try {
          const report = JSON.parse(output.trim()) as { status?: string; checks?: Array<{ id?: string; status?: string; details?: { reason?: string } }> };
          const status = report.status === "pass" || report.status === "warn" || report.status === "fail" ? report.status : "fail";
          const checks: RemoteDoctorResult["checks"] = (report.checks ?? []).map((check) => ({
            id: check.id ?? "unknown",
            status: (check.status === "pass" || check.status === "warn" || check.status === "fail" || check.status === "skipped" ? check.status : "fail") as RemoteDoctorResult["checks"][number]["status"],
            detail: check.details?.reason ?? "no detail",
          }));
          const reportResult: RemoteDoctorResult = {
            projectId,
            fingerprint: identity.fingerprint,
            ok: code === 0 && status !== "fail",
            summary: status,
            checks,
            severity: status === "fail" ? "error" : status === "warn" ? "warning" : "info",
            repair: checks.find((check) => check.status === "fail" || check.status === "warn")?.detail ?? null,
            mode,
            configGeneration: record.configGeneration,
            runtimeGeneration: record.runtimeGeneration,
          };
          const current = record.configGeneration === reportResult.configGeneration && record.runtimeGeneration === reportResult.runtimeGeneration;
          const summary = reportResult.summary === "pass" ? "Doctor passed" : reportResult.summary === "warn" ? "Doctor found warnings" : "Doctor failed";
          if (current) this.emit(record, record.status.state, { action: "idle", severity: reportResult.severity, lastSummary: summary, lastRepair: reportResult.repair, lastDoctorAt: new Date().toISOString(), public: reportResult.ok && mode === "public" ? "verified" : mode === "public" ? "stale" : record.status.public });
          finish(reportResult);
        } catch { finish(new Error(code === 0 ? "REMOTE_DOCTOR_INVALID_OUTPUT" : `REMOTE_DOCTOR_EXIT_${code ?? "unknown"}`)); }
      });
    });
  }

  async closeAll(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    while (this.startWaiters.length) this.startWaiters.shift()?.();
    this.deliveries.clear();
    const records = [...this.records.values()];
    for (const record of records) {
      record.outputBuffer = "";
      record.startAbort?.abort();
      if (record.doctor) record.doctor.child.kill("SIGTERM");
    }
    const deadline = Date.now() + 8_000;
    await Promise.all(records.map(async (record) => {
      if (record.doctor) {
        killOwnedTree(record.doctor.child);
        await rm(record.doctor.directory, { recursive: true, force: true }).catch(() => undefined);
        record.doctor = undefined;
      }
      await this.stopProcess(record, deadline).catch(() => undefined);
    }));
    for (const record of records) {
      if (record.process) {
        killOwnedTree(record.process.child);
        await rm(record.process.directory, { recursive: true, force: true }).catch(() => undefined);
        await this.removeOwnedOwner(record.process).catch(() => undefined);
        record.process = undefined;
      }
      record.outputBuffer = "";
    }
  }
}

function remoteCliEntry(): string {
  const override = process.env.KANMER_REMOTE_CLI;
  if (override) return override;
  if (app.isPackaged) return join(process.resourcesPath, "mcp", "remote-cli.cjs");
  return join(app.getAppPath(), "..", "..", "packages", "mcp-server", "dist", "remote-cli.js");
}

function doctorCliEntry(): string {
  const override = process.env.KANMER_DOCTOR_CLI;
  if (override) return override;
  if (app.isPackaged) return join(process.resourcesPath, "mcp", "doctor-cli.cjs");
  return join(app.getAppPath(), "..", "..", "packages", "mcp-server", "dist", "doctor-cli.js");
}
