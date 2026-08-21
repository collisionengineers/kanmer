import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { CloudflareRemoteConfig, RemoteProjectRegistration } from "../../shared/remote.js";

interface PersistedRemoteAccess {
  version: 1;
  projects: Record<string, RemoteProjectRegistration>;
  configs: Record<string, CloudflareRemoteConfig>;
}

const EMPTY: PersistedRemoteAccess = { version: 1, projects: {}, configs: {} };

function normalizeConfig(value: unknown): CloudflareRemoteConfig | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Partial<CloudflareRemoteConfig>;
  if (c.provider !== "cloudflared" || typeof c.enabled !== "boolean" || typeof c.secretId !== "string" || c.secretId.length > 2048 ||
    [c.executable, c.tunnelId, c.credentialsFile, c.hostname].every(
      (part) => typeof part === "string" && part.length > 0 && part.length <= 2048,
    ) === false) return null;
  return {
    provider: "cloudflared", executable: c.executable!, tunnelId: c.tunnelId!, credentialsFile: c.credentialsFile!, hostname: c.hostname!,
    secretId: c.secretId, enabled: c.enabled, autoStart: typeof c.autoStart === "boolean" ? c.autoStart : c.enabled,
    ...(typeof c.generation === "string" ? { generation: c.generation } : {}),
    ...(typeof c.lastDoctorSummary === "string" && c.lastDoctorSummary.length <= 240 ? { lastDoctorSummary: c.lastDoctorSummary } : {}),
    ...(typeof c.lastDoctorRepair === "string" && c.lastDoctorRepair.length <= 512 ? { lastDoctorRepair: c.lastDoctorRepair } : {}),
    ...(typeof c.lastDoctorAt === "string" && c.lastDoctorAt.length <= 64 ? { lastDoctorAt: c.lastDoctorAt } : {}),
  };
}

export function remoteAccessPath(userData: string): string {
  return join(userData, "settings.json");
}

export async function readRemoteAccess(userData: string): Promise<PersistedRemoteAccess> {
  try {
    const envelope = JSON.parse(await readFile(remoteAccessPath(userData), "utf8")) as { remoteAccess?: Partial<PersistedRemoteAccess> };
    const value = envelope.remoteAccess;
    if (!value || value.version !== 1 || !value.projects || !value.configs) return structuredClone(EMPTY);
    const projects: Record<string, RemoteProjectRegistration> = {};
    const projectIds = new Set<string>();
    for (const [key, project] of Object.entries(value.projects)) {
      const identity = project?.identity;
      if (project && typeof project.projectId === "string" && isAbsolute(project.projectId) && project.projectId.length <= 4096 && identity?.fingerprint === key && identity.repoRoot === project.projectId && /^kanmer-proj-v1:[a-f0-9]{64}$/i.test(key) && typeof identity.boardRoot === "string" && isAbsolute(identity.boardRoot) && identity.boardRoot.length > 0 && identity.boardRoot.length <= 4096 && !/[\u0000-\u001f\u007f]/.test(identity.boardRoot) && typeof identity.repoRoot === "string" && identity.repoRoot.length > 0 && identity.repoRoot.length <= 4096 && !/[\u0000-\u001f\u007f]/.test(identity.repoRoot) && Number.isInteger(identity.format) && identity.format > 0 && (identity.boardSource === "file" || identity.boardSource === "default") && !projectIds.has(project.projectId)) {
        projects[key] = project;
        projectIds.add(project.projectId);
      }
    }
    const configs: Record<string, CloudflareRemoteConfig> = {};
    for (const [key, config] of Object.entries(value.configs)) {
      const normalized = normalizeConfig(config);
      if (normalized && projects[key]) configs[key] = normalized;
    }
    return { version: 1, projects, configs };
  } catch {
    return structuredClone(EMPTY);
  }
}

export async function writeRemoteAccess(userData: string, value: PersistedRemoteAccess): Promise<void> {
  await mkdir(userData, { recursive: true });
  const target = remoteAccessPath(userData);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  let envelope: Record<string, unknown> = {};
  try { envelope = JSON.parse(await readFile(target, "utf8")) as Record<string, unknown>; } catch { /* first-run settings file */ }
  envelope.remoteAccess = value;
  await writeFile(temporary, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

export function emptyRemoteAccess(): PersistedRemoteAccess { return structuredClone(EMPTY); }
export type { PersistedRemoteAccess };
