import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { validateCloudflaredTunnel } from "../tunnels/cloudflared-config.js";
import { validateCloudflaredExecutable } from "../tunnels/cloudflared-validate.js";
import { doctorCheck } from "./checks.js";
import type { DoctorCheckContext, DoctorCheckId, DoctorCheckResult, DoctorConfig, DoctorDependencies, DoctorMode, DoctorOptions, DoctorReport, DoctorSafeDetails } from "./types.js";
import { DOCTOR_CHECK_IDS } from "./types.js";

export * from "./checks.js";
export * from "./render.js";
export * from "./types.js";

function safe(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) return "[redacted]";
  return value.replace(/Bearer\s+[A-Za-z0-9_-]{8,}/gi, "Bearer [redacted]").replace(/(?:token|secret|password|credential)\s*[=:]\s*[^\s,;]+/gi, "$1=[redacted]");
}

function detail(reason: string, observed?: string, expected?: string): DoctorSafeDetails {
  return { reason: safe(reason) ?? "diagnostic failure", ...(observed ? { observed: safe(observed) } : {}), ...(expected ? { expected: safe(expected) } : {}) };
}

function sanitizeDetails(value: unknown): DoctorSafeDetails | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const output: Record<string, string | number | boolean | undefined> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (/token|secret|password|credential|session|body|document|authorization|cookie/i.test(key)) {
      output[key] = "[redacted]";
    } else if (typeof raw === "string") {
      output[key] = safe(raw);
    } else if (typeof raw === "number" || typeof raw === "boolean") {
      output[key] = raw;
    }
  }
  return output;
}

function result(id: DoctorCheckId, mode: DoctorOptions["mode"], status: DoctorCheckResult["status"], severity: DoctorCheckResult["severity"], details?: DoctorSafeDetails, repair?: DoctorCheckResult["repair"], prerequisites?: readonly DoctorCheckId[]): DoctorCheckResult {
  return { id, mode, status, severity, ...(details ? { details } : {}), ...(repair ? { repair } : {}), ...(prerequisites?.length ? { prerequisites } : {}) };
}

function configCheck(id: DoctorCheckId, mode: DoctorOptions["mode"], config: DoctorConfig, severity: DoctorCheckResult["severity"]): DoctorCheckResult {
  if (id === "PROJECT_CONFIG_VALID") return config.projectRoot || config.expectedProject ? result(id, mode, "pass", severity, detail("project configuration present")) : result(id, mode, "fail", severity, detail("project configuration is not supplied"));
  if (id === "REMOTE_CONFIG_VALID") {
    const hostname = config.remoteHostname ?? config.tunnel?.hostname;
    if (!hostname || isIP(hostname.replace(/^\[|\]$/g, "")) !== 0 || hostname.includes("*") || !hostname.includes(".")) return result(id, mode, "fail", severity, detail("configured hostname is missing or unsafe"));
    return result(id, mode, "pass", severity, detail("validated configured hostname", hostname));
  }
  if (id === "SECRET_REFERENCE_VALID") return config.secretReference || config.tunnel?.credentialsFile ? result(id, mode, "pass", severity, detail("protected secret reference present")) : result(id, mode, "warn", "warning", detail("no protected secret reference supplied"));
  if (id === "TUNNEL_EXECUTABLE_VALID") return config.tunnel?.executable ? result(id, mode, "pass", severity, detail("executable reference present")) : result(id, mode, "warn", "warning", detail("cloudflared executable reference not supplied"));
  if (id === "TUNNEL_CONFIG_VALID") {
    const tunnel = config.tunnel;
    if (!tunnel?.tunnelId || !tunnel.hostname || !tunnel.credentialsFile || !tunnel.endpoint) return result(id, mode, "warn", "warning", detail("named-tunnel fields not supplied"));
    try { validateCloudflaredTunnel({ tunnelId: tunnel.tunnelId, hostname: tunnel.hostname, credentialsFile: tunnel.credentialsFile }, { hostname: tunnel.hostname, endpoint: tunnel.endpoint }); return result(id, mode, "pass", severity, detail("exact hostname-to-loopback configuration validates")); }
    catch (error) { return result(id, mode, "fail", severity, detail(error instanceof Error ? error.message : "tunnel configuration invalid")); }
  }
  return result(id, mode, "skipped", "info", detail("no default check in this mode"));
}

