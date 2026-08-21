const LOOPBACK = new Set(["127.0.0.1", "[::1]"]);

export interface ReadinessOptions {
  readonly endpoint: string;
  readonly timeoutMs?: number;
  readonly pollMs?: number;
  readonly fetchImpl?: typeof fetch;
}

/** Obtain a currently free loopback TCP port without ever binding publicly. */
export async function allocateLoopbackPort(): Promise<number> {
  const server = createServer();
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string" || address.address !== "127.0.0.1" || !address.port) throw new Error("TUNNEL_METRICS_PORT_ALLOCATION_FAILED");
    return address.port;
  } finally {
    if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function assertLoopbackReadyEndpoint(value: string): URL {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("TUNNEL_READINESS_ENDPOINT_INVALID"); }
  if (parsed.protocol !== "http:" || !LOOPBACK.has(parsed.hostname) || !parsed.port || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/ready") {
    throw new Error("TUNNEL_READINESS_ENDPOINT_INVALID");
  }
  return parsed;
}

/** Poll Cloudflare's local readiness endpoint; child output is never readiness evidence. */
export async function waitForTunnelReadiness(options: ReadinessOptions): Promise<void> {
  const endpoint = assertLoopbackReadyEndpoint(options.endpoint);
  const timeoutMs = options.timeoutMs ?? 10_000;
  const pollMs = options.pollMs ?? 100;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || !Number.isSafeInteger(pollMs) || pollMs < 1) throw new Error("TUNNEL_READINESS_POLICY_INVALID");
  const deadline = Date.now() + timeoutMs;
  const fetchImpl = options.fetchImpl ?? fetch;
  while (Date.now() <= deadline) {
    const abort = new AbortController();
    const requestTimeout = setTimeout(() => abort.abort(), Math.min(pollMs, 1_000));
    try {
      const response = await fetchImpl(endpoint, { signal: abort.signal, redirect: "error" });
      if (response.status === 200) {
        const body = await response.text();
        if (body.length <= 4_096) return;
      }
    } catch { /* provider may still be binding; deadline determines failure */ }
    finally { clearTimeout(requestTimeout); }
    if (Date.now() + pollMs > deadline) break;
    await new Promise<void>((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error("TUNNEL_READINESS_TIMEOUT");
}
import { createServer } from "node:net";
