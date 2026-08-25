import { randomUUID } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { isAbsolute, join } from "node:path";
import type { RemoteProjectIdentity } from "../shared/remote.js";
import type {
  OpenAITunnelCheck,
  OpenAITunnelConfigInput,
  OpenAITunnelDoctorResult,
  OpenAITunnelHealth,
  OpenAITunnelInvocation,
  OpenAITunnelProfile,
  OpenAITunnelProjectView,
  OpenAITunnelStatus,
} from "../shared/openaiTunnel.js";
import { emptyOpenAITunnelProfile, OPENAI_TUNNEL_CONFIG_VERSION } from "../shared/openaiTunnel.js";

interface PersistedOpenAITunnel {
  version: 1;
  projects: Record<string, { projectId: string; identity: RemoteProjectIdentity }>;
  profiles: Record<string, OpenAITunnelProfile>;
}

const EMPTY: PersistedOpenAITunnel = { version: OPENAI_TUNNEL_CONFIG_VERSION, projects: {}, profiles: {} };
const MAX_OUTPUT = 16 * 1024;
const ENV_NAME = /^[A-Z_][A-Z0-9_]{0,127}$/;
const PROFILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const TUNNEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export interface OpenAITunnelRoots { boardRoot: string; repoRoot: string }
export type OpenAITunnelSpawn = (command: string, args: string[], options: {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdio: ["ignore", "pipe", "pipe"];
  detached?: boolean;
}) => ChildProcess;
export type OpenAITunnelInvocationFactory = (roots: OpenAITunnelRoots) => OpenAITunnelInvocation;

interface RecordState {
  projectId: string;
  identity: RemoteProjectIdentity;
  status: OpenAITunnelStatus;
}

interface CommandResult { code: number | null; output: string; error?: string }
interface CommandTracker { add(child: ChildProcess): void; remove(child: ChildProcess): void }

export function isSafeOpenAIExecutable(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value) || value.includes('"')) return false;
  return isAbsolute(value) ? !value.split(/[\\/]+/).includes("..") : !/["'`]/.test(value) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

export function isSafeOpenAIProfileName(value: unknown): value is string { return typeof value === "string" && PROFILE_NAME.test(value); }
export function isSafeOpenAITunnelId(value: unknown): value is string { return typeof value === "string" && TUNNEL_ID.test(value); }
export function isSafeOpenAICredentialEnv(value: unknown): value is string { return typeof value === "string" && ENV_NAME.test(value); }

export function isLoopbackHealthAddress(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  const match = /^(127\.0\.0\.1|\[::1\]):([0-9]{1,5})$/.exec(value);
  if (!match) return false;
  const port = Number(match[2]);
  return port >= 1024 && port <= 65535 && isIP(match[1].replace(/[\[\]]/g, "")) !== 0;
}

function sanitize(value: unknown, profile?: OpenAITunnelProfile): string {
  let text = value instanceof Error ? value.message : String(value);
  if (profile) {
    if (profile.tunnelId) text = text.split(profile.tunnelId).join("[tunnel-id]");
    if (profile.runtimeAlias) text = text.split(profile.runtimeAlias).join("[alias]");
    if (profile.profileName) text = text.split(profile.profileName).join("[profile]");
  }
  return text.replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240);
}

export function canonicalOpenAITunnelPath(projectId: string): string {
  const normalized = projectId.replace(/\\/g, "/");
  if (normalized === "/" || /^[A-Za-z]:\/$/u.test(normalized)) return normalized;
  return normalized.replace(/\/$/, "");
}

function healthFor(state: OpenAITunnelStatus["state"]): OpenAITunnelHealth {
  if (state === "ready") return { executable: "ready", credential: "ready", listener: "ready", mcp: "ready" };
  if (state === "missing" || state === "error") return { executable: "failed", credential: "failed", listener: "failed", mcp: "failed" };
  return { executable: "unknown", credential: "unknown", listener: "unknown", mcp: "unknown" };
}

function statusFor(projectId: string, identity: RemoteProjectIdentity, profile: OpenAITunnelProfile | null, state: OpenAITunnelStatus["state"], patch: Partial<OpenAITunnelStatus> = {}): OpenAITunnelStatus {
  return {
    projectId,
    fingerprint: identity.fingerprint,
    profileName: profile?.profileName || null,
    state,
    action: "idle",
    severity: state === "error" || state === "missing" ? "error" : state === "degraded" ? "warning" : "info",
    health: healthFor(state),
    restartRequired: false,
    lastSummary: profile?.lastSummary ?? null,
    lastError: profile?.lastError ?? null,
    lastDoctorAt: profile?.lastDoctorAt ?? null,
    updatedAt: new Date().toISOString(),
    ...patch,
  };
}

function defaultProfile(projectId: string): OpenAITunnelProfile {
  const base = projectId.split(/[\\/]/).filter(Boolean).at(-1) ?? "kanmer";
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "-");
  const profileName = (/^[A-Za-z0-9]/.test(cleaned) ? cleaned : `kanmer-${cleaned}`).slice(0, 64) || "kanmer";
  return { ...emptyOpenAITunnelProfile(), runtimeAlias: profileName, profileName };
}

function legacyDefaultProfile(projectId: string): OpenAITunnelProfile {
  const base = projectId.split(/[\\/]/).filter(Boolean).at(-1) ?? "kanmer";
  const profileName = base.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 56) || "kanmer";
  return { ...emptyOpenAITunnelProfile(), runtimeAlias: profileName, profileName };
}

