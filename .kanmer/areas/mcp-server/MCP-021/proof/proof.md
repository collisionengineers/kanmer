# Proof — MCP-021

## Verified merge

- PR: #113 — https://github.com/collisionengineers/kanmer/pull/113
- Independent re-review: PASS at `f6c7d196c8a317f999850a4e0df40a5a5c32880a`; reviewer merged the PR.
- Merged main commit: `89f050f4e6efcb59fa11c0e67b2fa452db648cd4` (2026-08-21).
- Verification was run from the normal main checkout at that merged commit. The implementation worktree was not used as proof.

## Passed merged-main evidence

| Command | Result |
|---|---|
| `npm run build` | PASS: core and MCP ESM/standalone artifacts built. |
| `npm run plugin:check` | PASS: 30 tools match, bundle bytes match, 12 skill frontmatters parse, manifests v0.3.3, isolated handshake lists 30 tools. |
| `npm run typecheck` | PASS: core, MCP server, UI, and GUI workspaces. |
| `npm test` | PASS: manual current; core **256/256**, GUI **318/318**, MCP HTTP/tunnel **52/52**, scripts **66/66**. |
| `node packages/mcp-server/src/smoke-remote.mjs` | PASS: fake provider, no public route. |
| `npm run smoke:protocol` | PASS: **42/42** across supported protocol versions. |
| `node packages/mcp-server/src/smoke-discovery.mjs` | PASS: **13/13** discovery cases. |
| `git diff --check` | PASS. |
| `git status --short` | Only the pre-existing untracked `skills-lock.json`; no generated tunnel/runtime residue. |

## Security and scope confirmation

- The adapter accepts only the provider-neutral loopback HTTP `/mcp` origin and one canonical HTTPS hostname; bracketed IPv6/IP literals, wildcard routes, non-loopback origins, and unsafe provider modes are rejected before spawn.
- Cloudflared uses operator-provisioned protected named credentials, exact-host ingress plus terminal 404 catch-all, loopback metrics/readiness, direct `shell:false` process ownership, bounded redacted diagnostics, bounded restart/terminal-exit handling, idempotent cleanup, and explicit-port collision ownership.
- Remote-host composition performs the required authenticated local MCP verification before provider spawn, never passes bearer material to the adapter, keeps public verification unverified, and shuts down the authenticated listener before the tunnel child.
- No Cloudflare account, DNS record, public tunnel, public acceptance request, Quick Tunnel, Access, remote-managed token mode, Worker-hosted service, or executable packaging was used; public proof remains MCP-028 scope.
- No core/domain/tool/stdio/plugin source changed; `plugin:check` passed on normal main.

## Review finding disposition

The independent review’s four blockers were fixed and re-reviewed: bracketed IPv6 rejection, explicit metrics-port reservation, terminal exit-78 classification, and adapter readiness degradation/recovery. The stale intermediate evidence counts were reconciled in the post-implementation report and checklist.
