import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { validateCloudflaredTunnel } from "../tunnels/cloudflared-config.js";
import { validateCloudflaredExecutable } from "../tunnels/cloudflared-validate.js";
import { doctorCheck } from "./checks.js";
import type { DoctorCheckContext, DoctorCheckId, DoctorCheckResult, DoctorConfig, DoctorDependencies, DoctorMode, DoctorOptions, DoctorReport, DoctorSafeDetails } from "./types.js";
import { DOCTOR_CHECK_IDS, DOCTOR_STATUSES } from "./types.js";

export * from "./checks.js";
export * from "./render.js";
export * from "./types.js";

const SAFE_DETAIL_KEYS = new Set(["reason", "observed", "expected", "durationMs", "sanMatch", "issuer", "protocol", "expiresAt", "addressCount", "state", "provider", "status", "code", "attempt"]);

function scrub(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) return "[redacted]";
  if (/bearer|token|secret|credential|password|authorization|cookie|session|canary/i.test(value) || /[A-Za-z0-9_-]{32,}/.test(value)) return "[redacted]";
  return value;
}

function sanitizeDetails(value: unknown): DoctorSafeDetails | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const output: Record<string, string | number | boolean | undefined> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!SAFE_DETAIL_KEYS.has(key)) continue;
    if (/token|secret|credential|password|authorization|cookie|session|body|document/i.test(key)) { output[key] = "[redacted]"; continue; }
    if (typeof raw === "string") output[key] = scrub(raw);
    else if (typeof raw === "number" && Number.isFinite(raw)) output[key] = raw;
    else if (typeof raw === "boolean") output[key] = raw;
  }
  return output;
}

function detail(reason: string, observed?: string, expected?: string): DoctorSafeDetails {
  return sanitizeDetails({ reason, ...(observed ? { observed } : {}), ...(expected ? { expected } : {}) }) ?? { reason: "diagnostic failure" };
}

function result(id: DoctorCheckId, mode: DoctorMode, status: DoctorCheckResult["status"], severity: DoctorCheckResult["severity"], details?: DoctorSafeDetails, repair?: DoctorCheckResult["repair"], prerequisites?: readonly DoctorCheckId[]): DoctorCheckResult {
  return { id, mode, status, severity, ...(details ? { details } : {}), ...(repair ? { repair } : {}), ...(prerequisites?.length ? { prerequisites } : {}) };
}

function safeFailure(id: DoctorCheckId, mode: DoctorMode, definition: ReturnType<typeof doctorCheck>, reason = "diagnostic dependency failed"): DoctorCheckResult {
  return result(id, mode, "fail", definition.severity, detail(reason), definition.repair);
}

