/** Provider-neutral input for a process which forwards one public hostname to Kanmer's loopback HTTP listener. */
export type TunnelState = "stopped" | "validating" | "starting" | "connected" | "degraded" | "stopping" | "failed";

export interface TunnelTarget {
  readonly endpoint: string;
  readonly hostname: string;
  readonly projectFingerprint?: string;
  readonly authGeneration?: string;
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
}

export type TunnelEvent =
  | { readonly kind: "transition"; readonly status: TunnelStatus }
  | { readonly kind: "diagnostic"; readonly provider: string; readonly code: string }
  | { readonly kind: "process-exit"; readonly provider: string; readonly code: number | null; readonly signal: NodeJS.Signals | null };

/** The minimal lifecycle surface remote-host owns; providers never receive bearer material. */
export interface TunnelProcess {
  readonly pid?: number;
  readonly exited: Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
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
