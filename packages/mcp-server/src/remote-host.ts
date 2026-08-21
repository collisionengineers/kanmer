import { createKanmerHttpHost, type HttpAuthorizer, type KanmerHttpHost } from "./http.js";
import { TunnelSupervisor } from "./tunnels/supervisor.js";
import type { TunnelAdapter } from "./tunnels/types.js";

export interface RemoteHostOptions {
  readonly authorizer: HttpAuthorizer;
  readonly hostname: string;
  readonly tunnel: TunnelAdapter;
}

/** Composes bearer-protected loopback HTTP with a provider-neutral tunnel. */
export class KanmerRemoteHost {
  private readonly http: KanmerHttpHost;
  private readonly supervisor: TunnelSupervisor;
  private readonly publicEndpoint: string;
  private ready?: Awaited<ReturnType<KanmerHttpHost["start"]>>;

  constructor(options: RemoteHostOptions) {
    this.publicEndpoint = `https://${options.hostname}/mcp`;
    this.http = createKanmerHttpHost({ authorizer: options.authorizer });
    this.supervisor = new TunnelSupervisor({
      start: async () => {
        this.ready ??= await this.http.start();
        return options.tunnel.start({ endpoint: this.ready.endpoint, hostname: options.hostname });
      },
      onState: (state) => { if (state === "failed") void this.http.close(); },
    });
  }

  async start(): Promise<{ readonly endpoint: string }> {
    await this.supervisor.start();
    return { endpoint: this.publicEndpoint };
  }
  async close(): Promise<void> { await this.supervisor.stop(); await this.http.close(); }
}

export function createKanmerRemoteHost(options: RemoteHostOptions): KanmerRemoteHost {
  return new KanmerRemoteHost(options);
}