function isRunnableProfile(profile: Partial<OpenAITunnelProfile>): profile is OpenAITunnelProfile {
  return isSafeOpenAIProfileName(profile.runtimeAlias) && isSafeOpenAIProfileName(profile.profileName) && isSafeOpenAITunnelId(profile.tunnelId) && isSafeOpenAIExecutable(profile.executable) &&
    isSafeOpenAICredentialEnv(profile.credentialEnv) && isLoopbackHealthAddress(profile.healthAddress) && typeof profile.enabled === "boolean" &&
    typeof profile.autoStart === "boolean" && typeof profile.generation === "string" && /^[0-9a-f-]{36}$/i.test(profile.generation);
}

function normalizeProfile(value: unknown, expectedDefault: OpenAITunnelProfile, legacyDefault: OpenAITunnelProfile): OpenAITunnelProfile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<OpenAITunnelProfile>;
  p.runtimeAlias ??= p.profileName;
  const complete = isRunnableProfile(p);
  const diagnosticsValid = (p.lastSummary === null || typeof p.lastSummary === "string") && (p.lastError === null || typeof p.lastError === "string") &&
    (p.lastDoctorAt === null || (typeof p.lastDoctorAt === "string" && !Number.isNaN(Date.parse(p.lastDoctorAt))));
  const matchesDefault = (candidate: OpenAITunnelProfile) => p.runtimeAlias === candidate.runtimeAlias && p.profileName === candidate.profileName && p.tunnelId === candidate.tunnelId && p.executable === candidate.executable &&
    p.credentialEnv === candidate.credentialEnv && p.healthAddress === candidate.healthAddress && p.enabled === candidate.enabled &&
    p.autoStart === candidate.autoStart && p.generation === candidate.generation;
  const productDefault = diagnosticsValid && (matchesDefault(expectedDefault) || matchesDefault(legacyDefault));
  if ((!complete && !productDefault) || (!productDefault && !isSafeOpenAIProfileName(p.profileName)) || !isSafeOpenAIExecutable(p.executable) || !isSafeOpenAICredentialEnv(p.credentialEnv) || !isLoopbackHealthAddress(p.healthAddress) || typeof p.enabled !== "boolean" || typeof p.autoStart !== "boolean") return null;
  return {
    runtimeAlias: productDefault ? expectedDefault.runtimeAlias : p.runtimeAlias!, profileName: productDefault ? expectedDefault.profileName : p.profileName!, tunnelId: p.tunnelId!, executable: p.executable,
    credentialEnv: p.credentialEnv, healthAddress: p.healthAddress, enabled: p.enabled,
    autoStart: p.autoStart, generation: p.generation!,
    lastSummary: typeof p.lastSummary === "string" ? sanitize(p.lastSummary) : null,
    lastError: typeof p.lastError === "string" ? sanitize(p.lastError) : null,
    lastDoctorAt: typeof p.lastDoctorAt === "string" ? p.lastDoctorAt.slice(0, 64) : null,
  };
}

export function openAITunnelSettingsPath(userData: string): string { return join(userData, "openai-tunnels.json"); }

export async function readOpenAITunnelSettings(userData: string): Promise<PersistedOpenAITunnel> {
  let raw: Partial<PersistedOpenAITunnel>;
  try {
    raw = JSON.parse(await readFile(openAITunnelSettingsPath(userData), "utf8")) as Partial<PersistedOpenAITunnel>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw new Error("OPENAI_TUNNEL_SETTINGS_READ_FAILED");
  }
  if (raw.version !== OPENAI_TUNNEL_CONFIG_VERSION || !raw.projects || !raw.profiles) throw new Error("OPENAI_TUNNEL_SETTINGS_INVALID");
  const projects: PersistedOpenAITunnel["projects"] = {};
  const profiles: PersistedOpenAITunnel["profiles"] = {};
  for (const [fingerprint, entry] of Object.entries(raw.projects)) {
    if (!entry || !/^kanmer-proj-v1:[a-f0-9]{64}$/i.test(fingerprint) || typeof entry.projectId !== "string" || !isAbsolute(entry.projectId) || !entry.identity || entry.identity.fingerprint !== fingerprint || !isAbsolute(entry.identity.boardRoot) || !isAbsolute(entry.identity.repoRoot) || !Number.isInteger(entry.identity.format) || (entry.identity.boardSource !== "file" && entry.identity.boardSource !== "default")) throw new Error("OPENAI_TUNNEL_SETTINGS_INVALID");
    projects[fingerprint] = { projectId: canonicalOpenAITunnelPath(entry.projectId), identity: { ...entry.identity, boardRoot: canonicalOpenAITunnelPath(entry.identity.boardRoot), repoRoot: canonicalOpenAITunnelPath(entry.identity.repoRoot) } };
    const profile = normalizeProfile(raw.profiles[fingerprint], defaultProfile(entry.projectId), legacyDefaultProfile(entry.projectId));
    if (raw.profiles[fingerprint] !== undefined && !profile) throw new Error("OPENAI_TUNNEL_SETTINGS_INVALID");
    if (profile) profiles[fingerprint] = profile;
  }
  return { version: 1, projects, profiles };
}

