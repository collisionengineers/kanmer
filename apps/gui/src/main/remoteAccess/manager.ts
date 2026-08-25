import { randomBytes, randomUUID } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { app, clipboard } from "electron";
import { withSettingsFileLock } from "../settings.js";
import { emptyRemoteAccess, readRemoteAccess, writeRemoteAccess, type PersistedRemoteAccess } from "./configStore.js";
import { canonicalProjectPath } from "./identity.js";
import { getSecret, putSecret, removeSecret, type SecretBackend } from "./secrets.js";
import type {
  CloudflareRemoteConfig,
  RemoteClipboardPort,
  RemoteDoctorResult,
  RemoteProjectIdentity,
  RemoteProjectView,
  RemoteSecretDelivery,
  RemoteState,
  RemoteStatus,
} from "../../shared/remote.js";
import { clearClipboardIfUnchanged } from "../../shared/remote.js";

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
  cancel?: () => void;
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
  if (value.length < 1 || value.length > 253 || /[^A-Za-z0-9.-]/.test(value) || value.includes("..") || value.startsWith(".") || value.endsWith(".")) return false;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value)) return false;
  const lower = value.toLowerCase();
  return lower !== "localhost" && lower !== "localhost.localdomain" && isIP(lower) === 0 && value === lower;
}