async function defaultCheck(id: DoctorCheckId, context: DoctorCheckContext, dependencies: DoctorDependencies): Promise<DoctorCheckResult> {
  const definition = doctorCheck(id);
  if (["PROJECT_CONFIG_VALID", "REMOTE_CONFIG_VALID", "SECRET_REFERENCE_VALID", "TUNNEL_EXECUTABLE_VALID", "TUNNEL_CONFIG_VALID"].includes(id)) {
    const base = configCheck(id, context.mode, context.config, definition.severity);
    if (id === "TUNNEL_EXECUTABLE_VALID" && base.status === "pass" && context.config.tunnel?.executable) {
      try { const checked = await validateCloudflaredExecutable({ executable: context.config.tunnel.executable }); return result(id, context.mode, "pass", definition.severity, detail(`cloudflared ${checked.version} passed bounded version/help checks`)); }
      catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "executable validation failed")); }
    }
    return base;
  }
  if (id === "TUNNEL_PROCESS_READY" && dependencies.tunnelStatus) {
    try {
      const status = await dependencies.tunnelStatus();
      const expectedHost = context.config.remoteHostname ?? context.config.tunnel?.hostname;
      const mismatches = [
        status.state !== "connected" ? `provider state is ${status.state}` : undefined,
        expectedHost && status.publicEndpoint && !status.publicEndpoint.includes(expectedHost) ? "public hostname does not match configured hostname" : undefined,
        context.config.expectedProject && status.projectFingerprint && status.projectFingerprint !== context.config.expectedProject ? "project fingerprint does not match configured project" : undefined,
        context.config.expectedAuthGeneration && status.authGeneration && status.authGeneration !== context.config.expectedAuthGeneration ? "auth generation does not match configured generation" : undefined,
      ].filter((value): value is string => Boolean(value));
      return mismatches.length ? result(id, context.mode, "fail", definition.severity, detail(mismatches.join("; "), status.state, "connected")) : result(id, context.mode, "pass", definition.severity, detail("provider readiness is connected", status.provider));
    }
    catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "tunnel status unavailable")); }
  }
  if (id === "LOCAL_STATUS_READY" && dependencies.localStatus) {
    try {
      const status = await dependencies.localStatus();
      const healthy = (status.state === undefined || status.state === "ready") && status.authRequired === true && (!context.config.expectedProject || status.projectFingerprint === context.config.expectedProject);
      return healthy ? result(id, context.mode, "pass", definition.severity, detail("local authenticated host is ready", status.endpoint)) : result(id, context.mode, "fail", definition.severity, detail("local host is absent, stopping, unauthenticated, or bound to another project", status.state, "ready/authRequired/project"));
    } catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "local status unavailable")); }
  }
  if (id === "LOCAL_BIND_LOOPBACK" && dependencies.localStatus) {
    try {
      const status = await dependencies.localStatus();
      const endpoint = status.endpoint ?? context.config.localEndpoint;
      const parsed = endpoint ? new URL(endpoint) : undefined;
      const loopback = parsed && parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]") && parsed.pathname === "/mcp" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
      return loopback ? result(id, context.mode, "pass", definition.severity, detail("local endpoint is loopback", parsed.hostname)) : result(id, context.mode, "fail", definition.severity, detail("local endpoint is not a canonical loopback /mcp address"));
    } catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "local endpoint invalid")); }
  }
  if (["AUTH_MISSING_REJECTED", "AUTH_WRONG_REJECTED", "AUTH_MISSING_PUBLIC_REJECTED"].includes(id) && dependencies.probe) {
    const endpoint = context.config.localEndpoint ?? `https://${context.config.remoteHostname ?? context.config.tunnel?.hostname ?? ""}/mcp`;
    const wrong = id === "AUTH_WRONG_REJECTED" ? `Bearer ${randomBytes(32).toString("base64url")}` : undefined;
    try {
      const response = await dependencies.probe({ endpoint, ...(wrong ? { authorization: wrong } : {}), followRedirects: false });
      const pass = response.status === 401 && Boolean(response.challenge) && !response.location;
      return pass ? result(id, context.mode, "pass", definition.severity, detail("unauthenticated request was rejected with a generic challenge", String(response.status), "401")) : result(id, context.mode, "fail", definition.severity, detail("endpoint did not reject unauthenticated access as required", String(response.status), "401"));
    } catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "auth probe failed")); }
  }
  if (["PUBLIC_TLS_VALID"].includes(id) && dependencies.tls && context.config.remoteHostname) {
    try {
      const tls = await dependencies.tls({ hostname: context.config.remoteHostname, port: 443, signal: context.signal });
      return tls.valid && tls.sanMatch ? result(id, context.mode, "pass", definition.severity, { protocol: safe(tls.protocol), issuer: safe(tls.issuer), sanMatch: true, ...(tls.expiresAt ? { expiresAt: safe(tls.expiresAt) } : {}) }) : result(id, context.mode, "fail", definition.severity, detail("TLS trust or hostname verification failed"));
    } catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "TLS verification failed")); }
  }
  if (["PUBLIC_ROUTE_NO_REDIRECT"].includes(id) && dependencies.probe) {
    const endpoint = `https://${context.config.remoteHostname ?? context.config.tunnel?.hostname ?? ""}/mcp`;
    try { const response = await dependencies.probe({ endpoint, followRedirects: false }); return response.status >= 200 && response.status < 400 && !response.location ? result(id, context.mode, "pass", definition.severity, detail("configured HTTPS route returned without redirect", String(response.status))) : result(id, context.mode, "fail", definition.severity, detail("public route redirected or returned an unexpected status", String(response.status), "2xx without redirect")); }
    catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "public route probe failed")); }
  }
  if (id === "PUBLIC_DNS_RESOLVES" && dependencies.resolveDns && context.config.remoteHostname) {
    try { const addresses = await dependencies.resolveDns(context.config.remoteHostname); return addresses.length ? result(id, context.mode, "pass", definition.severity, { observed: `${addresses.length} address(es)` }) : result(id, context.mode, "fail", definition.severity, detail("hostname resolved to no addresses")); }
    catch (error) { return result(id, context.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "DNS resolution failed")); }
  }
  return result(id, context.mode, "skipped", "info", detail("check requires a local injected diagnostic dependency"));
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const started = options.now?.() ?? Date.now();
  const now = options.now ?? Date.now;
  const config = options.config ?? {};
  const dependencies = options.dependencies ?? {};
  const context: DoctorCheckContext = { mode: options.mode, config, now, signal: options.signal };
  const checks: DoctorCheckResult[] = [];
  const byId = new Map<DoctorCheckId, DoctorCheckResult>();
  const cleanups: Array<() => Promise<void> | void> = [];
  const clients = new Map<DoctorMode, Awaited<ReturnType<NonNullable<DoctorDependencies["mcp"]>>> >();
  const cleanup = async () => {
    for (const close of [...cleanups].reverse()) { try { await close(); } catch { /* cleanup is best effort; the report remains authoritative */ } }
    for (const client of clients.values()) { try { await client.close(); } catch { /* idempotent close */ } }
  };
  const runOne = async (id: DoctorCheckId, definition: ReturnType<typeof doctorCheck>): Promise<DoctorCheckResult> => {
    const injected = dependencies.checks?.[id];
    if (injected) return await injected(context) as DoctorCheckResult;
    if (id === "AUTH_VALID_ACCEPTED" && !injected && dependencies.token && dependencies.mcp) {
      const endpoint = context.mode === "local" ? config.localEndpoint : `https://${config.remoteHostname ?? config.tunnel?.hostname ?? ""}/mcp`;
      const token = await dependencies.token();
      const client = await dependencies.mcp({ endpoint: endpoint ?? "", token });
      clients.set(context.mode, client);
      const closeClient = () => client.close();
      cleanups.push(closeClient);
      dependencies.registerCleanup?.(closeClient);
      return result(id, context.mode, "pass", definition.severity, detail("protected credential accepted by MCP transport"));
    }
    if (id === "MCP_INITIALIZE_LOCAL" || id === "MCP_INITIALIZE_PUBLIC") {
      return clients.has(context.mode) ? result(id, context.mode, "pass", definition.severity, detail("official MCP client initialized")) : result(id, context.mode, "skipped", "info", detail("valid credential client was not established"));
    }
    if (id === "PROJECT_FINGERPRINT_LOCAL" || id === "PROJECT_FINGERPRINT_PUBLIC") {
      const client = clients.get(context.mode);
      if (!client) return result(id, context.mode, "skipped", "info", detail("MCP client was not established"));
      return client.projectFingerprint && config.expectedProject && client.projectFingerprint === config.expectedProject
        ? result(id, context.mode, "pass", definition.severity, detail("project fingerprint matches expected project"))
        : result(id, context.mode, "fail", definition.severity, detail("project fingerprint does not match expected project"));
    }
    if (id === "REMOTE_TOOL_POLICY_LOCAL" || id === "REMOTE_TOOL_POLICY_PUBLIC") {
      const client = clients.get(context.mode);
      if (!client) return result(id, context.mode, "skipped", "info", detail("MCP client was not established"));
      const expected = config.expectedTools ?? await dependencies.expectedTools?.() ?? [];
      const actual = [...client.tools].sort();
      return expected.length && JSON.stringify(actual) === JSON.stringify([...expected].sort()) ? result(id, context.mode, "pass", definition.severity, detail("remote tool policy matches canonical exposure", String(actual.length))) : result(id, context.mode, "fail", definition.severity, detail("remote tool policy differs from canonical exposure"));
    }
    if (id === "SESSION_CLOSE_LOCAL" || id === "SESSION_CLOSE_PUBLIC") {
      const client = clients.get(context.mode);
      if (!client) return result(id, context.mode, "skipped", "info", detail("MCP client was not established"));
      await client.close(); clients.delete(context.mode);
      return result(id, context.mode, "pass", definition.severity, detail("diagnostic MCP session closed"));
    }
    return defaultCheck(id, context, dependencies);
  };
  for (const id of DOCTOR_CHECK_IDS) {
    const checkStarted = Date.now();
    const definition = doctorCheck(id);
    if (!definition.modes.includes(options.mode)) {
      const skipped = result(id, options.mode, "skipped", "info", detail(`not applicable to ${options.mode} mode`));
      checks.push(skipped); byId.set(id, skipped); continue;
    }
    const unmet = definition.prerequisites.filter((prerequisite) => { const prior = byId.get(prerequisite); return prior && (prior.status === "fail" || prior.status === "skipped"); });
    if (unmet.length) {
      const skipped = result(id, options.mode, "skipped", "info", detail(`prerequisite ${unmet.join(", ")} did not pass`), definition.repair, unmet);
      checks.push(skipped); byId.set(id, skipped); continue;
    }
    if (options.signal?.aborted) {
      const skipped = result(id, options.mode, "skipped", "info", detail("doctor run cancelled"));
      checks.push(skipped); byId.set(id, skipped); continue;
    }
    try {
      const timeout = options.timeoutMs && Number.isSafeInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
      let timer: NodeJS.Timeout | undefined;
      const value = await new Promise<DoctorCheckResult>((resolve, reject) => {
        timer = setTimeout(() => resolve(result(id, options.mode, "fail", definition.severity, detail("check timed out"), definition.repair)), timeout);
        timer.unref();
        runOne(id, definition).then(resolve, reject);
      });
      if (timer) clearTimeout(timer);
      const completed = value && typeof value === "object" && "status" in value
        ? ({ ...value, id, mode: options.mode, severity: (value as DoctorCheckResult).severity ?? definition.severity } as DoctorCheckResult)
        : result(id, options.mode, "pass", definition.severity, value as DoctorSafeDetails | undefined, definition.repair);
      const normalized = { ...completed, id, mode: options.mode, repair: completed.repair ?? definition.repair, details: { ...(completed.details ?? {}), durationMs: Date.now() - checkStarted } };
      checks.push(normalized); byId.set(id, normalized);
    } catch (error) {
      const failed = result(id, options.mode, "fail", definition.severity, detail(error instanceof Error ? error.message : "doctor dependency failed"), definition.repair);
      checks.push(failed); byId.set(id, failed);
    }
  }
  await cleanup();
  const counts = { pass: checks.filter((check) => check.status === "pass").length, warn: checks.filter((check) => check.status === "warn").length, fail: checks.filter((check) => check.status === "fail").length, skipped: checks.filter((check) => check.status === "skipped").length };
  const status = counts.fail ? "fail" : counts.warn ? "warn" : "pass";
  const finished = Date.now();
  const exitCode = options.signal?.aborted ? 2 : counts.fail ? 1 : 0;
  return { schemaVersion: 1, mode: options.mode, startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(), durationMs: Math.max(0, finished - started), status, exitCode, checks: checks.map((check) => ({ ...check, details: sanitizeDetails(check.details) })), counts };
}
