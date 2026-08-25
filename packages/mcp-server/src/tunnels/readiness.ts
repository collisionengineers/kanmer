import { createServer } from "node:net";

const LOOPBACK = new Set(["127.0.0.1", "[::1]"]);
export const DEFAULT_READINESS_TIMEOUT_MS = 10_000;
const DEFAULT_READINESS_POLL_MS = 100;
const MAX_READINESS_REQUEST_TIMEOUT_MS = 1_000;

export interface LoopbackPortLease {
  readonly port: number;
  release(): Promise<void>;
}

export interface ReadinessOptions {
  readonly endpoint: string;
  readonly timeoutMs?: number;
  readonly pollMs?: number;
  readonly fetchImpl?: typeof fetch;
}

/** Hold a loopback-only port reservation until the child is ready to bind it. */
export async function reserveLoopbackPort(maxAttempts = 3): Promise<LoopbackPortLease> {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw new Error("TUNNEL_METRICS_PORT_POLICY_INVALID");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const server = createServer();
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (!address || typeof address === "string" || address.address !== "127.0.0.1" || !address.port) throw new Error("TUNNEL_METRICS_PORT_ALLOCATION_FAILED");
      let released = false;
      return {
        port: address.port,
        release: async () => {
          if (released) return;
          released = true;
          if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        },
      };
    } catch (error) {
      if (server.listening) await new Promise<void>((resolve, reject) => server.close((closeError) => closeError ? reject(closeError) : resolve()));
      if (attempt === maxAttempts) throw new Error(error instanceof Error && /^TUNNEL_/.test(error.message) ? error.message : "TUNNEL_METRICS_PORT_ALLOCATION_FAILED");
    }
  }
  throw new Error("TUNNEL_METRICS_PORT_ALLOCATION_FAILED");
}

/** Hold a caller-selected loopback TCP port until the child is ready to bind it. */
export async function reserveSpecificLoopbackPort(port: number): Promise<LoopbackPortLease> {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error("TUNNEL_METRICS_PORT_INVALID");
  const server = createServer();
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string" || address.address !== "127.0.0.1" || address.port !== port) throw new Error("TUNNEL_METRICS_PORT_ALLOCATION_FAILED");
    let released = false;
    return {
      port,
      release: async () => {
        if (released) return;
        released = true;
        if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      },
    };
  } catch (error) {
    if (server.listening) await new Promise<void>((resolve, reject) => server.close((closeError) => closeError ? reject(closeError) : resolve()));
    if (error instanceof Error && /^TUNNEL_/.test(error.message)) throw error;
    throw new Error("TUNNEL_METRICS_PORT_IN_USE");
  }
}

/** Obtain a currently free loopback TCP port without ever binding publicly. */
export async function allocateLoopbackPort(): Promise<number> {
  const lease = await reserveLoopbackPort();
  try { return lease.port; }
  finally { await lease.release(); }
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
  const timeoutMs = options.timeoutMs ?? DEFAULT_READINESS_TIMEOUT_MS;
  const pollMs = options.pollMs ?? DEFAULT_READINESS_POLL_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || !Number.isSafeInteger(pollMs) || pollMs < 1) throw new Error("TUNNEL_READINESS_POLICY_INVALID");
  const deadline = Date.now() + timeoutMs;
  const fetchImpl = options.fetchImpl ?? fetch;
  while (true) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 1) break;
    const abort = new AbortController();
    // Polling controls how soon the next probe starts, not how long a valid
    // loopback HTTP response may take. Keep each probe finite and never let it
    // exceed the total startup deadline.
    const requestTimeout = setTimeout(() => abort.abort(), Math.min(MAX_READINESS_REQUEST_TIMEOUT_MS, remainingMs));
    try {
      const response = await fetchImpl(endpoint, { signal: abort.signal, redirect: "error" });
      if (response.status === 200) {
        const body = await response.text();
        if (body.length <= 4_096) return;
      }
    } catch { /* provider may still be binding; deadline determines failure */ }
    finally { clearTimeout(requestTimeout); }
    const nextDelayMs = Math.min(pollMs, deadline - Date.now());
    if (nextDelayMs < 1) break;
    await new Promise<void>((resolve) => setTimeout(resolve, nextDelayMs));
  }
  throw new Error("TUNNEL_READINESS_TIMEOUT");
}
