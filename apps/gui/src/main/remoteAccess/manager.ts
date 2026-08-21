import { randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
  tokenFile: string;
}

interface RemoteRecord {
  projectId: string;
  identity: RemoteProjectIdentity;
  status: RemoteStatus;
  process?: SpawnedProcess;
  outputBuffer: string;
  configGeneration: string | null;
  runtimeGeneration: string | null;
}

type StatusListener = (status: RemoteStatus) => void;
type SpawnFn = (command: string, args: string[], options: { env: NodeJS.ProcessEnv; cwd: string; stdio: ["ignore", "pipe", "pipe"] }) => ChildProcess;

function token(): string {
  return randomBytes(32).toString("base64url");
}

function isHostname(value: string): boolean {
  if (value.length < 1 || value.length > 253 || /[/:?#\s]/.test(value)) return false;
  return /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(value);
}

function statusFor(projectId: string, identity: RemoteProjectIdentity, state: RemoteState, patch: Partial<RemoteStatus> = {}): RemoteStatus {
  const local = state === "ready" || state === "degraded" ? "ready" : state === "starting" ? "starting" : state === "stopping" ? "stopping" : state === "error" ? "error" : "stopped";
  const tunnel = state === "ready" ? "connected" : state === "degraded" ? "degraded" : state === "starting" || state === "stopping" ? "starting" : state === "error" ? "failed" : "stopped";
  return {
    projectId,
    fingerprint: identity.fingerprint,
    provider: "cloudflared",
    state,
    local,
    tunnel,
    public: "not-run",
    endpoint: null,
    authRequired: true,
    tokenId: null,
    generation: null,
    configGeneration: null,
    runtimeGeneration: null,
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
  private readonly deliveries = new Map<string, { token: string; expiresAt: number }>();
  private readonly queues = new Map<string, Promise<void>>();
  private settingsQueue: Promise<void> = Promise.resolve();
  private registrationQueue: Promise<void> = Promise.resolve();
  private loading: Promise<void> | null = null;
  private data: PersistedRemoteAccess = emptyRemoteAccess();
  private loaded = false;

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
    const record: RemoteRecord = {
      projectId,
      identity,
      status: statusFor(projectId, identity, configured?.enabled && configured.secretId ? "stopped" : "disabled"),
      outputBuffer: "",
      configGeneration: configured?.secretId ? `config:${identity.fingerprint}` : null,
      runtimeGeneration: null,
    };
    this.records.set(projectId, record);
    return record;
  }

  async register(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteProjectView> {
    return this.serializeRegistration(async () => {
      await this.load();
      const record = this.record(projectId, identity);
      this.data.projects[identity.fingerprint] = { projectId, identity };
      await this.persist();
      return this.view(record);
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
        provider: "cloudflared", executable: "", tunnelId: "", credentialsFile: "", hostname: "", enabled: false, secretConfigured: false,
      },
      status: record.status,
    };
  }

  async saveConfig(projectId: string, identity: RemoteProjectIdentity, patch: Omit<CloudflareRemoteConfig, "provider" | "secretId" | "enabled"> & { enabled: boolean }): Promise<RemoteProjectView> {
    return this.enqueue(projectId, () => this.saveConfigNow(projectId, identity, patch));
  }

  private async saveConfigNow(projectId: string, identity: RemoteProjectIdentity, patch: Omit<CloudflareRemoteConfig, "provider" | "secretId" | "enabled"> & { enabled: boolean }): Promise<RemoteProjectView> {
    await this.load();
    const record = this.record(projectId, identity);
    if (!patch.executable.trim() || !patch.tunnelId.trim() || !patch.credentialsFile.trim() || !isHostname(patch.hostname.trim())) throw new Error("REMOTE_CONFIG_INVALID");
    const previous = this.data.configs[identity.fingerprint];
    for (const [fingerprint, other] of Object.entries(this.data.configs)) {
      if (fingerprint !== identity.fingerprint && (other.tunnelId === patch.tunnelId.trim() || other.hostname === patch.hostname.trim())) throw new Error("REMOTE_RESOURCE_DUPLICATE");
    }
    if (record.process && (previous?.hostname !== patch.hostname || previous?.tunnelId !== patch.tunnelId || previous?.credentialsFile !== patch.credentialsFile || previous?.executable !== patch.executable)) throw new Error("REMOTE_STOP_BEFORE_RECONFIGURE");
    const configGeneration = randomUUID();
    this.data.configs[identity.fingerprint] = {
      provider: "cloudflared", executable: patch.executable.trim(), tunnelId: patch.tunnelId.trim(), credentialsFile: patch.credentialsFile.trim(), hostname: patch.hostname.trim(), enabled: patch.enabled,
      secretId: previous?.secretId ?? "",
    };
    record.configGeneration = configGeneration;
    record.status = statusFor(projectId, identity, patch.enabled && previous?.secretId ? "stopped" : "disabled", { configGeneration });
    await this.persist();
    return this.view(record);
  }

  async createSecret(projectId: string, identity: RemoteProjectIdentity, rotate = false): Promise<RemoteSecretDelivery> {
    return this.enqueue(projectId, () => this.createSecretNow(projectId, identity, rotate));
  }

  private async createSecretNow(projectId: string, identity: RemoteProjectIdentity, rotate = false): Promise<RemoteSecretDelivery> {
    await this.load();
    const record = this.record(projectId, identity);
    if (record.process) throw new Error("REMOTE_STOP_BEFORE_ROTATE");
    const config = this.data.configs[identity.fingerprint];
    if (!config) throw new Error("REMOTE_CONFIG_REQUIRED");
    if (config.secretId && !rotate) throw new Error("REMOTE_SECRET_EXISTS");
    const generated = token();
    const stored = await putSecret(this.userData, generated, this.backend);
    if (rotate && config.secretId) await removeSecret(this.userData, config.secretId);
    config.secretId = stored.id;
    config.enabled = true;
    record.configGeneration = randomUUID();
    record.status = statusFor(projectId, identity, "stopped", { configGeneration: record.configGeneration });
    await this.persist();
    const deliveryId = randomUUID();
    const expiresAt = Date.now() + 60_000;
    this.deliveries.set(deliveryId, { token: generated, expiresAt });
    setTimeout(() => this.deliveries.delete(deliveryId), 60_000).unref();
    return { deliveryId, expiresAt: new Date(expiresAt).toISOString(), token: generated };
  }

  /** Consume the delivery capability after the renderer has shown/copy-confirmed it. */
  consumeSecretDelivery(deliveryId: string): boolean {
    const entry = this.deliveries.get(deliveryId);
    this.deliveries.delete(deliveryId);
    return Boolean(entry && entry.expiresAt > Date.now());
  }

  subscribe(listener: StatusListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  private emit(record: RemoteRecord, state: RemoteState, patch: Partial<RemoteStatus> = {}): void {
    const local = state === "ready" || state === "degraded" ? "ready" : state === "starting" ? "starting" : state === "stopping" ? "stopping" : state === "error" ? "error" : "stopped";
    const tunnel = state === "ready" ? "connected" : state === "degraded" ? "degraded" : state === "starting" || state === "stopping" ? "starting" : state === "error" ? "failed" : "stopped";
    record.status = { ...record.status, ...patch, state, local, tunnel, updatedAt: new Date().toISOString() };
    for (const listener of this.listeners) listener(record.status);
  }

  async start(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }): Promise<RemoteStatus> {
    return this.enqueue(projectId, () => this.startNow(projectId, identity, paths));
  }

  private async startNow(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }): Promise<RemoteStatus> {
    await this.load();
    const record = this.record(projectId, identity);
    const config = this.data.configs[identity.fingerprint];
    if (!config?.enabled || !config.secretId) throw new Error("REMOTE_CONFIG_AND_SECRET_REQUIRED");
    if (record.process) return record.status;
    const runtimeGeneration = randomUUID();
    record.runtimeGeneration = runtimeGeneration;
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
        env: {
          ...process.env,
          ...(app.isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
          KANMER_ROOT: paths.root,
          KANMER_REPO_ROOT: paths.repoRoot,
          KANMER_TUNNEL_PROVIDER: "cloudflared",
          KANMER_HTTP_TOKEN_FILE: tokenFile,
          KANMER_TUNNEL_HOSTNAME: config.hostname,
          KANMER_CLOUDFLARED_EXECUTABLE: config.executable,
          KANMER_CLOUDFLARED_TUNNEL_ID: config.tunnelId,
          KANMER_CLOUDFLARED_CREDENTIALS_FILE: config.credentialsFile,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      if (directory) await rm(directory, { recursive: true, force: true });
      record.runtimeGeneration = null;
      this.emit(record, "error", { runtimeGeneration: null, lastError: message(error), diagnostics: [] });
      throw error;
    }
    record.process = { child, tokenFile };
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
      const unsubscribe = this.subscribe((status) => {
        if (status.projectId !== projectId) return;
        if (status.state === "ready") { clearTimeout(timer); unsubscribe(); resolve(status); }
        if (status.state === "error") { clearTimeout(timer); unsubscribe(); reject(new Error(status.lastError ?? "REMOTE_START_FAILED")); }
      });
    });
  }

  private readLine(record: RemoteRecord, chunk: string, runtimeGeneration: string): void {
    if (record.runtimeGeneration !== runtimeGeneration) return;
    record.outputBuffer += chunk;
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

  private processFailed(record: RemoteRecord, error: unknown, runtimeGeneration: string): void {
    if (record.runtimeGeneration !== runtimeGeneration) return;
    if (!record.process) return;
    const processRecord = record.process;
    record.process = undefined;
    void rm(dirname(processRecord.tokenFile), { recursive: true, force: true }).catch((cleanupError) => {
      this.emit(record, "error", { diagnostics: [`REMOTE_TEMP_CLEANUP_FAILED:${message(cleanupError)}`] });
    });
    record.runtimeGeneration = null;
    this.emit(record, "error", { endpoint: null, lastError: message(error), diagnostics: [], runtimeGeneration: null });
  }

  async stop(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteStatus> {
    return this.enqueue(projectId, () => this.stopNow(projectId, identity));
  }

  private async stopNow(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteStatus> {
    await this.load();
    const record = this.record(projectId, identity);
    const processRecord = record.process;
    if (!processRecord) { record.runtimeGeneration = null; this.emit(record, this.data.configs[identity.fingerprint]?.enabled ? "stopped" : "disabled", { runtimeGeneration: null }); return record.status; }
    this.emit(record, "stopping");
    record.process = undefined;
    record.runtimeGeneration = null;
    processRecord.child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 5_000);
      processRecord.child.once("exit", () => { clearTimeout(timer); resolve(); });
    });
    await rm(dirname(processRecord.tokenFile), { recursive: true, force: true });
    this.emit(record, this.data.configs[identity.fingerprint]?.enabled ? "stopped" : "disabled", { endpoint: null, tokenId: null, generation: null, runtimeGeneration: null });
    return record.status;
  }

  async doctor(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }): Promise<RemoteDoctorResult> {
    return this.enqueue(projectId, () => this.doctorNow(projectId, identity, paths));
  }

  private async doctorNow(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }): Promise<RemoteDoctorResult> {
    await this.load();
    const record = this.record(projectId, identity);
    const config = this.data.configs[identity.fingerprint];
    if (!config?.secretId) throw new Error("REMOTE_CONFIG_AND_SECRET_REQUIRED");
    const secret = await getSecret(this.userData, config.secretId, this.backend);
    const directory = join(tmpdir(), "kanmer-remote-doctor", randomUUID());
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, `${secret}\n`, { encoding: "ascii", mode: 0o600 });
    const mode = record.process && (record.status.state === "ready" || record.status.state === "degraded") ? "public" : "config";
    const child = this.spawnProcess(process.execPath, [doctorCliEntry(), mode, "--json"], {
      cwd: paths.root,
      env: {
        ...process.env,
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
      }, stdio: ["ignore", "pipe", "pipe"],
    });
    return await new Promise<RemoteDoctorResult>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => { child.kill(); reject(new Error("REMOTE_DOCTOR_TIMEOUT")); }, 120_000);
      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => { output += chunk; });
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
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
          };
          if (reportResult.ok && mode === "public") this.emit(record, record.status.state, { public: "verified" });
          resolve(reportResult);
        } catch { reject(new Error(code === 0 ? "REMOTE_DOCTOR_INVALID_OUTPUT" : `REMOTE_DOCTOR_EXIT_${code ?? "unknown"}`)); }
      });
    });
  }

  async closeAll(): Promise<void> {
    for (const record of this.records.values()) if (record.process) await this.stop(record.projectId, record.identity);
    this.deliveries.clear();
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
