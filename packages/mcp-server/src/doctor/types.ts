import type { TunnelStatus } from "../tunnels/types.js";

export const DOCTOR_MODES = ["config", "local", "public"] as const;
export type DoctorMode = (typeof DOCTOR_MODES)[number];
export const DOCTOR_STATUSES = ["pass", "warn", "fail", "skipped"] as const;
export type DoctorStatus = (typeof DOCTOR_STATUSES)[number];
export const DOCTOR_SEVERITIES = ["required", "warning", "info"] as const;
export type DoctorSeverity = (typeof DOCTOR_SEVERITIES)[number];

export const DOCTOR_CHECK_IDS = [
  "PROJECT_CONFIG_VALID", "REMOTE_CONFIG_VALID", "SECRET_REFERENCE_VALID", "TUNNEL_EXECUTABLE_VALID", "TUNNEL_CONFIG_VALID",
  "LOCAL_STATUS_READY", "LOCAL_BIND_LOOPBACK", "AUTH_MISSING_REJECTED", "AUTH_WRONG_REJECTED", "AUTH_VALID_ACCEPTED",
  "MCP_INITIALIZE_LOCAL", "PROJECT_FINGERPRINT_LOCAL", "REMOTE_TOOL_POLICY_LOCAL", "SESSION_CLOSE_LOCAL", "TUNNEL_PROCESS_READY",
  "PUBLIC_DNS_RESOLVES", "PUBLIC_TLS_VALID", "PUBLIC_ROUTE_NO_REDIRECT", "AUTH_MISSING_PUBLIC_REJECTED", "MCP_INITIALIZE_PUBLIC",
  "PROJECT_FINGERPRINT_PUBLIC", "REMOTE_TOOL_POLICY_PUBLIC", "SESSION_CLOSE_PUBLIC", "LOCAL_PUBLIC_CONSISTENT", "DIAGNOSTIC_REDACTION", "NO_BOARD_MUTATION",
] as const;
export type DoctorCheckId = (typeof DOCTOR_CHECK_IDS)[number];

export interface DoctorRepair { readonly code: string; readonly actions: readonly string[]; readonly section?: string; }
export interface DoctorSafeDetails { readonly expected?: string; readonly observed?: string; readonly reason?: string; readonly durationMs?: number; readonly [key: string]: string | number | boolean | undefined; }
export interface DoctorCheckResult {
  readonly id: DoctorCheckId;
  readonly mode: DoctorMode;
  readonly status: DoctorStatus;
  readonly severity: DoctorSeverity;
  readonly details?: DoctorSafeDetails;
  readonly repair?: DoctorRepair;
  readonly prerequisites?: readonly DoctorCheckId[];
}
export interface DoctorReport {
  readonly schemaVersion: 1;
  readonly mode: DoctorMode;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly status: "pass" | "warn" | "fail";
  readonly exitCode: 0 | 1 | 2;
  readonly checks: readonly DoctorCheckResult[];
  readonly counts: { readonly pass: number; readonly warn: number; readonly fail: number; readonly skipped: number };
  readonly cleanupErrors?: readonly string[];
}

export interface DoctorTunnelConfig {
  readonly executable?: string;
  readonly tunnelId?: string;
  readonly hostname?: string;
  readonly credentialsFile?: string;
  readonly endpoint?: string;
}

export interface DoctorConfig {
  readonly projectRoot?: string;
  readonly expectedProject?: string;
  readonly remoteHostname?: string;
  readonly tunnel?: DoctorTunnelConfig;
  readonly secretReference?: string;
  readonly localEndpoint?: string;
  readonly expectedTools?: readonly string[];
  readonly expectedAuthGeneration?: string;
}

export interface DoctorCheckContext {
  readonly mode: DoctorMode;
  readonly config: DoctorConfig;
  readonly now: () => number;
  readonly signal?: AbortSignal;
}

export interface DoctorDependencies {
  /** Injected per-check seams keep normal runs local and deterministic in tests. */
  readonly checks?: Partial<Record<DoctorCheckId, (context: DoctorCheckContext) => Promise<DoctorCheckResult | DoctorSafeDetails | void>>>;
  readonly tunnelStatus?: () => Promise<TunnelStatus>;
  readonly resolveProject?: () => Promise<{ readonly fingerprint: string; readonly boardRoot?: string; readonly format?: number }>;
  readonly validateSecretReference?: () => Promise<{ readonly valid: boolean; readonly reason?: string }>;
  readonly validateRemoteConfig?: () => Promise<{ readonly valid: boolean; readonly reason?: string }>;
  readonly localStatus?: () => Promise<{
    readonly state?: string;
    readonly host?: string;
    readonly port?: number;
    readonly endpoint?: string;
    readonly projectFingerprint?: string;
    readonly authRequired?: boolean;
    readonly authGeneration?: string;
    readonly tools?: readonly string[];
    readonly protocolVersion?: string;
  }>;
  readonly resolveDns?: (hostname: string, signal?: AbortSignal) => Promise<readonly string[]>;
  readonly tls?: (request: { readonly hostname: string; readonly port: number; readonly signal?: AbortSignal }) => Promise<{ readonly protocol?: string; readonly issuer?: string; readonly sanMatch: boolean; readonly valid: boolean; readonly expiresAt?: string }>;
  readonly probe?: (request: { readonly endpoint: string; readonly authorization?: string; readonly followRedirects?: boolean; readonly signal?: AbortSignal }) => Promise<{ readonly status: number; readonly location?: string; readonly challenge?: string; readonly contentType?: string }>;
  readonly mcp?: (request: { readonly endpoint: string; readonly token: string; readonly signal?: AbortSignal }) => Promise<{ readonly projectFingerprint?: string; readonly tools: readonly string[]; readonly protocolVersion?: string; close(): Promise<void> }>;
  readonly token?: (signal?: AbortSignal) => Promise<string>;
  readonly expectedTools?: () => Promise<readonly string[]>;
  readonly canonicalTools?: () => Promise<readonly string[]>;
  readonly registerCleanup?: (cleanup: () => Promise<void> | void) => void;
}

export interface DoctorOptions {
  readonly mode: DoctorMode;
  readonly config?: DoctorConfig;
  readonly dependencies?: DoctorDependencies;
  readonly now?: () => number;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly totalTimeoutMs?: number;
}
