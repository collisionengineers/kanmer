import { isIP } from "node:net";

/** Provider-neutral input for a process which forwards one public hostname to Kanmer's loopback HTTP listener. */
export type TunnelState = "stopped" | "validating" | "starting" | "connected" | "degraded" | "stopping" | "failed";

export interface TunnelTarget {
  readonly endpoint: string;
  readonly hostname: string;
  readonly projectFingerprint?: string;
  readonly authGeneration?: string;
}

/** Reference only: secret bytes are intentionally not representable here. */
export interface TunnelCredentialReference { readonly path: string; }

export interface CloudflaredNamedTunnelConfig {
  readonly provider: "cloudflared";
  readonly mode: "named-credentials";
  readonly executable: string;
  readonly tunnelId: string;
  readonly hostname: string;
  readonly credentials: TunnelCredentialReference;
}

/** Future providers extend this discriminated union without leaking their fields into generic status. */
export type TunnelProviderConfig = CloudflaredNamedTunnelConfig;

export interface TunnelStartInput {
  readonly config: TunnelProviderConfig;
  readonly target: TunnelTarget;
  readonly restartPolicy?: Partial<TunnelRestartPolicy>;
}

export interface TunnelRestartPolicy {
  readonly maxRestarts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly stableResetMs: number;
}

export const DEFAULT_TUNNEL_RESTART_POLICY: Readonly<TunnelRestartPolicy> = Object.freeze({
  maxRestarts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  stableResetMs: 5 * 60_000,
});

/**
 * Runtime validation at the provider-neutral boundary.  Provider adapters
 * retain their stricter file/config checks, but no adapter may spawn for an
 * unrecognised discriminator, unsafe local target, or nonsensical retry
 * policy.
 */
export function validateTunnelStartInput(input: TunnelStartInput): void {
  if (!input || typeof input !== "object") throw new Error("TUNNEL_PROVIDER_CONFIG_INVALID");
  const config = input?.config as unknown as Record<string, unknown>;
  if (!config || Array.isArray(config) || config.provider !== "cloudflared" || config.mode !== "named-credentials") throw new Error("TUNNEL_PROVIDER_CONFIG_INVALID");
  const expected = new Set(["provider", "mode", "executable", "tunnelId", "hostname", "credentials"]);
  if (Object.keys(config).some((key) => !expected.has(key))) throw new Error("TUNNEL_PROVIDER_CONFIG_INVALID");
  if (![config.executable, config.tunnelId, config.hostname].every((value) => typeof value === "string" && value.length > 0)) throw new Error("TUNNEL_PROVIDER_CONFIG_INVALID");
  const credentials = config.credentials as Record<string, unknown>;
  if (!credentials || Array.isArray(credentials) || Object.keys(credentials).length !== 1 || typeof credentials.path !== "string" || !credentials.path) throw new Error("TUNNEL_PROVIDER_CONFIG_INVALID");
  const target = input.target as unknown as Record<string, unknown>;
  if (!target || Array.isArray(target) || typeof target.endpoint !== "string" || typeof target.hostname !== "string") throw new Error("TUNNEL_TARGET_INVALID");

  let endpoint: URL;
  let hostname: URL;
  try { endpoint = new URL(target.endpoint); hostname = new URL(`https://${target.hostname}`); }
  catch { throw new Error("TUNNEL_TARGET_INVALID"); }
  if (endpoint.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(endpoint.hostname) || !endpoint.port || endpoint.username || endpoint.password || endpoint.pathname !== "/mcp" || endpoint.search || endpoint.hash) throw new Error("TUNNEL_TARGET_INVALID");
  if (hostname.protocol !== "https:" || hostname.hostname !== target.hostname.toLowerCase() || hostname.username || hostname.password || hostname.port || hostname.pathname !== "/" || hostname.search || hostname.hash || target.hostname.includes("*") || isIP(hostname.hostname) !== 0) throw new Error("TUNNEL_TARGET_INVALID");

  const policy = { ...DEFAULT_TUNNEL_RESTART_POLICY, ...input.restartPolicy };
  if (!Object.values(policy).every((value) => Number.isSafeInteger(value) && value >= 0) || policy.maxRestarts > 10 || policy.baseDelayMs > policy.maxDelayMs || policy.stableResetMs < 1) throw new Error("TUNNEL_RESTART_POLICY_INVALID");
}

export interface TunnelStatus {
  readonly state: TunnelState;
  readonly provider: string;
  readonly attempt: number;
  readonly changedAt: string;
  readonly publicEndpoint?: string;
  readonly pid?: number;
  readonly providerVersion?: string;
  readonly code?: string;
  readonly projectFingerprint?: string;
  readonly authGeneration?: string;
}

export interface TunnelDoctorCheck {
  readonly id: string;
  readonly ok: boolean;
  readonly code?: string;
}

export interface TunnelDoctorResult {
  readonly provider: string;
  readonly ok: boolean;
  readonly checks: readonly TunnelDoctorCheck[];
}

export type TunnelEvent =
  | { readonly kind: "transition"; readonly status: TunnelStatus }
  | { readonly kind: "diagnostic"; readonly provider: string; readonly code: string }
  | { readonly kind: "process-exit"; readonly provider: string; readonly code: number | null; readonly signal: NodeJS.Signals | null };

/** The minimal lifecycle surface remote-host owns; providers never receive bearer material. */
export interface TunnelProcess {
  readonly pid?: number;
  readonly exited: Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
  /**
   * Optional, provider-owned readiness check.  The orchestrator uses this
   * only after an initial successful start; it never substitutes log output
   * or a public request for the provider's local health signal.
   */
  readonly checkReadiness?: () => Promise<void>;
  stop(): Promise<void>;
}

export interface TunnelAdapter {
  doctor(): Promise<TunnelDoctorResult>;
  start(target: TunnelTarget): Promise<TunnelProcess>;
  getStatus(): TunnelStatus;
  stop(): Promise<void>;
  getDiagnostics(): readonly TunnelLogEvent[];
  subscribe?(listener: (status: TunnelStatus) => void): () => void;
}

export interface TunnelLogEvent {
  readonly provider: string;
  readonly level: "debug" | "info" | "warn" | "error";
  readonly code: string;
  readonly count: number;
  readonly message: string;
}
