import { createKanmerHttpHost, type HttpAuthorizer, type HttpReadyEvent, type KanmerHttpHost } from "./http.js";
import { TunnelSupervisor } from "./tunnels/supervisor.js";
import type { TunnelAdapter, TunnelProcess } from "./tunnels/types.js";

export interface RemoteHostOptions {
  readonly authorizer: HttpAuthorizer;
  readonly hostname: string;
  readonly tunnel: TunnelAdapter;
  /** Doctor/GUI may perform an authenticated MCP initialize before forwarding. */
  readonly verifyLocal: (ready: HttpReadyEvent) => Promise<void>;
  /** Opaque auth-rotation generation; never bearer material. */
  readonly authGeneration?: () => string | undefined;
  /** Kept low-frequency in production; injectable for deterministic tests. */
  readonly healthPollMs?: number;
  /** Test seam for the provider-owned readiness monitor. */
  readonly scheduleHealthPoll?: (poll: () => Promise<void>, intervalMs: number) => () => void;
  readonly onStatus?: (status: RemoteHostStatus) => void;
}

export interface RemoteHostStatus {
  readonly local: "stopped" | "starting" | "ready" | "stopping";
  readonly provider: "stopped" | "starting" | "running" | "restarting" | "degraded" | "failed";
  readonly publicVerification: "unknown";
  readonly endpoint?: string;
  readonly reason?: string;
}

/** Composes bearer-protected loopback HTTP with a provider-neutral tunnel. */
export class KanmerRemoteHost {
  private readonly http: KanmerHttpHost;
  private readonly supervisor: TunnelSupervisor;
  private readonly publicEndpoint: string;
  private ready?: Awaited<ReturnType<KanmerHttpHost["start"]>>;
  private status: RemoteHostStatus = { local: "stopped", provider: "stopped", publicVerification: "unknown" };
  private cancelHealthPoll?: () => void;
  private monitoredProcess?: TunnelProcess;
  private stopped = false;

  constructor(private readonly options: RemoteHostOptions) {
    this.publicEndpoint = `https://${options.hostname}/mcp`;
    this.http = createKanmerHttpHost({ authorizer: options.authorizer });
    this.supervisor = new TunnelSupervisor({
      start: async () => {
        this.status = { ...this.status, local: "starting" }; this.emit();
        this.ready ??= await this.http.start();
        if (!this.ready.authRequired || !/^kanmer-proj-v1:[a-f0-9]{64}$/.test(this.ready.projectFingerprint)) throw new Error("TUNNEL_LOCAL_READY_INVALID");
        this.status = { ...this.status, local: "ready" }; this.emit();
        await options.verifyLocal(this.ready);
        const authGeneration = options.authGeneration?.();
        if (authGeneration && !/^sha256:[a-f0-9]{12}$/.test(authGeneration)) throw new Error("TUNNEL_AUTH_GENERATION_INVALID");
        const process = await options.tunnel.start({
          endpoint: this.ready.endpoint,
          hostname: options.hostname,
          projectFingerprint: this.ready.projectFingerprint,
          ...(authGeneration ? { authGeneration } : {}),
        });
        this.monitorHealth(process);
        return process;
      },
      onState: (state) => {
        const provider: RemoteHostStatus["provider"] = state === "stopped" ? "stopped" : state === "starting" ? "starting" : state;
        if (provider === "stopped" || provider === "failed") this.stopHealthMonitor();
        this.status = { ...this.status, provider }; this.emit();
      },
    });
  }

  private emit(): void { this.options.onStatus?.({ ...this.status }); }

  private stopHealthMonitor(): void {
    this.cancelHealthPoll?.();
    this.cancelHealthPoll = undefined;
    this.monitoredProcess = undefined;
  }

  private monitorHealth(process: TunnelProcess): void {
    if (!process.checkReadiness) return;
    this.stopHealthMonitor();
    this.monitoredProcess = process;
    const interval = this.options.healthPollMs ?? 30_000;
    if (!Number.isSafeInteger(interval) || interval < 1) throw new Error("TUNNEL_HEALTH_POLL_INTERVAL_INVALID");
    const check = async () => {
      if (this.stopped || this.monitoredProcess !== process) return;
      try {
        await process.checkReadiness?.();
        if (!this.stopped && this.monitoredProcess === process && this.status.provider === "degraded") {
          this.status = { ...this.status, provider: "running" };
          this.emit();
        }
      } catch {
        if (!this.stopped && this.monitoredProcess === process && this.status.provider === "running") {
          this.status = { ...this.status, provider: "degraded" };
          this.emit();
        }
      }
    };
    this.cancelHealthPoll = this.options.scheduleHealthPoll?.(check, interval) ?? (() => {
      const timer = setInterval(() => void check(), interval);
      timer.unref();
      return () => clearInterval(timer);
    })();
  }

  async start(): Promise<{ readonly endpoint: string }> {
    if (this.stopped) throw new Error("REMOTE_HOST_STOPPED");
    await this.supervisor.start();
    this.status = { ...this.status, endpoint: this.publicEndpoint }; this.emit();
    return { endpoint: this.publicEndpoint };
  }
  getStatus(): RemoteHostStatus { return { ...this.status }; }

  /**
   * Local lifecycle owners call this when the origin, project fingerprint, or
   * bearer generation changes.  It never attempts to retarget a live tunnel.
   */
  async invalidateOrigin(): Promise<void> {
    if (this.stopped) return;
    this.stopHealthMonitor();
    await this.supervisor.stop();
    this.status = { ...this.status, provider: "failed", reason: "TUNNEL_ORIGIN_INVALIDATED" };
    this.emit();
  }

  async close(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.stopHealthMonitor();
    this.status = { ...this.status, local: "stopping" }; this.emit();
    // The public forwarding process must never retain a live origin after the
    // authenticated listener has been retired.  The FRD orders listener and
    // session shutdown ahead of tunnel-child shutdown.
    try { await this.http.close(); }
    finally { await this.supervisor.stop(); }
    // A final stopped snapshot must not make a past invalidation look current.
    // Keep the public endpoint for a caller that needs to display what stopped,
    // but replace transient lifecycle state rather than spreading it forward.
    this.status = this.status.endpoint
      ? { local: "stopped", provider: "stopped", publicVerification: "unknown", endpoint: this.status.endpoint }
      : { local: "stopped", provider: "stopped", publicVerification: "unknown" };
    this.emit();
  }
}

export function createKanmerRemoteHost(options: RemoteHostOptions): KanmerRemoteHost {
  return new KanmerRemoteHost(options);
}
