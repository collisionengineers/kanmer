# Research — MCP-049: remote runtime reconciliation

## Question

Determine whether the stalled OpenAI and Cloudflare paths require new Kanmer code, or whether the shipped runtimes are correct but operationally unconfigured, and identify the shortest safe route to durable healthy connectors.

## Findings

- Official OpenAI Secure MCP Tunnel documentation requires a tunnel id, a separate runtime API key, and a reachable stdio or HTTP MCP target. It recommends `tunnel-client runtimes connect` for a long-lived local runtime and requires a healthy running client for discovery/calls: https://developers.openai.com/api/docs/guides/secure-mcp-tunnels.
- Infisical already contains a dedicated Kanmer/OpenAI tunnel runtime key. Both local profiles use environment references rather than embedded credentials; the key material is not missing from the approved secret store.
- The original `kanmer-local` profile targets an older tunnel. With the Infisical secret explicitly mapped to its expected environment name, `doctor --explain` passes, proving the key and installed MCP command are valid, but this is not the tunnel the operator selected for closeout.
- The selected `kanmer-local-2` profile uses the requested new tunnel and directly references the Infisical secret name. Under `infisical run`, doctor passes every required check. However, its MCP command points at temporary evidence directories that no longer exist, so it is stale despite the shallow executable preflight passing.
- No native tunnel runtime aliases exist (`runtimes list --json` returned an empty alias list). The OpenAI clog is therefore configuration plus supervision, not an MCP implementation defect.
- Cloudflare API inventory (with Infisical injection and redacted output) shows the intended `kanmer-local` named tunnel is down with zero connections, while an unrelated pre-existing `kanmer` tunnel is healthy with four connections. The public DNS name points to the down `kanmer-local` tunnel.
- The local Cloudflare login is valid and produced both `cert.pem` and the intended tunnel credential JSON. The downloaded tunnel-client package also contains a usable `cloudflared.exe`.
- Kanmer GUI remote-access state knows this project but has no Cloudflare config. The shipped `RemoteAccessManager` already provides secret generation/storage, bounded doctor checks, process ownership, autostart, and cloudflared supervision. Reimplementing those capabilities would duplicate existing production code.
- Cloudflare’s current documentation confirms that a locally managed tunnel needs its credential file, local ingress configuration, and a running `cloudflared tunnel --config ... run` process; a created tunnel alone has no active connection: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/.
- GUI-133’s installed stable launcher now proves the packaged MCP runtime can survive replacement. The OpenAI profile should target the stable launcher rather than temporary evidence roots or a version-coupled direct bundle path.

## Implications

This ticket should not add a new tunnel abstraction or background service. Reconcile one canonical OpenAI profile to the real board/repository and stable installed launcher, start it through the tunnel client’s native runtime supervisor under Infisical injection, then configure the already-shipped Kanmer Cloudflare manager with the existing executable/credential/hostname and its own generated bearer. Verify both independently. Retire or clearly leave unused the stale duplicate profile so operators cannot accidentally start the wrong tunnel.

The exact tunnel ids, credentials, runtime key, generated Kanmer bearer, and provider account identifiers remain operational secret/private state and must not be copied into source, ticket documents, or proof.

## Open questions

- None. The operator already selected the new OpenAI tunnel and `rivetandrelay.co.uk`; the existing Kanmer and tunnel-client supervisors define the implementation route.
