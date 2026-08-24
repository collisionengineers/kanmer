import type { TunnelTarget } from "./types.js";
import { isIP } from "node:net";

export interface CloudflaredTunnelOptions {
  readonly tunnelId: string;
  readonly credentialsFile: string;
  readonly hostname: string;
}

const tunnelId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const control = /[\u0000-\u001f\u007f]/;

function exactHostname(value: string): string {
  if (control.test(value)) throw new Error("TUNNEL_HOSTNAME_INVALID");
  let parsed: URL;
  try { parsed = new URL(`https://${value}`); } catch { throw new Error("TUNNEL_HOSTNAME_INVALID"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.hostname !== value.toLowerCase() || value.includes("*") || !value.includes(".") || isIP(parsed.hostname.replace(/^\[|\]$/g, "")) !== 0) {
    throw new Error("TUNNEL_HOSTNAME_INVALID");
  }
  return parsed.hostname;
}

function loopbackEndpoint(value: string): string {
  if (control.test(value)) throw new Error("TUNNEL_ORIGIN_INVALID");
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("TUNNEL_ORIGIN_INVALID"); }
  if (parsed.protocol !== "http:" || (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "[::1]") || !parsed.port || parsed.username || parsed.password || parsed.pathname !== "/mcp" || parsed.search || parsed.hash) {
    throw new Error("TUNNEL_ORIGIN_INVALID");
  }
  return parsed.toString().replace(/\/$/, "");
}

/** Validate a named Cloudflare tunnel without inspecting its credential contents. */
export function validateCloudflaredTunnel(options: CloudflaredTunnelOptions, target: TunnelTarget): { readonly hostname: string; readonly endpoint: string } {
  if (!tunnelId.test(options.tunnelId)) throw new Error("TUNNEL_ID_INVALID");
  if (!options.credentialsFile || control.test(options.credentialsFile)) throw new Error("TUNNEL_CREDENTIALS_PATH_INVALID");
  const hostname = exactHostname(options.hostname);
  if (hostname !== exactHostname(target.hostname)) throw new Error("TUNNEL_HOSTNAME_MISMATCH");
  return { hostname, endpoint: loopbackEndpoint(target.endpoint) };
}

/**
 * Render the provider config rather than accepting free-form YAML.  This keeps
 * every request bound to one exact host and leaves unmatched traffic closed.
 */
export function cloudflaredConfig(options: CloudflaredTunnelOptions, target: TunnelTarget): string {
  const valid = validateCloudflaredTunnel(options, target);
  // cloudflared preserves the path from the public request when forwarding to
  // an HTTP origin.  The endpoint remains strictly `/mcp`, but the provider
  // service must name only the loopback origin: cloudflared rejects an origin
  // URL that embeds its own path.
  const serviceOrigin = new URL(valid.endpoint).origin;
  return [
    `tunnel: ${options.tunnelId}`,
    `credentials-file: ${JSON.stringify(options.credentialsFile)}`,
    "ingress:",
    `  - hostname: ${valid.hostname}`,
    `    service: ${serviceOrigin}`,
    "  - service: http_status:404",
    "",
  ].join("\n");
}
