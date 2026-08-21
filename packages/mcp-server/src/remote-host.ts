import { createKanmerHttpHost, type HttpAuthorizer, type KanmerHttpHost } from "./http.js";
import { TunnelSupervisor } from "./tunnels/supervisor.js";
import type { TunnelAdapter } from "./tunnels/types.js";

export interface RemoteHostOptions {
  readonly authorizer: HttpAuthorizer;
  readonly hostname: string;
  readonly tunnel: TunnelAdapter;
  readonly onStatus?: (status: RemoteHostStatus) => void;
}

export interface RemoteHostStatus {
  readonly local: "stopped" | "starting" | "ready" | "stopping";
  readonly provider: "stopped" | "starting" | "running" | "restarting" | "failed";
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

  constructor(private readonly options: RemoteHostOptions) {
    this.publicEndpoint = `https://${options.hostname}/mcp`;
    this.http = createKanmerHttpHost({ authorizer: options.authorizer });
    this.supervisor = new TunnelSupervisor({
      start: async () => {
        this.status = { ...this.status, local: "starting" }; this.emit();
        this.ready ??= await this.http.start();
        this.status = { ...this.status, local: "ready" }; this.emit();
        return options.tunnel.start({ endpoint: this.ready.endpoint, hostname: options.hostname, projectFingerprint: this.ready.projectFingerprint });
      },
      onState: (state) => {
        const provider: RemoteHostStatus["provider"] = state === "stopped" ? "stopped" : state === "starting" ? "starting" : state;
        this.status = { ...this.status, provider }; this.emit();
      },
    });
  }

  private emit(): void { this.options.onStatus?.({ ...this.status }); }

  async start(): Promise<{ readonly endpoint: string }> {
    await this.supervisor.start();
    this.status = { ...this.status, endpoint: this.publicEndpoint }; this.emit();
    return { endpoint: this.publicEndpoint };
  }
  getStatus(): RemoteHostStatus { return { ...this.status }; }
  async close(): Promise<void> {
    this.status = { ...this.status, local: "stopping" }; this.emit();
    await this.supervisor.stop(); await this.http.close();
    this.status = { ...this.status, local: "stopped", provider: "stopped" }; this.emit();
  }
}

export function createKanmerRemoteHost(options: RemoteHostOptions): KanmerRemoteHost {
  return new KanmerRemoteHost(options);
}