export async function writeOpenAITunnelSettings(userData: string, value: PersistedOpenAITunnel): Promise<void> {
  await mkdir(userData, { recursive: true });
  const target = openAITunnelSettingsPath(userData);
  const temporary = `${target}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

function shellArg(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  return /[\s"']/u.test(normalized) ? `"${normalized.replace(/"/g, '\\"')}"` : normalized;
}

export function buildOpenAITunnelMcpCommand(invocation: OpenAITunnelInvocation): string {
  return [invocation.command, ...invocation.args].map(shellArg).join(" ");
}

async function terminateChild(child: ChildProcess): Promise<{ ok: boolean; error?: string }> {
  if (child.exitCode !== null || child.signalCode !== null) return { ok: true };
  if (child.pid === undefined) {
    try { return { ok: child.kill("SIGKILL") }; } catch { return { ok: false, error: "OPENAI_TUNNEL_TERMINATION_FAILED" }; }
  }
  if (process.platform === "win32") {
    return new Promise((resolve) => execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], (error) => {
      if (!error) { resolve({ ok: true }); return; }
      try { resolve({ ok: child.kill("SIGKILL"), error: "OPENAI_TUNNEL_TERMINATION_FAILED" }); }
      catch { resolve({ ok: false, error: "OPENAI_TUNNEL_TERMINATION_FAILED" }); }
    }));
  }
  try { process.kill(-child.pid, "SIGKILL"); return { ok: true }; }
  catch {
    try { return { ok: child.kill("SIGKILL") }; }
    catch { return { ok: false, error: "OPENAI_TUNNEL_TERMINATION_FAILED" }; }
  }
}

function waitForChildExit(child: ChildProcess, timeoutMs = 1500): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exited: boolean) => { if (settled) return; settled = true; clearTimeout(timer); resolve(exited); };
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("close", () => finish(true));
    child.once("error", () => finish(true));
  });
}

function runCommand(spawnProcess: OpenAITunnelSpawn, command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, profile?: OpenAITunnelProfile, tracker?: CommandTracker, timeoutMs = 15_000): Promise<CommandResult> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try { child = spawnProcess(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (error) { resolve({ code: null, output: "", error: sanitize(error, profile) }); return; }
    let output = "";
    const collect = (chunk: unknown) => { output = `${output}${String(chunk)}`.slice(-MAX_OUTPUT); };
    let settled = false;
    tracker?.add(child);
    const finish = (result: CommandResult, remove = true) => { if (settled) return; settled = true; if (remove) tracker?.remove(child); clearTimeout(timer); resolve(result); };
    const timer = setTimeout(async () => { const termination = await terminateChild(child); finish({ code: null, output, error: termination.ok ? "OPENAI_TUNNEL_COMMAND_TIMEOUT" : termination.error }, termination.ok); }, timeoutMs);
    child.stdout?.on("data", collect); child.stderr?.on("data", collect);
    child.once("error", (error) => { tracker?.remove(child); finish({ code: null, output, error: sanitize(error, profile) }); });
    child.once("close", (code) => { tracker?.remove(child); finish({ code, output }); });
  });
}

interface ManagedRuntimeStatus {
  alias?: string;
  healthy?: boolean;
  process_running?: boolean;
  ready?: boolean;
  runtime_state?: string;
  stale?: boolean;
}

