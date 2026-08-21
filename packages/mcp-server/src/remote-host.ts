import { createKanmerHttpHost, type HttpAuthorizer, type KanmerHttpHost } from "./http.js";
import { TunnelSupervisor } from "./tunnels/supervisor.js";
import type { TunnelAdapter, TunnelProcess } from "./tunnels/types.js";

export interface RemoteHostOptions {
  readonly authorizer: HttpAuthorizer;
  readonly hostname: string;
  readonly tunnel: TunnelAdapter;
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
        this.status = { ...this.status, local: "ready" }; this.emit();
        const process = await options.tunnel.start({ endpoint: this.ready.endpoint, hostname: options.hostname, projectFingerprint: this.ready.projectFingerprint });
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
  async close(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.stopHealthMonitor();
    this.status = { ...this.status, local: "stopping" }; this.emit();
    await this.supervisor.stop(); await this.http.close();
    this.status = { ...this.status, local: "stopped", provider: "stopped" }; this.emit();
  }
}

export function createKanmerRemoteHost(options: RemoteHostOptions): KanmerRemoteHost {
  return new KanmerRemoteHost(options);
}