function configCheck(id: DoctorCheckId, mode: DoctorMode, config: DoctorConfig, severity: DoctorCheckResult["severity"], dependencies: DoctorDependencies): DoctorCheckResult | undefined {
  if (id === "PROJECT_CONFIG_VALID") return config.projectRoot || config.expectedProject ? result(id, mode, "pass", severity, detail("project configuration reference supplied")) : result(id, mode, "fail", severity, detail("project configuration is not supplied"));
  if (id === "REMOTE_CONFIG_VALID") {
    if (dependencies.validateRemoteConfig) return undefined;
    const hostname = config.remoteHostname ?? config.tunnel?.hostname;
    if (!hostname || isIP(hostname.replace(/^\[|\]$/g, "")) !== 0 || hostname.includes("*") || !hostname.includes(".") || /[/?#@]/.test(hostname)) return result(id, mode, "fail", severity, detail("configured hostname is missing or unsafe"));
    return result(id, mode, "pass", severity, detail("configured hostname is syntactically safe", hostname));
  }
  if (id === "SECRET_REFERENCE_VALID") {
    if (dependencies.validateSecretReference) return undefined;
    return config.secretReference ? result(id, mode, "pass", severity, detail("protected secret reference supplied")) : result(id, mode, "fail", severity, detail("protected secret reference is not supplied"));
  }
  if (id === "TUNNEL_EXECUTABLE_VALID") return config.tunnel?.executable ? result(id, mode, "pass", severity, detail("executable reference supplied")) : result(id, mode, "warn", "warning", detail("cloudflared executable reference not supplied"));
  if (id === "TUNNEL_CONFIG_VALID") {
    const tunnel = config.tunnel;
    if (!tunnel?.tunnelId || !tunnel.hostname || !tunnel.credentialsFile || !tunnel.endpoint) return result(id, mode, "warn", "warning", detail("named-tunnel fields not supplied"));
    try { validateCloudflaredTunnel({ tunnelId: tunnel.tunnelId, hostname: tunnel.hostname, credentialsFile: tunnel.credentialsFile }, { hostname: tunnel.hostname, endpoint: tunnel.endpoint }); return result(id, mode, "pass", severity, detail("exact hostname-to-loopback configuration validates")); }
    catch { return result(id, mode, "fail", severity, detail("tunnel configuration failed canonical validation")); }
  }
  return undefined;
}

async function defaultCheck(id: DoctorCheckId, context: DoctorCheckContext, dependencies: DoctorDependencies): Promise<DoctorCheckResult> {
  const definition = doctorCheck(id);
  if (["PROJECT_CONFIG_VALID", "REMOTE_CONFIG_VALID", "SECRET_REFERENCE_VALID", "TUNNEL_EXECUTABLE_VALID", "TUNNEL_CONFIG_VALID"].includes(id)) {
    if (id === "PROJECT_CONFIG_VALID" && dependencies.resolveProject) {
      try { const project = await dependencies.resolveProject(); return !context.config.expectedProject || project.fingerprint === context.config.expectedProject ? result(id, context.mode, "pass", definition.severity, detail("canonical project fingerprint resolved", project.fingerprint)) : result(id, context.mode, "fail", definition.severity, detail("canonical project fingerprint does not match expected project")); }
      catch { return safeFailure(id, context.mode, definition, "canonical project could not be resolved"); }
    }
    if (id === "REMOTE_CONFIG_VALID" && dependencies.validateRemoteConfig) {
      try { const check = await dependencies.validateRemoteConfig(); return check.valid ? result(id, context.mode, "pass", definition.severity, detail("remote configuration passed canonical validation")) : result(id, context.mode, "fail", definition.severity, detail(check.reason ?? "remote configuration failed canonical validation")); }
      catch { return safeFailure(id, context.mode, definition, "remote configuration validation failed"); }
    }
    if (id === "SECRET_REFERENCE_VALID" && dependencies.validateSecretReference) {
      try { const check = await dependencies.validateSecretReference(); return check.valid ? result(id, context.mode, "pass", definition.severity, detail("protected secret reference passed metadata validation")) : result(id, context.mode, "fail", definition.severity, detail(check.reason ?? "protected secret reference is unsafe")); }
      catch { return safeFailure(id, context.mode, definition, "protected secret reference validation failed"); }
    }
    const base = configCheck(id, context.mode, context.config, definition.severity, dependencies);
    if (base) {
      if (id === "TUNNEL_EXECUTABLE_VALID" && base.status === "pass" && context.config.tunnel?.executable) {
        try { const checked = await validateCloudflaredExecutable({ executable: context.config.tunnel.executable }); return result(id, context.mode, "pass", definition.severity, detail("cloudflared executable passed bounded version/help checks", checked.version)); }
        catch { return safeFailure(id, context.mode, definition, "cloudflared executable failed bounded version/help checks"); }
      }
      return base;
    }
  }
  if (id === "TUNNEL_PROCESS_READY" && dependencies.tunnelStatus) {
    try { const status = await dependencies.tunnelStatus(); const expectedHost = context.config.remoteHostname ?? context.config.tunnel?.hostname; const mismatch = status.state !== "connected" || Boolean(expectedHost && status.publicEndpoint && !status.publicEndpoint.includes(expectedHost)) || Boolean(context.config.expectedProject && status.projectFingerprint && status.projectFingerprint !== context.config.expectedProject) || Boolean(context.config.expectedAuthGeneration && status.authGeneration && status.authGeneration !== context.config.expectedAuthGeneration); return mismatch ? result(id, context.mode, "fail", definition.severity, detail("provider readiness or generation does not match the configured origin")) : result(id, context.mode, "pass", definition.severity, detail("provider readiness is connected", status.provider)); }
    catch { return safeFailure(id, context.mode, definition, "tunnel status unavailable"); }
  }
  if (id === "LOCAL_STATUS_READY" && dependencies.localStatus) {
    try { const status = await dependencies.localStatus(); const healthy = (status.state === undefined || status.state === "ready") && status.authRequired === true && (!context.config.expectedProject || status.projectFingerprint === context.config.expectedProject); return healthy ? result(id, context.mode, "pass", definition.severity, detail("local authenticated host is ready")) : result(id, context.mode, "fail", definition.severity, detail("local host is absent, stopping, unauthenticated, or bound to another project")); }
    catch { return safeFailure(id, context.mode, definition, "local status unavailable"); }
  }
  if (id === "LOCAL_BIND_LOOPBACK" && dependencies.localStatus) {
    try { const status = await dependencies.localStatus(); const endpoint = status.endpoint ?? context.config.localEndpoint; const parsed = endpoint ? new URL(endpoint) : undefined; const loopback = parsed && parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]") && parsed.pathname === "/mcp" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash; return loopback ? result(id, context.mode, "pass", definition.severity, detail("local endpoint is loopback", parsed.hostname)) : result(id, context.mode, "fail", definition.severity, detail("local endpoint is not a canonical loopback /mcp address")); }
    catch { return safeFailure(id, context.mode, definition, "local endpoint validation failed"); }
  }
  if (["AUTH_MISSING_REJECTED", "AUTH_WRONG_REJECTED", "AUTH_MISSING_PUBLIC_REJECTED"].includes(id) && dependencies.probe) {
    const endpoint = context.mode === "local" ? (context.config.localEndpoint ?? "") : `https://${context.config.remoteHostname ?? context.config.tunnel?.hostname ?? ""}/mcp`;
    const wrong = id === "AUTH_WRONG_REJECTED" ? `Bearer ${randomBytes(32).toString("base64url")}` : undefined;
    try { const response = await dependencies.probe({ endpoint, ...(wrong ? { authorization: wrong } : {}), followRedirects: false }); const pass = response.status === 401 && Boolean(response.challenge) && !response.location; return pass ? result(id, context.mode, "pass", definition.severity, detail("unauthenticated request was rejected with a generic challenge", "401", "401")) : result(id, context.mode, "fail", definition.severity, detail("endpoint did not reject unauthenticated access as required")); }
    catch { return safeFailure(id, context.mode, definition, "bearer probe failed"); }
  }
  if (id === "PUBLIC_TLS_VALID" && dependencies.tls && context.config.remoteHostname) {
    try { const tls = await dependencies.tls({ hostname: context.config.remoteHostname, port: 443, signal: context.signal }); return tls.valid && tls.sanMatch ? result(id, context.mode, "pass", definition.severity, sanitizeDetails({ protocol: tls.protocol, issuer: tls.issuer, sanMatch: true, expiresAt: tls.expiresAt })) : result(id, context.mode, "fail", definition.severity, detail("TLS trust or hostname verification failed")); }
    catch { return safeFailure(id, context.mode, definition, "TLS verification failed"); }
  }
  if (id === "PUBLIC_ROUTE_NO_REDIRECT" && dependencies.probe) {
    const endpoint = `https://${context.config.remoteHostname ?? context.config.tunnel?.hostname ?? ""}/mcp`;
    try { const response = await dependencies.probe({ endpoint, followRedirects: false }); const reachable = response.status === 401 || (response.status >= 200 && response.status < 300); return reachable && !response.location ? result(id, context.mode, "pass", definition.severity, detail("configured HTTPS route reached MCP without redirect", String(response.status))) : result(id, context.mode, "fail", definition.severity, detail("public route redirected or returned an intermediary response")); }
    catch { return safeFailure(id, context.mode, definition, "public route probe failed"); }
  }
  if (id === "PUBLIC_DNS_RESOLVES" && dependencies.resolveDns && context.config.remoteHostname) {
    try { const addresses = await dependencies.resolveDns(context.config.remoteHostname); return addresses.length ? result(id, context.mode, "pass", definition.severity, sanitizeDetails({ addressCount: addresses.length })) : result(id, context.mode, "fail", definition.severity, detail("hostname resolved to no addresses")); }
    catch { return safeFailure(id, context.mode, definition, "DNS resolution failed"); }
  }
  if (id === "LOCAL_PUBLIC_CONSISTENT") return result(id, context.mode, "fail", definition.severity, detail("trusted local status is required for local/public consistency"));
  if (id === "DIAGNOSTIC_REDACTION") return result(id, context.mode, "pass", definition.severity, detail("report fields are allowlisted and redacted before serialization"));
  if (id === "NO_BOARD_MUTATION") return result(id, context.mode, "pass", definition.severity, detail("doctor registry contains no board mutator or provider resource operation"));
  return result(id, context.mode, "skipped", "info", detail("diagnostic dependency is not available in this invocation"));
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const started = options.now?.() ?? Date.now();
  const now = options.now ?? Date.now;
  const config = options.config ?? {};
  const dependencies = options.dependencies ?? {};
  const controller = new AbortController();
  const abortExternal = () => controller.abort();
  options.signal?.addEventListener("abort", abortExternal, { once: true });
  if (options.signal?.aborted) controller.abort();
  const context: DoctorCheckContext = { mode: options.mode, config, now, signal: controller.signal };
  const checks: DoctorCheckResult[] = [];
  const byId = new Map<DoctorCheckId, DoctorCheckResult>();
  type SessionPhase = "local" | "public";
  const clients = new Map<SessionPhase, Awaited<ReturnType<NonNullable<DoctorDependencies["mcp"]>>>>();
  const snapshots = new Map<SessionPhase, { readonly projectFingerprint?: string; readonly tools: readonly string[] }>();
  let credentialToken: string | undefined;
  const cleanups: Array<() => Promise<void> | void> = [];
  const cleanupErrors: string[] = [];
  let closed = false;
  let totalTimedOut = false;
  const cleanup = async () => {
    closed = true;
    for (const close of [...cleanups].reverse()) { try { await close(); } catch { cleanupErrors.push("diagnostic cleanup failed"); } }
    for (const [phase, client] of clients) { try { await client.close(); clients.delete(phase); } catch { cleanupErrors.push("MCP diagnostic session cleanup failed"); } }
  };
  const runOne = async (id: DoctorCheckId, definition: ReturnType<typeof doctorCheck>): Promise<DoctorCheckResult | DoctorSafeDetails | void> => {
    const injected = dependencies.checks?.[id];
    if (injected) return injected(context);
    if (id === "AUTH_VALID_ACCEPTED" && dependencies.token && dependencies.mcp) {
      const endpoint = config.localEndpoint ?? "";
      credentialToken = await dependencies.token(controller.signal);
      const client = await dependencies.mcp({ endpoint, token: credentialToken, signal: controller.signal });
      if (closed || controller.signal.aborted) { try { await client.close(); } catch { cleanupErrors.push("late MCP session cleanup failed"); } throw new Error("doctor run cancelled"); }
      clients.set("local", client);
      const closeClient = () => client.close();
      cleanups.push(closeClient);
      dependencies.registerCleanup?.(closeClient);
      return result(id, context.mode, "pass", definition.severity, detail("protected credential accepted by MCP transport"));
    }
    const publicCheck = id.endsWith("_PUBLIC") || id === "LOCAL_PUBLIC_CONSISTENT";
    const phase: SessionPhase = publicCheck ? "public" : "local";
    if (id === "MCP_INITIALIZE_PUBLIC" && !clients.has("public") && dependencies.mcp && credentialToken) {
      const client = await dependencies.mcp({ endpoint: `https://${config.remoteHostname ?? config.tunnel?.hostname ?? ""}/mcp`, token: credentialToken, signal: controller.signal });
      if (closed || controller.signal.aborted) { try { await client.close(); } catch { cleanupErrors.push("late MCP session cleanup failed"); } throw new Error("doctor run cancelled"); }
      clients.set("public", client); cleanups.push(() => client.close());
    }
    if (id === "MCP_INITIALIZE_LOCAL" || id === "MCP_INITIALIZE_PUBLIC") return clients.has(phase) ? result(id, context.mode, "pass", definition.severity, detail("official MCP client initialized")) : result(id, context.mode, "skipped", "info", detail("valid credential client was not established"));
    if (id === "PROJECT_FINGERPRINT_LOCAL" || id === "PROJECT_FINGERPRINT_PUBLIC") { const client = clients.get(phase); if (!client) return result(id, context.mode, "skipped", "info", detail("MCP client was not established")); return client.projectFingerprint && config.expectedProject && client.projectFingerprint === config.expectedProject ? result(id, context.mode, "pass", definition.severity, detail("project fingerprint matches expected project")) : result(id, context.mode, "fail", definition.severity, detail("project fingerprint does not match expected project")); }
    if (id === "REMOTE_TOOL_POLICY_LOCAL" || id === "REMOTE_TOOL_POLICY_PUBLIC") { const client = clients.get(phase); if (!client) return result(id, context.mode, "skipped", "info", detail("MCP client was not established")); const expected = config.expectedTools ?? await dependencies.canonicalTools?.() ?? await dependencies.expectedTools?.() ?? []; return expected.length && JSON.stringify([...client.tools].sort()) === JSON.stringify([...expected].sort()) ? result(id, context.mode, "pass", definition.severity, detail("remote tool policy matches canonical exposure", String(client.tools.length))) : result(id, context.mode, "fail", definition.severity, detail("remote tool policy differs from canonical exposure")); }
    if (id === "SESSION_CLOSE_LOCAL" || id === "SESSION_CLOSE_PUBLIC") { const client = clients.get(phase); if (!client) return result(id, context.mode, "skipped", "info", detail("MCP client was not established")); snapshots.set(phase, { projectFingerprint: client.projectFingerprint, tools: [...client.tools] }); await client.close(); clients.delete(phase); return result(id, context.mode, "pass", definition.severity, detail("diagnostic MCP session closed")); }
    if (id === "LOCAL_PUBLIC_CONSISTENT" && dependencies.localStatus) { const local = await dependencies.localStatus(); const remote = snapshots.get("public") ?? clients.get("public"); const same = Boolean(remote && local.projectFingerprint && remote.projectFingerprint === local.projectFingerprint && (!local.tools || JSON.stringify([...local.tools].sort()) === JSON.stringify([...remote.tools].sort()))); return same ? result(id, context.mode, "pass", definition.severity, detail("local and public project/tool policy agree")) : result(id, context.mode, "fail", definition.severity, detail("local and public project/tool policy differ")); }
    return defaultCheck(id, context, dependencies);
  };
  const perCheckTimeout = options.timeoutMs && Number.isSafeInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  const deadline = started + (options.totalTimeoutMs && options.totalTimeoutMs > 0 ? options.totalTimeoutMs : 5 * 60_000);
  for (const id of DOCTOR_CHECK_IDS) {
    const definition = doctorCheck(id);
    const add = (value: DoctorCheckResult) => { byId.set(id, value); checks.push(value); };
    if (!definition.modes.includes(options.mode)) { add(result(id, options.mode, "skipped", "info", detail(`not applicable to ${options.mode} mode`))); continue; }
    if (Date.now() >= deadline) { totalTimedOut = true; controller.abort(); add(result(id, options.mode, "skipped", "info", detail("doctor total deadline exceeded"), definition.repair)); continue; }
    const unmet = definition.prerequisites.filter((prerequisite) => { const prior = byId.get(prerequisite); return prior && (prior.status === "fail" || prior.status === "skipped"); });
    if (unmet.length) { add(result(id, options.mode, "skipped", "info", detail(`prerequisite ${unmet.join(", ")} did not pass`), definition.repair, unmet)); continue; }
    if (controller.signal.aborted) { add(result(id, options.mode, "skipped", "info", detail("doctor run cancelled"))); continue; }
    const checkStarted = Date.now(); let timer: NodeJS.Timeout | undefined; let checkTimedOut = false;
    try {
      const value = await new Promise<DoctorCheckResult | DoctorSafeDetails | void>((resolve, reject) => { timer = setTimeout(() => { checkTimedOut = true; controller.abort(); resolve(result(id, options.mode, "fail", definition.severity, detail("check timed out"), definition.repair)); }, perCheckTimeout); timer.unref(); runOne(id, definition).then(resolve, reject); });
      if (timer) clearTimeout(timer);
      const raw = value && typeof value === "object" && "status" in value ? value as DoctorCheckResult : { status: "pass" as const, details: value as DoctorSafeDetails | undefined };
      const status = DOCTOR_STATUSES.includes(raw.status) ? raw.status : "fail";
      const normalized = result(id, options.mode, status, definition.severity, sanitizeDetails(raw.details), definition.repair, status === "skipped" ? definition.prerequisites : undefined);
      add({ ...normalized, details: sanitizeDetails({ ...(normalized.details ?? {}), durationMs: Date.now() - checkStarted }) });
      if (checkTimedOut) totalTimedOut = true;
    } catch { if (timer) clearTimeout(timer); add(safeFailure(id, options.mode, definition)); }
  }
  await cleanup();
  options.signal?.removeEventListener("abort", abortExternal);
  const counts = { pass: checks.filter((check) => check.status === "pass").length, warn: checks.filter((check) => check.status === "warn").length, fail: checks.filter((check) => check.status === "fail").length, skipped: checks.filter((check) => check.status === "skipped").length };
  const status = counts.fail ? "fail" : counts.warn ? "warn" : "pass";
  const finished = options.now ? options.now() : Date.now();
  const cancelled = Boolean(options.signal?.aborted);
  const exitCode = cancelled || totalTimedOut ? 2 : counts.fail ? 1 : 0;
  return { schemaVersion: 1, mode: options.mode, startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(), durationMs: Math.max(0, finished - started), status, exitCode, checks, counts, ...(cleanupErrors.length ? { cleanupErrors } : {}) };
}