function isSafePath(value: string): boolean {
  return value.length > 0 && value.length <= 2048 && !/[\u0000-\u001f\u007f]/.test(value) && !/["'`]/.test(value);
}

function isSafeCredentialsPath(value: string): boolean {
  return isSafePath(value) && isAbsolute(value) && !value.split(/[\\/]+/).includes("..");
}

function isSafeExecutable(value: string): boolean {
  if (!isSafePath(value)) return false;
  if (isAbsolute(value)) return !value.split(/[\\/]+/).includes("..");
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function isTunnelId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isSafeRootPath(value: string): boolean {
  return isAbsolute(value) && value.length <= 4096 && !/[\u0000-\u001f\u007f]/.test(value);
}

function doctorGroup(id: string): string {
  if (/^(PROJECT_|REMOTE_CONFIG|SECRET_|TUNNEL_)/.test(id)) return "Configuration";
  if (/^(LOCAL_|AUTH_|MCP_|SESSION_)/.test(id)) return "Local MCP";
  if (id.includes("PUBLIC")) return "Public endpoint";
  return "Safety";
}

function isCanonicalLocalEndpoint(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]") && parsed.pathname === "/mcp" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch { return false; }
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

/** The branch binding shared by remote runtime and doctor child processes. */
export function remoteBoardBranchEnvironment(boardBranch?: string): { KANMER_BOARD_BRANCH: string } {
  return { KANMER_BOARD_BRANCH: boardBranch?.trim() || "kanmer-board" };
}

export class RemoteAccessManager {
  private readonly records = new Map<string, RemoteRecord>();
  private readonly listeners = new Set<StatusListener>();
  private readonly deliveries = new Map<string, SecretDeliveryRecord>();
  private readonly deliveryTimers = new Map<string, NodeJS.Timeout>();
  private readonly clipboardTimers = new Map<string, { expected: string; timer: NodeJS.Timeout }>();
  private readonly queues = new Map<string, Promise<void>>();
  private settingsQueue: Promise<void> = Promise.resolve();
  private loading: Promise<void> | null = null;
  private data: PersistedRemoteAccess = emptyRemoteAccess();
  private loaded = false;
  private closing = false;
  private activeStarts = 0;
  private readonly startWaiters: Array<() => void> = [];
  private scavenged = false;
  private registryReconciled = false;
  private settingsDepth = 0;
  private readonly clipboardAdapter: RemoteClipboardPort;
  private readonly boardBranch: () => string;

  public constructor(
    private readonly userData: string,
    private readonly spawnProcess: SpawnFn = (command, args, options) => spawn(command, args, options),
    private readonly backend?: SecretBackend,
    clipboardAdapter?: RemoteClipboardPort,
    boardBranch: () => string = () => "kanmer-board",
  ) {
    this.boardBranch = boardBranch;
    this.clipboardAdapter = clipboardAdapter ?? {
      readText: () => clipboard?.readText() ?? "",
      writeText: (value) => { if (!clipboard) throw new Error("REMOTE_CLIPBOARD_UNAVAILABLE"); clipboard.writeText(value); },
    };
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    if (!this.loading) {
      this.loading = readRemoteAccess(this.userData).then((data) => {
        this.data = data;
        this.loaded = true;
      }).finally(() => { this.loading = null; });
    }
    await this.loading;
    if (!this.scavenged) {
      this.scavenged = true;
      await this.scavengeRuntimeResidue();
    }
    if (!this.settingsDepth && !this.registryReconciled) {
      this.registryReconciled = true;
      await withSettingsFileLock(() => this.persist());
    }
  }

  private withSettingsLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.settingsQueue;
    const run = previous.catch(() => undefined).then(() => withSettingsFileLock(async () => { this.settingsDepth++; try { return await work(); } finally { this.settingsDepth--; } }));
    this.settingsQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private persist(): Promise<void> { return writeRemoteAccess(this.userData, this.data); }

  private async scavengeRuntimeResidue(): Promise<void> {
    const referencedSecrets = new Set(Object.values(this.data.configs).map((config) => config.secretId).filter((id) => /^[0-9a-f-]{36}$/i.test(id)));
    const secretRoot = join(this.userData, "remote-access-secrets");
    try {
      for (const entry of await readdir(secretRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !/^[0-9a-f-]{36}\.bin$/i.test(entry.name)) continue;
        const id = entry.name.slice(0, -4);
        if (referencedSecrets.has(id)) continue;
        const path = join(secretRoot, entry.name);
        try { if (Date.now() - (await stat(path)).mtimeMs > 60 * 60_000) await rm(path, { force: true }); } catch { /* concurrent cleanup */ }
      }
    } catch { /* first run has no secret directory */ }
    const owners = join(this.userData, "remote-access-owners");
    try {
      for (const entry of await readdir(owners, { withFileTypes: true })) {
        if (!entry.isFile() || !/^[a-f0-9]{64}\.json$/i.test(entry.name)) continue;
        const file = join(owners, entry.name);
        try {
          const value = JSON.parse(await readFile(file, "utf8")) as { pid?: unknown; nonce?: unknown; projectFingerprint?: unknown };
          if (typeof value.pid !== "number" || !Number.isInteger(value.pid) || value.pid <= 0 || typeof value.nonce !== "string" || !/^[0-9a-f-]{36}$/i.test(value.nonce) || typeof value.projectFingerprint !== "string" || !/^kanmer-proj-v1:[a-f0-9]{64}$/i.test(value.projectFingerprint)) continue;
          const expected = ownerPath(this.userData, value.projectFingerprint);
          if (expected !== file) continue;
          let alive = true;
          try { process.kill(value.pid, 0); } catch (error) { alive = (error as NodeJS.ErrnoException).code === "EPERM"; }
          if (!alive) await rm(file, { force: true });
        } catch { /* malformed or unreadable owner files are ambiguous and remain */ }
      }
    } catch { /* first run has no owner directory */ }
    for (const name of ["kanmer-remote", "kanmer-remote-doctor"]) {
      const root = join(tmpdir(), name);
      try {
        for (const entry of await readdir(root, { withFileTypes: true })) {
          if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/i.test(entry.name)) continue;
          const path = join(root, entry.name);
          try {
            const age = Date.now() - (await stat(path)).mtimeMs;
            if (age <= 60 * 60_000) continue;
            const marker = JSON.parse(await readFile(join(path, "owner.json"), "utf8")) as { pid?: unknown };
            if (typeof marker.pid !== "number" || !Number.isInteger(marker.pid) || marker.pid <= 0) continue;
            let alive = true;
            try { process.kill(marker.pid, 0); } catch (error) { alive = (error as NodeJS.ErrnoException).code === "EPERM"; }
            if (!alive) await rm(path, { recursive: true, force: true });
          } catch { /* a concurrently exiting child owns cleanup */ }
        }
      } catch { /* first run has no temp directory */ }
    }
  }

  private enqueue<T>(projectId: string, work: () => Promise<T>): Promise<T> {
    projectId = canonicalProjectPath(projectId);
    const previous = this.queues.get(projectId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(work);
    const tail = run.then(() => undefined, () => undefined);
    this.queues.set(projectId, tail);
    return run.finally(() => { if (this.queues.get(projectId) === tail) this.queues.delete(projectId); });
  }


  private record(projectId: string, identity: RemoteProjectIdentity): RemoteRecord {
    projectId = canonicalProjectPath(projectId);
    const existing = this.records.get(projectId);
    if (existing && existing.identity.fingerprint !== identity.fingerprint) {
      throw new Error("REMOTE_PROJECT_IDENTITY_CHANGED");
    }
    if (existing) return existing;
    const configured = this.data.configs[identity.fingerprint];
    const configGeneration = configured?.generation ?? (configured?.secretId ? `config:${identity.fingerprint}` : null);
    const record: RemoteRecord = {
      projectId,
      identity,
      status: statusFor(projectId, identity, configured?.enabled && configured.secretId ? "stopped" : "disabled", {
        configGeneration,
        lastSummary: configured?.lastDoctorSummary ?? null,
        lastRepair: configured?.lastDoctorRepair ?? null,
        lastDoctorAt: configured?.lastDoctorAt ?? null,
      }),
      outputBuffer: "",
      configGeneration,
      runtimeGeneration: null,
    };
    this.records.set(projectId, record);
    return record;
  }

  async register(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteProjectView> {
    return this.withSettingsLock(async () => {
      projectId = canonicalProjectPath(projectId);
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
    const projects = Object.values(this.data.projects)
      .sort((a, b) => a.identity.fingerprint.localeCompare(b.identity.fingerprint))
    return Promise.all(projects.map(async ({ projectId, identity }) => {
        const existing = this.records.get(projectId);
        const record = existing ?? this.record(projectId, identity);
        if (!existing) {
          let lastError = "REMOTE_PROJECT_NOT_OPEN";
          try {
            if (!isSafeRootPath(identity.boardRoot) || !isSafeRootPath(identity.repoRoot) || !(await stat(identity.boardRoot)).isDirectory() || !(await stat(identity.repoRoot)).isDirectory()) lastError = "REMOTE_PROJECT_PATH_MISSING";
          } catch { lastError = "REMOTE_PROJECT_PATH_MISSING"; }
          record.status = statusFor(projectId, identity, "missing", { configGeneration: record.configGeneration, lastError });
        }
        return this.view(record);
      }));
  }

  async reconcile(projectId: string, identity: RemoteProjectIdentity, expectedConfigGeneration: string | null = null): Promise<RemoteProjectView> {
    return this.withSettingsLock(async () => {
      projectId = canonicalProjectPath(projectId);
      await this.load();
      const registered = this.data.projects[identity.fingerprint];
      if (registered && registered.projectId !== projectId) throw new Error("REMOTE_PROJECT_IDENTITY_CONFLICT");
      if (!registered && this.data.configs[identity.fingerprint]) throw new Error("REMOTE_PROJECT_IDENTITY_CONFLICT");
      const oldEntry = Object.entries(this.data.projects).find(([fingerprint, project]) => project.projectId === projectId && fingerprint !== identity.fingerprint);
      if (oldEntry) {
        if (registered) throw new Error("REMOTE_PROJECT_IDENTITY_CONFLICT");
        const [oldFingerprint, oldProject] = oldEntry;
        if (oldProject.identity.repoRoot !== identity.repoRoot) throw new Error("REMOTE_PROJECT_IDENTITY_CONFLICT");
        const oldRecord = this.records.get(projectId);
        if (oldRecord?.process || oldRecord?.doctor) throw new Error("REMOTE_STOP_BEFORE_RECONCILE");
        const oldGeneration = oldRecord?.configGeneration ?? this.data.configs[oldFingerprint]?.generation ?? (this.data.configs[oldFingerprint]?.secretId ? `config:${oldFingerprint}` : null);
        if (expectedConfigGeneration !== oldGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
        const oldConfig = this.data.configs[oldFingerprint];
        const newConfig = this.data.configs[identity.fingerprint];
        const newProject = this.data.projects[identity.fingerprint];
        delete this.data.projects[oldFingerprint];
        delete this.data.configs[oldFingerprint];
        if (oldConfig) this.data.configs[identity.fingerprint] = oldConfig;
        this.data.projects[identity.fingerprint] = { projectId, identity };
        if (oldRecord) this.records.delete(projectId);
        try { await this.persist(); }
        catch (error) {
          if (oldConfig) this.data.configs[oldFingerprint] = oldConfig;
          else delete this.data.configs[oldFingerprint];
          if (newConfig) this.data.configs[identity.fingerprint] = newConfig;
          else delete this.data.configs[identity.fingerprint];
          this.data.projects[oldFingerprint] = oldProject;
          if (newProject) this.data.projects[identity.fingerprint] = newProject;
          else delete this.data.projects[identity.fingerprint];
          if (oldRecord) this.records.set(projectId, oldRecord);
          throw error;
        }
        return this.view(this.record(projectId, identity));
      }
      const record = this.record(projectId, identity);
      if (record.status.state === "missing") record.status = statusFor(projectId, identity, this.data.configs[identity.fingerprint]?.enabled && this.data.configs[identity.fingerprint]?.secretId ? "stopped" : "disabled", { configGeneration: record.configGeneration });
      this.data.projects[identity.fingerprint] = { projectId, identity };
      await this.persist();
      return this.view(record);
    });
  }

  async remove(projectId: string, identity: RemoteProjectIdentity, expectedConfigGeneration: string | null = null): Promise<void> {
    projectId = canonicalProjectPath(projectId);
    return this.enqueue(projectId, async () => {
      await this.withSettingsLock(async () => {
        await this.load();
        const record = this.record(projectId, identity);
        if (expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
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
    });
  }

  async viewFor(projectId: string, identity: RemoteProjectIdentity): Promise<RemoteProjectView> {
    await this.load();
    return this.view(this.record(projectId, identity));
  }

  private view(record: RemoteRecord): RemoteProjectView {
    const config = this.data.configs[record.identity.fingerprint];
    const safeConfig = config ? (({ secretId: _secretId, generation: _generation, lastDoctorSummary: _summary, lastDoctorRepair: _repair, lastDoctorAt: _doctorAt, ...safe }) => ({ ...safe, secretConfigured: Boolean(config.secretId) }))(config) : null;
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
    return this.enqueue(projectId, () => this.withSettingsLock(() => this.saveConfigNow(projectId, identity, patch)));
  }

  private async saveConfigNow(projectId: string, identity: RemoteProjectIdentity, patch: RemoteConfigPatch): Promise<RemoteProjectView> {
    await this.load();
    const record = this.record(projectId, identity);
    projectId = record.projectId;
    if (patch.expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
    if (!isSafeExecutable(patch.executable.trim()) || !isSafeCredentialsPath(patch.credentialsFile.trim()) || !isTunnelId(patch.tunnelId.trim()) || !isHostname(patch.hostname.trim())) throw new Error("REMOTE_CONFIG_INVALID");
    const previous = this.data.configs[identity.fingerprint];
    for (const [fingerprint, other] of Object.entries(this.data.configs)) {
      if (fingerprint !== identity.fingerprint && (other.tunnelId === patch.tunnelId.trim() || other.hostname === patch.hostname.trim())) throw new Error("REMOTE_RESOURCE_DUPLICATE");
    }
    if (record.process && (previous?.hostname !== patch.hostname || previous?.tunnelId !== patch.tunnelId || previous?.credentialsFile !== patch.credentialsFile || previous?.executable !== patch.executable)) throw new Error("REMOTE_STOP_BEFORE_RECONFIGURE");
    const nextGeneration = randomUUID();
    this.data.configs[identity.fingerprint] = {
      provider: "cloudflared", executable: patch.executable.trim(), tunnelId: patch.tunnelId.trim(), credentialsFile: patch.credentialsFile.trim(), hostname: patch.hostname.trim(), enabled: patch.enabled,
      autoStart: patch.autoStart,
      secretId: previous?.secretId ?? "",
      generation: nextGeneration,
    };
    record.configGeneration = nextGeneration;
    record.status = statusFor(projectId, identity, patch.enabled && previous?.secretId ? "stopped" : "disabled", { configGeneration: nextGeneration, public: "stale" });
    try {
      await this.persist();
    } catch (error) {
      if (previous) this.data.configs[identity.fingerprint] = previous;
      else delete this.data.configs[identity.fingerprint];
      record.configGeneration = previous?.generation ?? (previous?.secretId ? `config:${identity.fingerprint}` : null);
      record.status = statusFor(projectId, identity, previous?.enabled && previous.secretId ? "stopped" : "disabled", {
        configGeneration: record.configGeneration,
        lastSummary: previous?.lastDoctorSummary ?? null,
        lastRepair: previous?.lastDoctorRepair ?? null,
        lastDoctorAt: previous?.lastDoctorAt ?? null,
      });
      throw error;
    }
    return this.view(record);
  }

  async createSecret(projectId: string, identity: RemoteProjectIdentity, rotate = false, owner: { webContentsId: number; frameRoutingId: number } = { webContentsId: -1, frameRoutingId: -1 }, expectedConfigGeneration?: string | null): Promise<RemoteSecretDelivery> {
    return this.enqueue(projectId, () => this.withSettingsLock(() => this.createSecretNow(projectId, identity, rotate, owner, expectedConfigGeneration)));
  }

  private async createSecretNow(projectId: string, identity: RemoteProjectIdentity, rotate = false, owner: { webContentsId: number; frameRoutingId: number }, expectedConfigGeneration?: string | null): Promise<RemoteSecretDelivery> {
    await this.load();
    const record = this.record(projectId, identity);
    projectId = record.projectId;
    if (expectedConfigGeneration !== undefined && expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
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
    config.generation = record.configGeneration;
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
    const timer = setTimeout(() => {
      const current = this.deliveries.get(deliveryId);
      if (current) current.token = "";
      this.deliveries.delete(deliveryId);
      this.deliveryTimers.delete(deliveryId);
    }, 60_000);
    timer.unref();
    this.deliveryTimers.set(deliveryId, timer);
    return { deliveryId, expiresAt: new Date(expiresAt).toISOString(), token: generated };
  }

  private invalidateDeliveries(projectId: string): void {
    projectId = canonicalProjectPath(projectId);
    for (const [deliveryId, delivery] of this.deliveries) if (delivery.projectId === projectId) {
      delivery.token = "";
      const timer = this.deliveryTimers.get(deliveryId);
      if (timer) clearTimeout(timer);
      this.deliveryTimers.delete(deliveryId);
      this.deliveries.delete(deliveryId);
    }
  }

  /** Consume the delivery capability after the initiating renderer has shown/copy-confirmed it. */
  consumeSecretDelivery(projectId: string, deliveryId: string, owner: { webContentsId: number; frameRoutingId: number }): boolean {
    projectId = canonicalProjectPath(projectId);
    const entry = this.deliveries.get(deliveryId);
    this.deliveries.delete(deliveryId);
    const timer = this.deliveryTimers.get(deliveryId);
    if (timer) clearTimeout(timer);
    this.deliveryTimers.delete(deliveryId);
    if (!entry || entry.expiresAt <= Date.now() || entry.projectId !== projectId || entry.webContentsId !== owner.webContentsId || entry.frameRoutingId !== owner.frameRoutingId) {
      if (entry) entry.token = "";
      return false;
    }
    entry.token = "";
    return true;
  }

  /** Copy the one-time capability in the main process; the renderer never receives clipboard authority. */
  copySecretDelivery(projectId: string, deliveryId: string, owner: { webContentsId: number; frameRoutingId: number }): boolean {
    projectId = canonicalProjectPath(projectId);
    const entry = this.deliveries.get(deliveryId);
    if (!entry || entry.expiresAt <= Date.now() || entry.projectId !== projectId || entry.webContentsId !== owner.webContentsId || entry.frameRoutingId !== owner.frameRoutingId) {
      if (entry) entry.token = "";
      this.deliveries.delete(deliveryId);
      return false;
    }
    const value = entry.token;
    try { this.clipboardAdapter.writeText(value); }
    catch { return false; }
    this.consumeSecretDelivery(projectId, deliveryId, owner);
    const oldTimer = this.clipboardTimers.get(deliveryId);
    if (oldTimer) clearTimeout(oldTimer.timer);
    const timer = setTimeout(() => {
      const current = this.clipboardTimers.get(deliveryId);
      if (!current) return;
      try { clearClipboardIfUnchanged(this.clipboardAdapter, current.expected); } catch { /* quit or clipboard provider may already be unavailable */ }
      this.clipboardTimers.delete(deliveryId);
    }, 60_000);
    timer.unref();
    this.clipboardTimers.set(deliveryId, { expected: value, timer });
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
        : { ...record.status.health, listener: "not-run" as const, authentication: "not-run" as const, sessions: "not-run" as const, tunnel: state === "error" ? "failed" as const : "not-run" as const, remote: state === "error" ? "stale" as const : record.status.health.remote };
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
      if (!isSafeRootPath(project.paths.root) || !isSafeRootPath(project.paths.repoRoot)) return { projectId: project.projectId, ok: false, error: "REMOTE_AUTOSTART_PATH_INVALID" };
      try {
        if (!(await stat(project.paths.root)).isDirectory() || !(await stat(project.paths.repoRoot)).isDirectory()) return { projectId: project.projectId, ok: false, error: "REMOTE_PROJECT_PATH_MISSING" };
      } catch { return { projectId: project.projectId, ok: false, error: "REMOTE_PROJECT_PATH_MISSING" }; }
      try {
        const record = this.record(project.projectId, project.identity);
        await this.start(project.projectId, project.identity, project.paths, record.configGeneration);
        return { projectId: project.projectId, ok: true };
      } catch (error) {
        return { projectId: project.projectId, ok: false, error: message(error) };
      }
    }));
  }

  /** Return the persisted projects eligible for startup in deterministic order. */
  async autoStartRegistrations(): Promise<Array<{ projectId: string; identity: RemoteProjectIdentity; paths: { root: string; repoRoot: string } }>> {
    await this.load();
    const registrations = Object.values(this.data.projects).sort((a, b) => a.identity.fingerprint.localeCompare(b.identity.fingerprint));
    const result: Array<{ projectId: string; identity: RemoteProjectIdentity; paths: { root: string; repoRoot: string } }> = [];
    for (const { projectId, identity } of registrations) {
      const config = this.data.configs[identity.fingerprint];
      if (!config?.enabled || !config.autoStart || !config.secretId) continue;
      try {
        await stat(identity.boardRoot);
        await stat(identity.repoRoot);
        result.push({ projectId, identity, paths: { root: identity.boardRoot, repoRoot: identity.repoRoot } });
      } catch {
        const record = this.record(projectId, identity);
        this.emit(record, "missing", { public: "stale", lastError: "REMOTE_PROJECT_NOT_FOUND" });
      }
    }
    return result;
  }

  private async startNow(projectId: string, identity: RemoteProjectIdentity, paths: { root: string; repoRoot: string }, expectedConfigGeneration: string | null): Promise<RemoteStatus> {
    await this.load();
    const record = this.record(projectId, identity);
    projectId = record.projectId;
    if (this.closing) throw new Error("REMOTE_MANAGER_CLOSING");
    if (expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
    const config = this.data.configs[identity.fingerprint];
    if (!config?.enabled || !config.secretId) throw new Error("REMOTE_CONFIG_AND_SECRET_REQUIRED");
    if (record.process) return record.status;
    const runtimeGeneration = randomUUID();
    const ownerNonce = randomUUID();
    const ownerFile = ownerPath(this.userData, identity.fingerprint);
    try {
      const current = JSON.parse(await readFile(ownerFile, "utf8")) as { pid?: unknown; nonce?: unknown; projectFingerprint?: unknown };
      if (typeof current.pid !== "number" || !Number.isInteger(current.pid) || current.pid <= 0 || typeof current.nonce !== "string" || typeof current.projectFingerprint !== "string") throw new Error("REMOTE_OWNER_EXISTS");
      try { process.kill(current.pid, 0); throw new Error("REMOTE_OWNER_EXISTS"); }
      catch (error) {
        if (error instanceof Error && error.message === "REMOTE_OWNER_EXISTS") throw error;
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw new Error("REMOTE_OWNER_EXISTS");
        await rm(ownerFile, { force: true });
      }
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
          ...remoteBoardBranchEnvironment(this.boardBranch()),
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
      record.startAbort = undefined;
      this.emit(record, "error", { endpoint: null, public: "stale", runtimeGeneration: null, lastError: message(error), diagnostics: [] });
      throw error;
    }
    if (typeof child.pid === "number" && child.pid > 0) {
      try { await writeFile(join(directory, "owner.json"), JSON.stringify({ pid: child.pid }), { encoding: "utf8", mode: 0o600 }); }
      catch (error) { killOwnedTree(child); await rm(directory, { recursive: true, force: true }); record.runtimeGeneration = null; record.startAbort = undefined; this.emit(record, "error", { endpoint: null, public: "stale", runtimeGeneration: null, lastError: message(error), diagnostics: [] }); throw error; }
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
        if (event.kind === "kanmer-mcp-remote-ready" && event.endpoint && isCanonicalLocalEndpoint(event.endpoint) && event.projectFingerprint === record.identity.fingerprint) {
          this.emit(record, "ready", { endpoint: event.endpoint, tokenId: event.tokenId ?? null, generation: event.tokenId ?? null, runtimeGeneration: record.runtimeGeneration, public: "stale" });
        } else if (event.kind === "kanmer-mcp-remote-status" && event.status) {
          const endpoint = event.status.endpoint && isCanonicalLocalEndpoint(event.status.endpoint) ? event.status.endpoint : record.status.endpoint;
          const state = event.status.provider === "degraded" || event.status.provider === "restarting" ? "degraded" : event.status.provider === "failed" ? "error" : event.status.provider === "running" ? (endpoint ? "ready" : "starting") : event.status.local === "starting" ? "starting" : record.status.state;
          this.emit(record, state, { endpoint, diagnostics: event.status.reason ? [event.status.reason] : [] });
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
    this.emit(record, "error", { endpoint: null, public: "stale", lastError: message(error), diagnostics: [], runtimeGeneration: null });
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
    projectId = record.projectId;
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
    projectId = record.projectId;
    if (expectedConfigGeneration !== record.configGeneration) throw new Error("REMOTE_CONFIG_VERSION_CONFLICT");
    if (expectedRuntimeGeneration !== null && expectedRuntimeGeneration !== record.runtimeGeneration) throw new Error("REMOTE_RUNTIME_VERSION_CONFLICT");
    const config = this.data.configs[identity.fingerprint];
    if (!config?.secretId) throw new Error("REMOTE_CONFIG_AND_SECRET_REQUIRED");
    this.emit(record, record.status.state, { action: "diagnosing", lastError: null });
    const secret = await getSecret(this.userData, config.secretId, this.backend);
    const directory = join(tmpdir(), "kanmer-remote-doctor", randomUUID());
    const tokenFile = join(directory, "token");
    const mode = record.process && (record.status.state === "ready" || record.status.state === "degraded") ? "public" : "config";
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(tokenFile, `${secret}\n`, { encoding: "ascii", mode: 0o600 });
    } catch (error) {
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
      this.emit(record, record.status.state, { action: "idle", severity: "error", public: mode === "public" ? "stale" : record.status.public, lastError: message(error) });
      throw error;
    }
    let child: ChildProcess;
    try {
      child = this.spawnProcess(process.execPath, [doctorCliEntry(), mode, "--json"], {
        cwd: paths.root,
        detached: process.platform !== "win32",
        env: childEnvironment({
          ...(app.isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
          KANMER_ROOT: paths.root,
          KANMER_REPO_ROOT: paths.repoRoot,
          ...remoteBoardBranchEnvironment(this.boardBranch()),
          KANMER_EXPECTED_PROJECT: identity.fingerprint,
          KANMER_REMOTE_HOSTNAME: config.hostname,
          KANMER_TOKEN_FILE: tokenFile,
          KANMER_LOCAL_ENDPOINT: record.status.endpoint ?? "",
          KANMER_TUNNEL_STATUS_JSON: JSON.stringify({
            state: record.status.tunnel === "connected" ? "connected" : record.status.tunnel === "degraded" ? "degraded" : "failed",
            provider: "cloudflared",
            attempt: 1,
            changedAt: record.status.updatedAt,
            publicEndpoint: `https://${config.hostname}/mcp`,
            projectFingerprint: identity.fingerprint,
            ...(record.status.generation ? { authGeneration: record.status.generation } : {}),
          }),
          CLOUDFLARED_PATH: config.executable,
          CLOUDFLARED_TUNNEL_ID: config.tunnelId,
          CLOUDFLARED_CREDENTIALS_FILE: config.credentialsFile,
        }), stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      this.emit(record, record.status.state, { action: "idle", severity: "error", public: mode === "public" ? "stale" : record.status.public, lastError: message(error) });
      throw error;
    }
    if (typeof child.pid === "number" && child.pid > 0) {
      try { await writeFile(join(directory, "owner.json"), JSON.stringify({ pid: child.pid }), { encoding: "utf8", mode: 0o600 }); }
      catch (error) { killOwnedTree(child); await rm(directory, { recursive: true, force: true }); this.emit(record, record.status.state, { action: "idle", severity: "error", public: mode === "public" ? "stale" : record.status.public, lastError: message(error) }); throw error; }
    }
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
      const timeout = setTimeout(() => { if (settled) return; killOwnedTree(child); void rm(directory, { recursive: true, force: true }); this.emit(record, record.status.state, { action: "idle", public: mode === "public" ? "stale" : record.status.public, severity: "error", lastError: "REMOTE_DOCTOR_TIMEOUT" }); finish(new Error("REMOTE_DOCTOR_TIMEOUT")); }, 120_000);
      if (record.doctor?.child === child) record.doctor.cancel = () => { if (settled) return; clearTimeout(timeout); killOwnedTree(child); void rm(directory, { recursive: true, force: true }); finish(new Error("REMOTE_DOCTOR_CANCELLED")); };
      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => { if (output.length < MAX_OUTPUT_BUFFER) output += chunk.slice(0, MAX_OUTPUT_BUFFER - output.length); });
      child.stderr?.on("data", () => undefined);
      child.once("error", (error) => { if (settled) return; clearTimeout(timeout); void rm(directory, { recursive: true, force: true }); this.emit(record, record.status.state, { action: "idle", public: mode === "public" ? "stale" : record.status.public, severity: "error", lastError: message(error) }); finish(error); });
      child.once("exit", async (code) => {
        if (settled) return;
        clearTimeout(timeout);
        await rm(directory, { recursive: true, force: true });
        if (settled) return;
        try {
          const report = JSON.parse(output.trim()) as { status?: string; checks?: Array<{ id?: string; status?: string; details?: { reason?: string; observed?: string }; repair?: { code?: string; actions?: string[]; section?: string } }> };
          const status = report.status === "pass" || report.status === "warn" || report.status === "fail" ? report.status : "fail";
          const checks: RemoteDoctorResult["checks"] = (report.checks ?? []).map((check) => ({
            id: check.id ?? "unknown",
            group: doctorGroup(check.id ?? "unknown"),
            status: (check.status === "pass" || check.status === "warn" || check.status === "fail" || check.status === "skipped" ? check.status : "fail") as RemoteDoctorResult["checks"][number]["status"],
            detail: (check.details?.reason ?? check.details?.observed ?? "no detail").slice(0, 240),
            repair: check.repair ? { code: check.repair.code ?? "REMOTE_REPAIR", actions: (check.repair.actions ?? []).slice(0, 8).map((action) => action.slice(0, 160)), section: check.repair.section ?? doctorGroup(check.id ?? "unknown") } : null,
          }));
          const reportResult: RemoteDoctorResult = {
            projectId,
            fingerprint: identity.fingerprint,
            ok: code === 0 && status !== "fail",
            summary: status,
            checks,
            severity: status === "fail" ? "error" : status === "warn" ? "warning" : "info",
            repair: checks.find((check) => check.status === "fail" || check.status === "warn")?.repair ?? null,
            mode,
            configGeneration: record.configGeneration,
            runtimeGeneration: record.runtimeGeneration,
          };
          const current = record.configGeneration === reportResult.configGeneration && record.runtimeGeneration === reportResult.runtimeGeneration;
          if (current) {
            const doctorAt = new Date().toISOString();
            const repairText = reportResult.repair ? `${reportResult.repair.code}: ${reportResult.repair.actions[0] ?? reportResult.repair.section}` : null;
            this.emit(record, record.status.state, { action: "idle", severity: reportResult.severity, lastSummary: reportResult.summary, lastRepair: repairText, lastDoctorAt: doctorAt, public: reportResult.ok && mode === "public" ? "verified" : mode === "public" ? "stale" : record.status.public });
            const configured = this.data.configs[identity.fingerprint];
            if (configured) {
              configured.lastDoctorSummary = reportResult.summary.slice(0, 240);
              configured.lastDoctorRepair = repairText?.slice(0, 512);
              configured.lastDoctorAt = doctorAt;
              await this.withSettingsLock(() => this.persist()).catch((error) => {
                this.emit(record, record.status.state, { severity: "warning", diagnostics: [`REMOTE_DOCTOR_SUMMARY_PERSIST_FAILED:${message(error)}`] });
              });
            }
          }
          finish(reportResult);
        } catch { const failure = code === 0 ? "REMOTE_DOCTOR_INVALID_OUTPUT" : `REMOTE_DOCTOR_EXIT_${code ?? "unknown"}`; this.emit(record, record.status.state, { action: "idle", public: mode === "public" ? "stale" : record.status.public, severity: "error", lastError: failure }); finish(new Error(failure)); }
      });
    });
  }

  async closeAll(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    while (this.startWaiters.length) this.startWaiters.shift()?.();
    for (const timer of this.deliveryTimers.values()) clearTimeout(timer);
    this.deliveryTimers.clear();
    for (const { expected, timer } of this.clipboardTimers.values()) {
      clearTimeout(timer);
      try { clearClipboardIfUnchanged(this.clipboardAdapter, expected); } catch { /* quit cleanup is best effort */ }
    }
    this.clipboardTimers.clear();
    for (const delivery of this.deliveries.values()) delivery.token = "";
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
        const doctor = record.doctor;
        doctor.cancel?.();
        killOwnedTree(doctor.child);
        await rm(doctor.directory, { recursive: true, force: true }).catch(() => undefined);
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
  if (override && !app.isPackaged) return override;
  if (app.isPackaged) return join(process.resourcesPath, "mcp", "remote-cli.cjs");
  return join(app.getAppPath(), "..", "..", "packages", "mcp-server", "dist", "remote-cli.js");
}

function doctorCliEntry(): string {
  const override = process.env.KANMER_DOCTOR_CLI;
  if (override && !app.isPackaged) return override;
  if (app.isPackaged) return join(process.resourcesPath, "mcp", "doctor-cli.cjs");
  return join(app.getAppPath(), "..", "..", "packages", "mcp-server", "dist", "doctor-cli.js");
}
