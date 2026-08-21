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

export interface TunnelStatus {
  readonly state: TunnelState;
  readonly provider: string;
  readonly attempt: number;
  readonly changedAt: string;
  readonly publicEndpoint?: string;
  readonly pid?: number;
  readonly code?: string;
  readonly projectFingerprint?: string;
  readonly authGeneration?: string;
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
  start(target: TunnelTarget): Promise<TunnelProcess>;
}

export interface TunnelLogEvent {
  readonly provider: string;
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
}
