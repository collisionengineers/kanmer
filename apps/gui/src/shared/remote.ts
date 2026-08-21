export const REMOTE_CONFIG_VERSION = 1 as const;

export interface RemoteClipboardPort {
  readText(): string;
  writeText(value: string): void;
}

export function clearClipboardIfUnchanged(clipboard: RemoteClipboardPort, expected: string): boolean {
  if (clipboard.readText() !== expected) return false;
  clipboard.writeText("");
  return true;
}

export type RemoteState = "disabled" | "missing" | "stopped" | "starting" | "ready" | "degraded" | "stopping" | "error";
export type RemoteAction = "idle" | "starting" | "stopping" | "diagnosing" | "rotating" | "removing";
export type RemoteSeverity = "info" | "warning" | "error";
export type RemoteHealth = "unknown" | "ready" | "failed" | "stale" | "not-run";

export interface RemoteHealthDimensions {
  board: RemoteHealth;
  listener: RemoteHealth;
  authentication: RemoteHealth;
  sessions: RemoteHealth;
  tunnel: RemoteHealth;
  remote: RemoteHealth;
}

export interface CloudflareRemoteConfig {
  provider: "cloudflared";
  executable: string;
  tunnelId: string;
  credentialsFile: string;
  hostname: string;
  secretId: string;
  enabled: boolean;
  autoStart: boolean;
  /** Opaque optimistic-concurrency generation persisted with the config. */
  generation?: string;
  lastDoctorSummary?: string;
  lastDoctorRepair?: string;
  lastDoctorAt?: string;
}

export interface RemoteProjectIdentity {
  fingerprint: string;
  boardRoot: string;
  repoRoot: string;
  format: number;
  boardSource: "file" | "default";
}

export interface RemoteStatus {
  projectId: string;
  fingerprint: string;
  provider: "cloudflared";
  state: RemoteState;
  action: RemoteAction;
  severity: RemoteSeverity;
  health: RemoteHealthDimensions;
  local: "stopped" | "starting" | "ready" | "stopping" | "error";
  tunnel: "stopped" | "starting" | "connected" | "degraded" | "failed";
  public: "not-run" | "verified" | "stale";
  endpoint: string | null;
  authRequired: true;
  tokenId: string | null;
  generation: string | null;
  configGeneration: string | null;
  runtimeGeneration: string | null;
  lastSummary: string | null;
  lastRepair: string | null;
  lastDoctorAt: string | null;
  diagnostics: string[];
  lastError: string | null;
  updatedAt: string;
}

export interface RemoteProjectView {
  projectId: string;
  identity: RemoteProjectIdentity;
  config: Omit<CloudflareRemoteConfig, "secretId" | "generation" | "lastDoctorSummary" | "lastDoctorRepair" | "lastDoctorAt"> & { secretConfigured: boolean };
  status: RemoteStatus;
}

export interface RemoteSecretDelivery {
  deliveryId: string;
  expiresAt: string;
  token: string;
}

export interface RemoteDoctorResult {
  ok: boolean;
  projectId: string;
  fingerprint: string;
  checks: Array<{ id: string; group?: string; status: "pass" | "warn" | "fail" | "skipped"; detail: string; repair?: RemoteRepair | null }>;
  summary: string;
  severity: RemoteSeverity;
  repair: RemoteRepair | null;
  mode: "config" | "local" | "public";
  configGeneration: string | null;
  runtimeGeneration: string | null;
}

export interface RemoteRepair {
  code: string;
  actions: string[];
  section: string;
}

export interface RemoteProjectRegistration { projectId: string; identity: RemoteProjectIdentity; }
