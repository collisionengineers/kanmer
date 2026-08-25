import type { RemoteProjectIdentity } from "./remote.js";

export const OPENAI_TUNNEL_CONFIG_VERSION = 1 as const;

export type OpenAITunnelState = "disabled" | "missing" | "stopped" | "starting" | "ready" | "degraded" | "stopping" | "error";
export type OpenAITunnelAction = "idle" | "initializing" | "diagnosing" | "starting" | "stopping" | "restarting";
export type OpenAITunnelSeverity = "info" | "warning" | "error";

export interface OpenAITunnelHealth {
  executable: "unknown" | "ready" | "failed";
  credential: "unknown" | "ready" | "failed";
  listener: "unknown" | "ready" | "failed";
  mcp: "unknown" | "ready" | "failed";
}

export interface OpenAITunnelProfile {
  runtimeAlias: string;
  profileName: string;
  tunnelId: string;
  executable: string;
  credentialEnv: string;
  healthAddress: string;
  enabled: boolean;
  autoStart: boolean;
  generation: string;
  lastSummary: string | null;
  lastError: string | null;
  lastDoctorAt: string | null;
}

export interface OpenAITunnelConfigInput {
  runtimeAlias?: string;
  profileName: string;
  tunnelId: string;
  executable: string;
  credentialEnv: string;
  healthAddress: string;
  enabled: boolean;
  autoStart: boolean;
  expectedGeneration: string | null;
}

export interface OpenAITunnelStatus {
  projectId: string;
  fingerprint: string;
  profileName: string | null;
  state: OpenAITunnelState;
  action: OpenAITunnelAction;
  severity: OpenAITunnelSeverity;
  health: OpenAITunnelHealth;
  restartRequired: boolean;
  lastSummary: string | null;
  lastError: string | null;
  lastDoctorAt: string | null;
  updatedAt: string;
}

export interface OpenAITunnelProjectView {
  projectId: string;
  identity: RemoteProjectIdentity;
  profile: OpenAITunnelProfile | null;
  status: OpenAITunnelStatus;
  identityConflict?: boolean;
}

export interface OpenAITunnelCheck {
  id: "PROFILE_VALID" | "EXECUTABLE_PRESENT" | "CREDENTIAL_ENV_PRESENT" | "DOCTOR_COMMAND" | "MCP_TARGET" | "HEALTH_ADDRESS";
  status: "pass" | "warn" | "fail" | "skipped";
  detail: string;
}

export interface OpenAITunnelDoctorResult {
  ok: boolean;
  projectId: string;
  fingerprint: string;
  checks: OpenAITunnelCheck[];
  summary: string;
  severity: OpenAITunnelSeverity;
  generation: string | null;
  at: string;
}

export interface OpenAITunnelInvocation {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export function emptyOpenAITunnelProfile(): OpenAITunnelProfile {
  return {
    runtimeAlias: "",
    profileName: "",
    tunnelId: "",
    executable: "tunnel-client",
    credentialEnv: "CONTROL_PLANE_API_KEY",
    healthAddress: "127.0.0.1:8080",
    enabled: false,
    autoStart: false,
    generation: "",
    lastSummary: null,
    lastError: null,
    lastDoctorAt: null,
  };
}

export type { RemoteProjectIdentity };