export function parseManagedRuntimeStatus(output: string): ManagedRuntimeStatus | null {
  try {
    const value = JSON.parse(output.trim()) as ManagedRuntimeStatus;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function managedRuntimeReady(runtime: ManagedRuntimeStatus | null): boolean {
  return runtime?.process_running === true && runtime.healthy === true && runtime.ready === true && runtime.runtime_state === "ready" && runtime.stale === false;
}

function commandFailure(result: CommandResult, profile: OpenAITunnelProfile, fallback: string): string {
  return (result.error ?? sanitize(result.output, profile)) || fallback;
}

export class OpenAITunnelManager {
  private readonly records = new Map<string, RecordState>();
  private readonly listeners = new Set<(status: OpenAITunnelStatus) => void>();
  private data: PersistedOpenAITunnel = structuredClone(EMPTY);
  private loaded = false;
  private loading: Promise<void> | null = null;
  private readonly queues = new Map<string, Promise<void>>();
  private readonly commandChildren = new Map<string, Set<ChildProcess>>();
  private persistQueue: Promise<void> = Promise.resolve();

  public constructor(private readonly userData: string, private readonly spawnProcess: OpenAITunnelSpawn = (command, args, options) => spawn(command, args, options), private readonly invocation: OpenAITunnelInvocationFactory = () => ({ command: process.execPath, args: [] })) {}

  subscribe(listener: (status: OpenAITunnelStatus) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(status: OpenAITunnelStatus): void { for (const listener of this.listeners) listener(status); }
  private async load(): Promise<void> { if (this.loaded) return; if (!this.loading) this.loading = readOpenAITunnelSettings(this.userData).then((data) => { this.data = data; this.loaded = true; }).finally(() => { this.loading = null; }); await this.loading; }
  private persist(): Promise<void> {
    const write = this.persistQueue.catch(() => undefined).then(() => writeOpenAITunnelSettings(this.userData, this.data));
    this.persistQueue = write.then(() => undefined, () => undefined);
    return write;
  }
  private enqueue<T>(projectId: string, task: () => Promise<T>): Promise<T> { const key = canonicalOpenAITunnelPath(projectId); const prior = this.queues.get(key) ?? Promise.resolve(); const run = prior.catch(() => undefined).then(task); const tail = run.then(() => undefined, () => undefined); this.queues.set(key, tail); return run.finally(() => { if (this.queues.get(key) === tail) this.queues.delete(key); }); }

  private commandTracker(projectId: string): CommandTracker {
    return {
      add: (child) => { const children = this.commandChildren.get(projectId) ?? new Set<ChildProcess>(); children.add(child); this.commandChildren.set(projectId, children); },
      remove: (child) => { const children = this.commandChildren.get(projectId); if (!children) return; children.delete(child); if (children.size === 0) this.commandChildren.delete(projectId); },
    };
  }

  private async stopCommands(projectId?: string): Promise<void> {
    const entries = [...this.commandChildren.entries()].filter(([id]) => projectId === undefined || id === projectId).flatMap(([id, children]) => [...children].map((child) => ({ id, child })));
    if (entries.length === 0) return;
    const results = await Promise.all(entries.map(async ({ child }) => {
      const termination = await terminateChild(child);
      if (!termination.ok) return false;
      return waitForChildExit(child);
    }));
    if (results.some((result) => result === false)) throw new Error("OPENAI_TUNNEL_TERMINATION_FAILED");
  }

  private record(projectId: string, identity: RemoteProjectIdentity): RecordState {
    projectId = canonicalOpenAITunnelPath(projectId);
    const existing = this.records.get(projectId);
    if (existing && existing.identity.fingerprint !== identity.fingerprint) throw new Error("OPENAI_PROJECT_IDENTITY_CHANGED");
    if (existing) return existing;
    const profile = this.data.profiles[identity.fingerprint] ?? null;
    const record: RecordState = { projectId, identity, status: statusFor(projectId, identity, profile, profile?.enabled ? "stopped" : "disabled") };
    this.records.set(projectId, record); return record;
  }

  private view(record: RecordState): OpenAITunnelProjectView { return { projectId: record.projectId, identity: record.identity, profile: this.data.profiles[record.identity.fingerprint] ?? null, status: record.status }; }

  async register(projectId: string, identity: RemoteProjectIdentity): Promise<OpenAITunnelProjectView> {
    await this.load();
    projectId = canonicalOpenAITunnelPath(projectId);
    const existing = this.records.get(projectId);
    if (existing && existing.identity.fingerprint !== identity.fingerprint) return { projectId, identity, profile: null, identityConflict: true, status: statusFor(projectId, identity, null, "error", { lastError: "OPENAI_PROJECT_IDENTITY_CHANGED" }) };
    const persistedConflict = Object.entries(this.data.projects).find(([fingerprint, entry]) => entry.projectId === projectId && fingerprint !== identity.fingerprint);
    if (persistedConflict) return { projectId, identity, profile: null, identityConflict: true, status: statusFor(projectId, identity, null, "error", { lastError: "OPENAI_PROJECT_IDENTITY_CHANGED" }) };
    const record = this.record(projectId, identity); this.data.projects[identity.fingerprint] = { projectId: record.projectId, identity }; if (!this.data.profiles[identity.fingerprint]) this.data.profiles[identity.fingerprint] = defaultProfile(record.projectId); const profile = this.data.profiles[identity.fingerprint]; if (record.status.state !== "error") record.status = statusFor(record.projectId, identity, profile, profile.enabled ? "stopped" : "disabled"); await this.persist(); if (profile.enabled && isRunnableProfile(profile)) await this.refreshRuntimeStatus(record, profile); return this.view(record);
  }

  async reconcile(projectId: string, identity: RemoteProjectIdentity, expectedGeneration: string | null = null): Promise<OpenAITunnelProjectView> {
    return this.enqueue(projectId, async () => {
      await this.load();
      projectId = canonicalOpenAITunnelPath(projectId);
      const existingTarget = this.data.projects[identity.fingerprint];
      if (existingTarget && existingTarget.projectId !== projectId) throw new Error("OPENAI_PROJECT_IDENTITY_CONFLICT");
      const record = this.records.get(projectId);
      const oldEntry = Object.entries(this.data.projects).find(([fingerprint, project]) => project.projectId === projectId && fingerprint !== identity.fingerprint);
      const oldFingerprint = oldEntry?.[0] ?? (record && record.identity.fingerprint !== identity.fingerprint ? record.identity.fingerprint : undefined);
      if (!oldFingerprint) {
        const nextRecord = this.record(projectId, identity);
        this.data.projects[identity.fingerprint] = { projectId: canonicalOpenAITunnelPath(projectId), identity };
        if (!this.data.profiles[identity.fingerprint]) this.data.profiles[identity.fingerprint] = defaultProfile(canonicalOpenAITunnelPath(projectId));
        await this.persist();
        return this.view(nextRecord);
      }
      if (this.data.profiles[identity.fingerprint]) throw new Error("OPENAI_PROJECT_IDENTITY_CONFLICT");
      await this.stopCommands(projectId);
      const oldProject = this.data.projects[oldFingerprint];
      const oldProfile = this.data.profiles[oldFingerprint];
      if (expectedGeneration !== null && expectedGeneration !== (oldProfile?.generation ?? null)) throw new Error("OPENAI_PROFILE_VERSION_CONFLICT");
      const previousTarget = this.data.projects[identity.fingerprint];
      const previousProfile = this.data.profiles[identity.fingerprint];
      this.data.projects[identity.fingerprint] = { projectId, identity };
      delete this.data.projects[oldFingerprint];
      if (oldProfile) { this.data.profiles[identity.fingerprint] = oldProfile; delete this.data.profiles[oldFingerprint]; }
      this.records.delete(projectId);
      try { await this.persist(); }
      catch (error) {
        if (oldProject) this.data.projects[oldFingerprint] = oldProject; else delete this.data.projects[oldFingerprint];
        if (previousTarget) this.data.projects[identity.fingerprint] = previousTarget; else delete this.data.projects[identity.fingerprint];
        if (oldProfile) this.data.profiles[oldFingerprint] = oldProfile; else delete this.data.profiles[oldFingerprint];
        if (previousProfile) this.data.profiles[identity.fingerprint] = previousProfile; else delete this.data.profiles[identity.fingerprint];
        if (record) this.records.set(projectId, record);
        throw error;
      }
      return this.view(this.record(projectId, identity));
    });
  }

  async remove(projectId: string, identity: RemoteProjectIdentity, expectedGeneration: string | null = null): Promise<void> {
    return this.enqueue(projectId, async () => {
      await this.load();
      const record = this.record(projectId, identity);
      await this.stopCommands(projectId);
      const profile = this.data.profiles[identity.fingerprint];
      if (expectedGeneration !== (profile?.generation ?? null)) throw new Error("OPENAI_PROFILE_VERSION_CONFLICT");
      if (profile && isRunnableProfile(profile)) {
        const before = await this.readRuntimeStatusForRemoval(record, profile);
        if (before !== null) {
          if (before.process_running === true) {
            const stopped = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "stop", profile.runtimeAlias, "--json"], record.identity.repoRoot, this.childEnv(profile), profile, this.commandTracker(projectId));
            if (stopped.code !== 0) throw new Error(commandFailure(stopped, profile, "OPENAI_RUNTIME_STOP_FAILED"));
            const after = await this.readRuntimeStatusStrict(record, profile);
            if (after.process_running !== false) throw new Error("OPENAI_RUNTIME_STOP_UNCONFIRMED");
          }
          const result = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "rm", profile.runtimeAlias, "--json"], record.identity.repoRoot, this.childEnv(profile), profile, this.commandTracker(projectId));
          if (result.code !== 0) throw new Error(commandFailure(result, profile, "OPENAI_RUNTIME_REMOVE_FAILED"));
        }
      }
      const previousProject = this.data.projects[identity.fingerprint];
      const previousProfile = profile;
      delete this.data.projects[identity.fingerprint]; delete this.data.profiles[identity.fingerprint];
      try { await this.persist(); }
      catch (error) {
        if (previousProject) this.data.projects[identity.fingerprint] = previousProject;
        if (previousProfile) this.data.profiles[identity.fingerprint] = previousProfile;
        throw error;
      }
      this.records.delete(projectId);
    });
  }

  async viewFor(projectId: string, identity: RemoteProjectIdentity): Promise<OpenAITunnelProjectView> { await this.load(); const record = this.record(projectId, identity); const profile = this.data.profiles[identity.fingerprint]; if (profile?.enabled && isRunnableProfile(profile)) await this.refreshRuntimeStatus(record, profile); return this.view(record); }
  async overview(): Promise<OpenAITunnelProjectView[]> { await this.load(); return Object.values(this.data.projects).sort((a, b) => a.projectId.localeCompare(b.projectId)).map((entry) => this.view(this.record(entry.projectId, entry.identity))); }

  async saveProfile(projectId: string, identity: RemoteProjectIdentity, input: OpenAITunnelConfigInput): Promise<OpenAITunnelProjectView> {
    return this.enqueue(projectId, async () => {
      await this.load(); const record = this.record(projectId, identity); const previous = this.data.profiles[identity.fingerprint] ?? null;
      const previousGeneration = previous?.generation && previous.generation.length > 0 ? previous.generation : null;
      if (previousGeneration !== input.expectedGeneration) throw new Error("OPENAI_PROFILE_VERSION_CONFLICT");
      const values = { ...input, runtimeAlias: (input.runtimeAlias ?? input.profileName).trim(), profileName: input.profileName.trim(), tunnelId: input.tunnelId.trim(), executable: input.executable.trim(), credentialEnv: input.credentialEnv.trim(), healthAddress: input.healthAddress.trim() };
      if (!isSafeOpenAIProfileName(values.runtimeAlias) || !isSafeOpenAIProfileName(values.profileName) || !isSafeOpenAITunnelId(values.tunnelId) || !isSafeOpenAIExecutable(values.executable) || !isSafeOpenAICredentialEnv(values.credentialEnv) || !isLoopbackHealthAddress(values.healthAddress)) throw new Error("OPENAI_PROFILE_INVALID");
      for (const [fingerprint, other] of Object.entries(this.data.profiles)) if (fingerprint !== identity.fingerprint && other.generation && other.tunnelId && (other.runtimeAlias === values.runtimeAlias || other.healthAddress === values.healthAddress)) throw new Error("OPENAI_PROFILE_RESOURCE_DUPLICATE");
      if (previousGeneration && previous && (previous.runtimeAlias !== values.runtimeAlias || previous.profileName !== values.profileName || previous.executable !== values.executable || previous.tunnelId !== values.tunnelId)) throw new Error("OPENAI_REMOVE_BEFORE_ALIAS_CHANGE");
      const previousProject = this.data.projects[identity.fingerprint];
      const previousStatus = record.status;
      const next: OpenAITunnelProfile = { ...values, generation: randomUUID(), lastSummary: previous?.lastSummary ?? null, lastError: previous?.lastError ?? null, lastDoctorAt: previous?.lastDoctorAt ?? null };
      this.data.projects[identity.fingerprint] = { projectId: record.projectId, identity }; this.data.profiles[identity.fingerprint] = next; record.status = statusFor(record.projectId, identity, next, next.enabled ? "stopped" : "disabled");
      try { await this.persist(); }
      catch (error) {
        if (previousProject) this.data.projects[identity.fingerprint] = previousProject; else delete this.data.projects[identity.fingerprint];
        if (previous) this.data.profiles[identity.fingerprint] = previous; else delete this.data.profiles[identity.fingerprint];
        record.status = previousStatus;
        throw error;
      }
      return this.view(record);
    });
  }

  async initialize(projectId: string, identity: RemoteProjectIdentity, roots: OpenAITunnelRoots): Promise<OpenAITunnelDoctorResult> {
    return this.enqueue(projectId, async () => {
      await this.load(); const record = this.record(projectId, identity); const profile = this.data.profiles[identity.fingerprint]; if (!profile) throw new Error("OPENAI_PROFILE_REQUIRED");
      if (!isRunnableProfile(profile)) throw new Error("OPENAI_PROFILE_INCOMPLETE");
      if (!profile.enabled) throw new Error("OPENAI_PROFILE_DISABLED");
      record.status = { ...record.status, action: "initializing", updatedAt: new Date().toISOString() }; this.emit(record.status);
      if (!process.env[profile.credentialEnv]) return this.finishDoctor(record, profile, [{ id: "CREDENTIAL_ENV_PRESENT", status: "fail", detail: `Environment variable ${profile.credentialEnv} is not present.` }], `Environment variable ${profile.credentialEnv} is not present.`);
      const command = this.invocation(roots); const mcpCommand = buildOpenAITunnelMcpCommand(command); const result = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "connect", "--alias", profile.runtimeAlias, "--profile", profile.profileName, "--tunnel-id", profile.tunnelId, "--runtime-api-key", `env:${profile.credentialEnv}`, "--mcp-command", mcpCommand, "--tunnel-client-bin", profile.executable, "--json"], roots.repoRoot, this.childEnv(profile, command.env), profile, this.commandTracker(projectId), 60_000);
      const failure = commandFailure(result, profile, "Managed runtime connection failed.");
      const checks: OpenAITunnelCheck[] = [{ id: "EXECUTABLE_PRESENT", status: result.code === 0 ? "pass" : "fail", detail: result.code === 0 ? "Managed runtime command completed." : failure }, { id: "CREDENTIAL_ENV_PRESENT", status: "pass", detail: "Named credential environment variable is present; its value was not read into diagnostics." }, { id: "MCP_TARGET", status: result.code === 0 ? "pass" : "fail", detail: result.code === 0 ? "Managed runtime is bound to the canonical stdio MCP target." : failure }];
      if (result.code !== 0) return this.finishDoctor(record, profile, checks, failure);
      return this.runtimeStatus(record, profile, roots, checks);
    });
  }

  private childEnv(profile: OpenAITunnelProfile, extra?: Record<string, string>): NodeJS.ProcessEnv { const env: NodeJS.ProcessEnv = { ...process.env, ...extra }; if (!process.env[profile.credentialEnv]) delete env[profile.credentialEnv]; return env; }

  private async readRuntimeStatus(record: RecordState, profile: OpenAITunnelProfile): Promise<ManagedRuntimeStatus | null> {
    const result = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "status", profile.runtimeAlias, "--json"], record.identity.repoRoot, this.childEnv(profile), profile, this.commandTracker(record.projectId));
    return result.code === 0 ? parseManagedRuntimeStatus(result.output) : null;
  }

  private async readRuntimeStatusStrict(record: RecordState, profile: OpenAITunnelProfile): Promise<ManagedRuntimeStatus> {
    const result = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "status", profile.runtimeAlias, "--json"], record.identity.repoRoot, this.childEnv(profile), profile, this.commandTracker(record.projectId));
    if (result.code !== 0) throw new Error(commandFailure(result, profile, "OPENAI_RUNTIME_STATUS_FAILED"));
    const runtime = parseManagedRuntimeStatus(result.output);
    if (!runtime || typeof runtime.process_running !== "boolean") throw new Error("OPENAI_RUNTIME_STATUS_INVALID");
    return runtime;
  }

  private async readRuntimeStatusForRemoval(record: RecordState, profile: OpenAITunnelProfile): Promise<ManagedRuntimeStatus | null> {
    const result = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "status", profile.runtimeAlias, "--json"], record.identity.repoRoot, this.childEnv(profile), profile, this.commandTracker(record.projectId));
    const detail = commandFailure(result, profile, "OPENAI_RUNTIME_STATUS_FAILED");
    if (result.code !== 0) {
      if (detail === "alias [alias] is not known; run create or connect first") return null;
      throw new Error(detail);
    }
    const runtime = parseManagedRuntimeStatus(result.output);
    if (!runtime || typeof runtime.process_running !== "boolean") throw new Error("OPENAI_RUNTIME_STATUS_INVALID");
    return runtime;
  }

  private async refreshRuntimeStatus(record: RecordState, profile: OpenAITunnelProfile): Promise<void> {
    const runtime = await this.readRuntimeStatus(record, profile);
    const ready = managedRuntimeReady(runtime);
    const running = runtime?.process_running === true;
    const state: OpenAITunnelStatus["state"] = ready ? "ready" : running ? "degraded" : runtime ? "stopped" : "missing";
    record.status = { ...record.status, state, action: "idle", severity: ready || (!running && runtime) ? "info" : running ? "warning" : "error", health: { executable: runtime ? "ready" : "failed", credential: process.env[profile.credentialEnv] ? "ready" : "unknown", listener: ready ? "ready" : running ? "unknown" : "failed", mcp: ready ? "ready" : running ? "unknown" : "failed" }, lastSummary: ready ? "OpenAI managed runtime is ready." : running ? "OpenAI managed runtime is running but not ready." : runtime ? "OpenAI managed runtime is stopped." : "OpenAI managed runtime status is unavailable.", updatedAt: new Date().toISOString() };
    this.emit(record.status);
  }

  async doctor(projectId: string, identity: RemoteProjectIdentity, roots: OpenAITunnelRoots): Promise<OpenAITunnelDoctorResult> {
    return this.enqueue(projectId, async () => {
      await this.load(); const record = this.record(projectId, identity); const profile = this.data.profiles[identity.fingerprint]; if (!profile) throw new Error("OPENAI_PROFILE_REQUIRED");
      if (!isRunnableProfile(profile)) throw new Error("OPENAI_PROFILE_INCOMPLETE");
      record.status = { ...record.status, action: "diagnosing", updatedAt: new Date().toISOString() }; this.emit(record.status);
      const checks: OpenAITunnelCheck[] = [{ id: "PROFILE_VALID", status: "pass", detail: "Profile fields passed local validation." }];
      if (!isSafeOpenAIExecutable(profile.executable)) checks.push({ id: "EXECUTABLE_PRESENT", status: "fail", detail: "Configured tunnel-client executable is invalid." });
      else checks.push({ id: "EXECUTABLE_PRESENT", status: "pass", detail: "Configured tunnel-client executable is valid; availability is checked by the child command." });
      if (!process.env[profile.credentialEnv]) checks.push({ id: "CREDENTIAL_ENV_PRESENT", status: "fail", detail: `Environment variable ${profile.credentialEnv} is not present.` });
      else checks.push({ id: "CREDENTIAL_ENV_PRESENT", status: "pass", detail: "Named credential environment variable is present; its value was not read into diagnostics." });
      if (checks.some((check) => check.status === "fail")) return this.finishDoctor(record, profile, checks, "OpenAI tunnel prerequisites are incomplete.");
      return this.runtimeStatus(record, profile, roots, checks);
    });
  }

  private async runtimeStatus(record: RecordState, profile: OpenAITunnelProfile, roots: OpenAITunnelRoots, checks: OpenAITunnelCheck[]): Promise<OpenAITunnelDoctorResult> {
    const result = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "status", profile.runtimeAlias, "--json"], roots.repoRoot, this.childEnv(profile), profile, this.commandTracker(record.projectId));
    const runtime = result.code === 0 ? parseManagedRuntimeStatus(result.output) : null;
    const ready = managedRuntimeReady(runtime);
    checks.push({ id: "DOCTOR_COMMAND", status: result.code === 0 && runtime ? "pass" : "fail", detail: runtime ? "Managed runtime status returned structured JSON." : "Managed runtime status failed or returned invalid JSON." });
    checks.push({ id: "HEALTH_ADDRESS", status: ready ? "pass" : "fail", detail: ready ? "Managed runtime reports healthy and ready." : "Managed runtime is not healthy and ready." });
    checks.push({ id: "MCP_TARGET", status: ready ? "pass" : "fail", detail: ready ? "Managed runtime process is running." : "Managed runtime process is not ready." });
    const report = await this.finishDoctor(record, profile, checks, ready ? "OpenAI managed runtime is ready." : "OpenAI managed runtime is not ready.");
    record.status = { ...record.status, state: ready ? "ready" : "error", severity: ready ? "info" : "error", health: { executable: runtime ? "ready" : "failed", credential: process.env[profile.credentialEnv] ? "ready" : "unknown", listener: ready ? "ready" : "failed", mcp: ready ? "ready" : "failed" }, updatedAt: new Date().toISOString() };
    this.emit(record.status);
    return report;
  }

  private async finishDoctor(record: RecordState, profile: OpenAITunnelProfile, checks: OpenAITunnelCheck[], summary: string): Promise<OpenAITunnelDoctorResult> {
    const at = new Date().toISOString(); const ok = checks.every((check) => check.status !== "fail"); const severity = checks.some((check) => check.status === "fail") ? "error" : checks.some((check) => check.status === "warn") ? "warning" : "info"; profile.lastSummary = sanitize(summary, profile); profile.lastError = ok ? null : sanitize(summary, profile); profile.lastDoctorAt = at;
    const executable = checks.some((check) => check.id === "EXECUTABLE_PRESENT" && check.status === "pass") ? "ready" : "failed";
    const credential = checks.some((check) => check.id === "CREDENTIAL_ENV_PRESENT" && check.status === "pass") ? "ready" : "failed";
    const listener = checks.some((check) => check.id === "HEALTH_ADDRESS" && check.status === "pass") ? "ready" : checks.some((check) => check.id === "HEALTH_ADDRESS" && check.status === "fail") ? "failed" : record.status.health.listener;
    const mcp = checks.some((check) => check.id === "MCP_TARGET" && check.status === "pass") ? "ready" : checks.some((check) => check.id === "MCP_TARGET" && check.status === "fail") ? "failed" : record.status.health.mcp;
    record.status = { ...record.status, state: ok ? record.status.state : "error", action: "idle", severity, lastSummary: profile.lastSummary, lastError: profile.lastError, lastDoctorAt: at, health: { executable, credential, listener, mcp }, updatedAt: at };
    await this.persist(); this.emit(record.status); return { ok, projectId: record.projectId, fingerprint: record.identity.fingerprint, checks, summary: profile.lastSummary, severity, generation: profile.generation, at };
  }

  async start(projectId: string, identity: RemoteProjectIdentity, roots: OpenAITunnelRoots, expectedGeneration: string | null = null): Promise<OpenAITunnelStatus> {
    await this.load();
    const record = this.record(projectId, identity);
    const profile = this.data.profiles[identity.fingerprint];
    if (!profile) throw new Error("OPENAI_PROFILE_REQUIRED");
    if (profile.generation !== expectedGeneration) throw new Error("OPENAI_PROFILE_VERSION_CONFLICT");
    if (!profile.enabled) throw new Error("OPENAI_PROFILE_DISABLED");
    record.status = { ...record.status, state: "starting", action: "starting", severity: "info", lastError: null, updatedAt: new Date().toISOString() };
    this.emit(record.status);
    await this.initialize(projectId, identity, roots);
    return record.status;
  }

  async stop(projectId: string, identity: RemoteProjectIdentity, expectedGeneration: string | null = null): Promise<OpenAITunnelStatus> {
    return this.enqueue(projectId, async () => { await this.load(); const record = this.record(projectId, identity); const profile = this.data.profiles[identity.fingerprint]; if (profile && profile.generation !== expectedGeneration) throw new Error("OPENAI_PROFILE_VERSION_CONFLICT"); if (!profile) throw new Error("OPENAI_PROFILE_REQUIRED"); record.status = { ...record.status, state: "stopping", action: "stopping", updatedAt: new Date().toISOString() }; this.emit(record.status); const result = await runCommand(this.spawnProcess, profile.executable, ["runtimes", "stop", profile.runtimeAlias, "--json"], identity.repoRoot, this.childEnv(profile), profile, this.commandTracker(projectId)); const nextState = result.code === 0 ? (profile.enabled ? "stopped" : "disabled") : "error"; record.status = { ...record.status, state: nextState, action: "idle", severity: result.code === 0 ? "info" : "error", health: healthFor(nextState), lastError: result.code === 0 ? null : commandFailure(result, profile, "OPENAI_RUNTIME_STOP_FAILED"), updatedAt: new Date().toISOString() }; this.emit(record.status); return record.status; });
  }

  async closeProject(projectId: string, _identity: RemoteProjectIdentity): Promise<void> {
    await this.load();
    await this.stopCommands(projectId);
  }

  async restart(projectId: string, identity: RemoteProjectIdentity, roots: OpenAITunnelRoots, expectedGeneration: string | null = null): Promise<OpenAITunnelStatus> { await this.stop(projectId, identity, expectedGeneration); return this.start(projectId, identity, roots, expectedGeneration); }
  async closeAll(): Promise<void> { await this.stopCommands(); }
  async markRestartRequired(): Promise<void> { await this.load(); for (const { projectId, identity } of Object.values(this.data.projects)) { const record = this.record(projectId, identity); const profile = this.data.profiles[identity.fingerprint]; if (profile?.enabled && isRunnableProfile(profile)) await this.refreshRuntimeStatus(record, profile); if (record.status.state === "ready" || record.status.state === "degraded") { record.status = { ...record.status, restartRequired: true, severity: "warning", state: "degraded", lastSummary: "Reconnect this managed runtime after installing the update.", updatedAt: new Date().toISOString() }; this.emit(record.status); } } }
  async autoStartRegistrations(): Promise<Array<{ projectId: string; identity: RemoteProjectIdentity }>> { await this.load(); return Object.entries(this.data.projects).filter(([fingerprint]) => this.data.profiles[fingerprint]?.enabled && this.data.profiles[fingerprint]?.autoStart).map(([, value]) => value); }
  async autoStart(registrations: Array<{ projectId: string; identity: RemoteProjectIdentity }>, roots: (projectId: string) => OpenAITunnelRoots): Promise<Array<{ projectId: string; ok: boolean; error?: string }>> { const results: Array<{ projectId: string; ok: boolean; error?: string }> = []; for (const registration of registrations) { try { const status = await this.start(registration.projectId, registration.identity, roots(registration.projectId), this.data.profiles[registration.identity.fingerprint]?.generation ?? null); results.push({ projectId: registration.projectId, ok: status.state !== "error", ...(status.state === "error" ? { error: status.lastError ?? "OPENAI_TUNNEL_START_FAILED" } : {}) }); } catch (error) { results.push({ projectId: registration.projectId, ok: false, error: sanitize(error) }); } } return results; }
}

export type { PersistedOpenAITunnel };
