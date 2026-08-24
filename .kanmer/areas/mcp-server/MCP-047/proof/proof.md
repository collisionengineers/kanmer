# Proof — MCP-047

## Merged artifact

- Pull request: #232, merged to `main` as `f5401043e7dfdcbb25b7f4a91d87914e96c8254f`.
- GitHub Actions run `32721382841`: `kanmer-gate` PASS (54s); `verify` PASS (3m14s).

## Merged-main automated verification

Run from the detached merged-main worktree at `f5401043`:

- `npm run build -w @kanmer/mcp-server` — PASS, exit 0.
- `node --test src/tunnels/cloudflared-config.test.mjs src/tunnels/cloudflared-validate.test.mjs src/tunnels/cloudflared.test.mjs` — PASS, 17/17.
- `npm run typecheck -w @kanmer/mcp-server` — PASS, exit 0.

## Real Cloudflare named-tunnel verification

- Used installed `cloudflared` 2026.8.2 and a newly created, disposable **locally managed credentials-mode** named tunnel with a temporary subdomain under the user-approved zone. No persistent tunnel, account setting, bearer, or existing DNS record was changed.
- The merged artifact generated the configuration with the public hostname routed to an origin-only loopback service; the public `/mcp` path was preserved by Cloudflare. The adapter's real CLI ingress validation completed before the owned child started.
- Cloudflare's documented `http2` transport fallback was required in this network after the initial auto-transport attempt ended at the adapter's 10-second readiness bound. That initial timeout is recorded as an environment observation, **not** counted as a pass.
- With the same merged generated configuration and the documented fallback, Cloudflare reported 4 ready connector connections. A public unauthenticated POST to `/mcp` returned **401** with a bearer challenge, proving the request reached Kanmer's authenticated MCP origin without embedding `/mcp` in the origin service.
- The local authenticated origin and owned connector were stopped. The temporary DNS record was removed through the Cloudflare API; the named tunnel was deleted; its generated local credential was absent afterward; and both temporary operator directories were confirmed removed. Follow-up checks found 0 DNS records for the temporary hostname and no remaining tunnel.

All provider identifiers, hostname, credentials, and bearer material are intentionally omitted.

## Closeout

- Verified from merged `main` on 2026-08-24.
- PR #232: merged; merge commit `f5401043e7dfdcbb25b7f4a91d87914e96c8254f`.
- Ticket branch and worktree are released only after the checks above and repository reachability confirmation.
