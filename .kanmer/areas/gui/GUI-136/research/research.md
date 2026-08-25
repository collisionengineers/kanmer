# Research — GUI-136

## Question

Why can the packaged GUI report a connected Cloudflare process while its public doctor says the local host is absent?

## Findings

1. `KanmerRemoteHost.start()` starts an authenticated loopback HTTP host, but returns only the public URL (`https://<hostname>/mcp`). Source: `packages/mcp-server/src/remote-host.ts`.
2. `remote-cli.ts` copies that returned public URL into the `kanmer-mcp-remote-ready.endpoint` field. Source: `packages/mcp-server/src/remote-cli.ts`.
3. The GUI manager deliberately accepts that ready-event field only when `isCanonicalLocalEndpoint(endpoint)` is true. It therefore discards the public URL. Provider status can still transition the GUI to `ready`, leaving `record.status.endpoint` null. Source: `apps/gui/src/main/remoteAccess/manager.ts`.
4. Public-mode doctor receives `KANMER_LOCAL_ENDPOINT` from that null field. Its local-host and tunnel-config checks then fail/skip even though cloudflared is connected. The installed exact-merge reproduction showed `LOCAL_STATUS_READY` and `TUNNEL_PROCESS_READY` failing for this reason.
5. A direct diagnostic launch of the same packaged `remote-cli.cjs`, with the same protected token and named-tunnel configuration, reached its ready event. Cloudflare credentials and the executable are therefore not the cause.
6. No declared project sources apply to this ticket.

## Implication

The child protocol needs two explicit meanings: preserve the existing public `endpoint` return for callers, add the authenticated `localEndpoint`, and have `remote-cli` send the local value in the GUI-consumed ready event. Tests must prevent another public/local endpoint conflation.
