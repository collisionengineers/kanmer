import { DOCTOR_MODES, renderDoctor, runDoctor, type DoctorMode } from "./doctor/index.js";
import { loadTokenMaterial, validateTokenFileReference } from "./http-secret.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Resolver } from "node:dns/promises";
import tls from "node:tls";

async function tlsProbe(hostname: string, port: number, signal?: AbortSignal): Promise<{ protocol?: string; issuer?: string; sanMatch: boolean; valid: boolean; expiresAt?: string }> {
  if (signal?.aborted) throw new Error("doctor cancelled");
  return await new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: true });
    const stop = () => { socket.destroy(); reject(new Error("doctor cancelled")); };
    signal?.addEventListener("abort", stop, { once: true });
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const issuer = typeof cert.issuer === "object" && cert.issuer ? String((cert.issuer as { readonly O?: string }).O ?? "") : undefined;
      resolve({ protocol: socket.getProtocol() ?? undefined, issuer, sanMatch: true, valid: true, ...(cert.valid_to ? { expiresAt: cert.valid_to } : {}) });
      socket.end();
    });
    socket.once("error", () => reject(new Error("TLS verification failed")));
    socket.once("close", () => signal?.removeEventListener("abort", stop));
  });
}

async function dnsProbe(hostname: string, signal?: AbortSignal): Promise<readonly string[]> {
  if (signal?.aborted) throw new Error("doctor cancelled");
  const resolver = new Resolver();
  const stop = () => resolver.cancel();
  signal?.addEventListener("abort", stop, { once: true });
  try {
    const results = await Promise.allSettled([resolver.resolve4(hostname), resolver.resolve6(hostname)]);
    if (signal?.aborted) throw new Error("doctor cancelled");
    const addresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!addresses.length && results.every((result) => result.status === "rejected")) throw new Error("DNS resolution failed");
    return addresses;
  } finally {
    signal?.removeEventListener("abort", stop);
  }
}

function isCanonicalLoopbackEndpoint(endpoint: string): boolean {
  try {
    const parsed = new URL(endpoint);
    return parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]") && parsed.pathname === "/mcp" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const requested = args.find((arg): arg is DoctorMode => (DOCTOR_MODES as readonly string[]).includes(arg));
const mode = requested ?? "config";
const json = args.includes("--json");
const allowed = new Set(["--json", ...DOCTOR_MODES]);
const invalid = args.some((arg) => arg.startsWith("--") && !allowed.has(arg)) || new Set(args.filter((arg) => !arg.startsWith("--"))).size > (requested ? 1 : 0) || (args.some((arg) => !arg.startsWith("--") && !DOCTOR_MODES.includes(arg as DoctorMode)));
if (invalid) {
  process.stderr.write("doctor: invalid invocation; use config|local|public and --json (no raw token, URL, insecure, or mutation flags)\n");
  process.exitCode = 2;
} else {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  const report = await runDoctor({
    mode,
    signal: controller.signal,
    totalTimeoutMs: 120_000,
    dependencies: {
      resolveProject: async () => {
        const { projectFingerprint } = await import("./index.js");
        return { fingerprint: await projectFingerprint() };
      },
      validateSecretReference: async () => {
        const file = process.env.KANMER_TOKEN_FILE;
        if (!file) return { valid: false, reason: "protected secret reference is not supplied" };
        try { await validateTokenFileReference(file); return { valid: true }; }
        catch { return { valid: false, reason: "protected secret reference is unsafe" }; }
      },
      token: async () => {
        const file = process.env.KANMER_TOKEN_FILE;
        if (!file) throw new Error("protected secret reference is not supplied");
        return (await loadTokenMaterial(file)).token;
      },
      mcp: async ({ endpoint, token, signal }) => {
        const client = new Client({ name: "kanmer-doctor", version: "1" });
        const transport = new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers: { authorization: `Bearer ${token}` }, signal } });
        try {
          await client.connect(transport);
          const status = await client.callTool({ name: "get_status", arguments: {} });
          const content = (status as unknown as { readonly content?: unknown }).content;
          const first = Array.isArray(content) ? content[0] as { readonly type?: string; readonly text?: string } : undefined;
          const payload = JSON.parse(first?.type === "text" ? first.text ?? "{}" : "{}") as { project?: { fingerprint?: string } };
          const tools = await client.listTools();
          return { projectFingerprint: payload.project?.fingerprint, tools: tools.tools.map((tool) => tool.name), close: () => client.close() };
        } catch (error) {
          try { await client.close(); } catch { throw new Error("doctor MCP setup and cleanup failed"); }
          throw error;
        }
      },
      canonicalTools: async () => {
        const { remoteHttpToolNames } = await import("./index.js");
        return remoteHttpToolNames();
      },
      probe: async ({ endpoint, authorization, followRedirects, signal }) => {
        const response = await fetch(endpoint, { method: "POST", redirect: followRedirects ? "follow" : "manual", signal, headers: { ...(authorization ? { authorization } : {}), accept: "application/json, text/event-stream" } });
        const metadata = { status: response.status, location: response.headers.get("location") ?? undefined, challenge: response.headers.get("www-authenticate") ?? undefined, contentType: response.headers.get("content-type") ?? undefined };
        await response.body?.cancel();
        return metadata;
      },
      localStatus: async () => {
        const endpoint = process.env.KANMER_LOCAL_ENDPOINT;
        if (!endpoint) return { state: "stopped", authRequired: false };
        if (!isCanonicalLoopbackEndpoint(endpoint)) return { state: "failed", endpoint, authRequired: false };
        const response = await fetch(endpoint, { method: "POST", redirect: "manual", signal: controller.signal });
        await response.body?.cancel();
        return { state: response.status === 401 ? "ready" : "failed", endpoint, authRequired: response.status === 401, projectFingerprint: process.env.KANMER_EXPECTED_PROJECT };
      },
      tunnelStatus: async () => {
        const raw = process.env.KANMER_TUNNEL_STATUS_JSON;
        if (!raw) return { state: "failed", provider: "unknown", attempt: 0, changedAt: new Date().toISOString() };
        try { return JSON.parse(raw); } catch { return { state: "failed", provider: "unknown", attempt: 0, changedAt: new Date().toISOString() }; }
      },
      resolveDns: async (hostname, signal) => {
        return dnsProbe(hostname, signal);
      },
      tls: async ({ hostname, port, signal }) => tlsProbe(hostname, port, signal),
    },
    config: {
      projectRoot: process.env.KANMER_ROOT,
      expectedProject: process.env.KANMER_EXPECTED_PROJECT,
      remoteHostname: process.env.KANMER_REMOTE_HOSTNAME,
      secretReference: process.env.KANMER_TOKEN_FILE,
      localEndpoint: process.env.KANMER_LOCAL_ENDPOINT,
      tunnel: {
        executable: process.env.CLOUDFLARED_PATH,
        tunnelId: process.env.CLOUDFLARED_TUNNEL_ID,
        hostname: process.env.KANMER_REMOTE_HOSTNAME,
        credentialsFile: process.env.CLOUDFLARED_CREDENTIALS_FILE,
        endpoint: process.env.KANMER_LOCAL_ENDPOINT,
      },
    },
  });
  process.removeListener("SIGINT", abort);
  process.removeListener("SIGTERM", abort);
  process.stdout.write(json ? `${JSON.stringify(report)}\n` : `${renderDoctor(report)}\n`);
  process.exitCode = report.exitCode;
}
