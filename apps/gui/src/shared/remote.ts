export const REMOTE_CONFIG_VERSION = 1 as const;

export type RemoteState = "disabled" | "stopped" | "starting" | "ready" | "degraded" | "stopping" | "error";

export interface CloudflareRemoteConfig {
  provider: "cloudflared";
  executable: string;
  tunnelId: string;
  credentialsFile: string;
  hostname: string;
  secretId: string;
  enabled: boolean;
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
  local: "stopped" | "starting" | "ready" | "stopping" | "error";
  tunnel: "stopped" | "starting" | "connected" | "degraded" | "failed";
  public: "not-run" | "verified" | "stale";
  endpoint: string | null;
  authRequired: true;
  tokenId: string | null;
  generation: string | null;
  configGeneration: string | null;
  runtimeGeneration: string | null;
  diagnostics: string[];
  lastError: string | null;
  updatedAt: string;
}

export interface RemoteProjectView {
  projectId: string;
  identity: RemoteProjectIdentity;
  config: Omit<CloudflareRemoteConfig, "secretId"> & { secretConfigured: boolean };
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
  checks: Array<{ id: string; status: "pass" | "warn" | "fail" | "skipped"; detail: string }>;
  summary: string;
}

export interface RemoteProjectRegistration { projectId: string; identity: RemoteProjectIdentity; }
