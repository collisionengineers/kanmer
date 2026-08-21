Cloudflared is the first supported tunnel adapter. This appendix covers a locally managed named Cloudflare Tunnel whose credential file and stable hostname are provisioned by the operator outside Kanmer. Kanmer starts an already installed executable, forwards one exact loopback MCP origin, and reports bounded health; it does not create provider resources.

## Supported named-tunnel mode

Provide an absolute `cloudflared` executable, a UUID-shaped tunnel id, a protected credentials-file reference, and one exact public hostname. The generated route maps that hostname to the local authenticated `/mcp` origin and ends with a terminal not-found rule. The child runs without shell interpolation and without automatic updates. Readiness and metrics remain local and bounded. The credentials file is validated before start and is never copied into project data or diagnostics.

## Operator provisioning

Install the supported executable using the provider's normal distribution channel and verify its version yourself. Create the named tunnel, credential file, and DNS record through the provider's operator workflow. Enter only the references and values in Kanmer's Cloudflare Tunnel fields. Account identifiers, credential JSON, real hostnames, and provider tokens do not belong in a manual, ticket, or proof.

## Start, readiness and replacement

Save the exact fields, create a Kanmer bearer, and run the config and local doctor checks before starting. Kanmer performs an authenticated local initialize and session close before spawning the provider. A provider readiness failure leaves the local diagnostics surface available and reports the provider as failed or degraded. Stop before changing the tunnel id, credential reference, executable, or hostname. Replace an executable or credential through the operator process, validate it, and rerun doctor before restarting.

## Public verification and rollback

Public doctor mode checks DNS, certificate, redirects, bearer rejection, MCP initialize, fingerprint, tool policy, session close, and local/public consistency. Local readiness is not public verification. If a replacement fails, stop the child, restore the last known-good operator-managed executable or credential reference, and rerun config/local doctor. Do not roll back by weakening TLS or widening the route.

## Boundaries

Cloudflare Access does not replace the Kanmer bearer. Kanmer does not automate account or DNS changes, create or delete tunnels, download or update the executable, accept remote-managed tunnel-token mode, use Quick Tunnels as production infrastructure, or host Kanmer in a Worker. A disposable Worker can be an external integration client for a separately recorded acceptance proof; it is never a Kanmer server or proxy.
