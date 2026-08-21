import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest, SUPPORTED_PROTOCOL_VERSIONS } from "@modelcontextprotocol/sdk/types.js";
import { createKanmerMcpServer, projectFingerprint } from "./index.js";
import { BearerAuthorizer, type BearerVerifier, unauthorizedHeaders } from "./http-auth.js";

export { BearerAuthorizer, generateBearerToken, verifierForToken } from "./http-auth.js";
export { createTokenFile, loadTokenFile, type TokenFileWriter } from "./http-secret.js";

export interface HttpAuthorizer {
  authorize(request: { headers: IncomingMessage["headers"] }): Promise<{ principal: string }>;
}

export interface HttpHostOptions {
  authorizer: HttpAuthorizer;
  host?: string;
  port?: number;
  allowedOrigins?: readonly string[];
  maxHeaderBytes?: number;
  maxBodyBytes?: number;
  maxConnections?: number;
  requestTimeoutMs?: number;
  keepAliveTimeoutMs?: number;
  maxSessions?: number;
  maxSessionsPerPrincipal?: number;
  maxInFlight?: number;
  maxInFlightPerSession?: number;
  idleTtlMs?: number;
  sweepIntervalMs?: number;
  shutdownGraceMs?: number;
  clock?: () => number;
  onEvent?: (event: HttpEvent) => void;
}

/** Intentionally allowlisted diagnostics: no headers, tokens, digests, bodies, or session ids. */
export interface HttpSecurityEvent {
  readonly kind: "auth-rejected" | "auth-rotated" | "auth-revoked";
  readonly at: string;
  readonly tokenId?: string;
  readonly fingerprint?: string;
}

export interface HttpStoppedEvent {
  readonly kind: "kanmer-mcp-http-stopped";
  readonly at: string;
  readonly reason: "requested" | "forced-timeout";
}

export type HttpEvent = HttpSecurityEvent | HttpStoppedEvent;
type HttpEventInput = Omit<HttpSecurityEvent, "at"> | Omit<HttpStoppedEvent, "at">;

export interface HttpReadyEvent {
  kind: "kanmer-mcp-http-ready";
  version: 1;
  pid: number;
  host: string;
  port: number;
  endpoint: string;
  projectFingerprint: string;
  mode: "remote-http-v1";
  authRequired: true;
  supportedProtocolVersions: readonly string[];
}

interface Session {
  principal: string;
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  lastActive: number;
  inFlight: number;
  closing: boolean;
}

const DEFAULTS = Object.freeze({
  host: "127.0.0.1",
  port: 0,
  maxHeaderBytes: 16 * 1024,
  maxBodyBytes: 1_048_576,
  maxConnections: 64,
  requestTimeoutMs: 30_000,
  keepAliveTimeoutMs: 5_000,
  maxSessions: 32,
  maxSessionsPerPrincipal: 8,
  maxInFlight: 32,
  maxInFlightPerSession: 8,
  idleTtlMs: 15 * 60_000,
  sweepIntervalMs: 30_000,
  shutdownGraceMs: 5_000,
});

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "::1";
}

function positive(value: number, name: string, allowZero = false): number {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${name} must be a ${allowZero ? "non-negative" : "positive"} integer`);
  }
  return value;
}

function bounded(value: number, name: string, maximum: number): number {
  const result = positive(value, name);
  if (result > maximum) throw new Error(`${name} must be at most ${maximum}`);
  return result;
}

function validateOrigins(origins: readonly string[] | undefined): readonly string[] | undefined {
  if (origins === undefined) return undefined;
  return origins.map((origin) => {
    if (!origin || origin.includes("*") || origin.trim() !== origin) {
      throw new Error("allowedOrigins must contain exact origins");
    }
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new Error("allowedOrigins must contain valid origins"); }
    if (parsed.origin !== origin || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
      throw new Error("allowedOrigins must contain exact HTTP(S) origins");
    }
    return origin;
  });
}

function writeText(res: ServerResponse, status: number, body: string, headers: Record<string, string> = {}): void {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
}

async function readJson(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > maxBytes) throw new Error("request body too large");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("malformed JSON");
  }
}

/** A loopback-only, fail-closed host around the SDK Streamable HTTP transport. */
export class KanmerHttpHost {
  private readonly options: Required<Omit<HttpHostOptions, "allowedOrigins" | "onEvent" | "clock">> & Pick<HttpHostOptions, "allowedOrigins" | "onEvent" | "clock">;
  private readonly sessions = new Map<string, Session>();
  private readonly sockets = new Set<Socket>();
  private readonly httpServer: Server;
  private readonly sweepTimer: NodeJS.Timeout;
  private stopping = false;
  private stoppedEmitted = false;
  private inFlight = 0;

  private emit(event: HttpEventInput): void {
    try {
      this.options.onEvent?.({ ...event, at: new Date().toISOString() } as HttpEvent);
    } catch (error) {
      // Observer failures must not affect protocol responses, but they must
      // remain visible to the parent rather than disappearing silently.
      const detail = error instanceof Error ? error.message : String(error);
      process.stderr.write(`kanmer-mcp-http diagnostic observer failed: ${detail.slice(0, 256)}\n`);
    }
  }

  private now(): number { return this.options.clock?.() ?? Date.now(); }

  constructor(options: HttpHostOptions) {
    if (!options.authorizer) throw new Error("HTTP transport requires an authorizer");
    const host = options.host ?? DEFAULTS.host;
    if (!isLoopback(host)) throw new Error("HTTP transport may bind only to 127.0.0.1 or ::1");
    const port = options.port ?? DEFAULTS.port;
    positive(port, "port", true);
    if (port > 65_535) throw new Error("port must be at most 65535");
    const maxHeaderBytes = bounded(options.maxHeaderBytes ?? DEFAULTS.maxHeaderBytes, "maxHeaderBytes", 64 * 1024);
    this.options = {
      authorizer: options.authorizer,
      host,
      port,
      allowedOrigins: validateOrigins(options.allowedOrigins),
      onEvent: options.onEvent,
      clock: options.clock,
      maxHeaderBytes,
      maxBodyBytes: bounded(options.maxBodyBytes ?? DEFAULTS.maxBodyBytes, "maxBodyBytes", 10 * 1024 * 1024),
      maxConnections: bounded(options.maxConnections ?? DEFAULTS.maxConnections, "maxConnections", 4096),
      requestTimeoutMs: bounded(options.requestTimeoutMs ?? DEFAULTS.requestTimeoutMs, "requestTimeoutMs", 10 * 60_000),
      keepAliveTimeoutMs: bounded(options.keepAliveTimeoutMs ?? DEFAULTS.keepAliveTimeoutMs, "keepAliveTimeoutMs", 10 * 60_000),
      maxSessions: bounded(options.maxSessions ?? DEFAULTS.maxSessions, "maxSessions", 4096),
      maxSessionsPerPrincipal: bounded(options.maxSessionsPerPrincipal ?? DEFAULTS.maxSessionsPerPrincipal, "maxSessionsPerPrincipal", 4096),
      maxInFlight: bounded(options.maxInFlight ?? DEFAULTS.maxInFlight, "maxInFlight", 4096),
      maxInFlightPerSession: bounded(options.maxInFlightPerSession ?? DEFAULTS.maxInFlightPerSession, "maxInFlightPerSession", 1024),
      idleTtlMs: bounded(options.idleTtlMs ?? DEFAULTS.idleTtlMs, "idleTtlMs", 24 * 60 * 60_000),
      sweepIntervalMs: bounded(options.sweepIntervalMs ?? DEFAULTS.sweepIntervalMs, "sweepIntervalMs", 60 * 60_000),
      shutdownGraceMs: bounded(options.shutdownGraceMs ?? DEFAULTS.shutdownGraceMs, "shutdownGraceMs", 10 * 60_000),
    };
    this.httpServer = createServer({ maxHeaderSize: maxHeaderBytes }, (req, res) => void this.handle(req, res));
    this.httpServer.maxConnections = this.options.maxConnections;
    this.httpServer.requestTimeout = this.options.requestTimeoutMs;
    this.httpServer.keepAliveTimeout = this.options.keepAliveTimeoutMs;
    this.httpServer.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.on("close", () => this.sockets.delete(socket));
    });
    this.sweepTimer = setInterval(() => void this.sweep(), this.options.sweepIntervalMs);
    this.sweepTimer.unref();
  }

  async start(): Promise<HttpReadyEvent> {
    if (this.stopping) throw new Error("HTTP host is stopping");
    // Resolve the immutable project before binding. A failed root/board
    // resolution must never leave a listener or timer behind.
    const fingerprint = await projectFingerprint();
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => { this.httpServer.off("listening", onListening); reject(error); };
        const onListening = () => { this.httpServer.off("error", onError); resolve(); };
        this.httpServer.once("error", onError);
        this.httpServer.once("listening", onListening);
        this.httpServer.listen(this.options.port, this.options.host);
      });
      const address = this.httpServer.address();
      if (!address || typeof address === "string") throw new Error("HTTP listener did not return a TCP address");
      return {
        kind: "kanmer-mcp-http-ready",
        version: 1,
        pid: process.pid,
        host: this.options.host,
        port: address.port,
        endpoint: `http://${this.options.host}:${address.port}/mcp`,
        projectFingerprint: fingerprint,
        mode: "remote-http-v1",
        authRequired: true,
        supportedProtocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
      };
    } catch (error) {
      await this.rollbackStart();
      throw error;
    }
  }

  private async rollbackStart(): Promise<void> {
    this.stopping = true;
    clearInterval(this.sweepTimer);
    for (const socket of this.sockets) socket.destroy();
    if (this.httpServer.listening) {
      await new Promise<void>((resolve) => this.httpServer.close(() => resolve()));
    }
  }

  private originAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    if (!this.options.allowedOrigins) return false;
    try {
      const parsed = new URL(origin);
      return parsed.origin === origin && this.options.allowedOrigins.includes(origin);
    } catch { return false; }
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.stopping) return writeText(res, 503, "Service unavailable");
    let requestUrl: URL;
    try { requestUrl = new URL(req.url ?? "/", "http://kanmer.invalid"); }
    catch { return writeText(res, 404, "Not found"); }
    if (requestUrl.pathname !== "/mcp") return writeText(res, 404, "Not found");
    if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
      return writeText(res, 405, "Method not allowed", { allow: "POST, GET, DELETE" });
    }
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    if (!this.originAllowed(origin)) return writeText(res, 403, "Forbidden");
    if (this.inFlight >= this.options.maxInFlight) return writeText(res, 429, "Too many requests");
    this.inFlight++;
    let principal: string;
    try {
      try {
        const authorized = await this.options.authorizer.authorize({ headers: req.headers });
        principal = authorized.principal;
        if (!principal) throw new Error("empty principal");
      } catch {
        this.emit({ kind: "auth-rejected" });
        return writeText(res, 401, "Unauthorized", unauthorizedHeaders());
      }
      const sessionId = typeof req.headers["mcp-session-id"] === "string" ? req.headers["mcp-session-id"] : undefined;
      if (sessionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
        return writeText(res, 400, "Bad request");
      }
      const contentLength = req.headers["content-length"];
      if (req.method === "POST" && contentLength !== undefined) {
        const length = Number(contentLength);
        if (!Number.isSafeInteger(length) || length < 0) return writeText(res, 400, "Bad request");
        if (length > this.options.maxBodyBytes) return writeText(res, 413, "Bad request");
      }
      let body: unknown;
      if (req.method === "POST") {
        try { body = await readJson(req, this.options.maxBodyBytes); }
        catch (error) { return writeText(res, error instanceof Error && error.message === "request body too large" ? 413 : 400, "Bad request"); }
      }
      let session = sessionId ? this.sessions.get(sessionId) : undefined;
      if (session && session.principal !== principal) return writeText(res, 404, "Not found");
      if (session?.closing) return writeText(res, 404, "Not found");
      if (!session) {
        if (sessionId || req.method !== "POST" || !isInitializeRequest(body)) return writeText(res, 400, "Bad request");
        if (this.sessions.size >= this.options.maxSessions || this.sessionsFor(principal) >= this.options.maxSessionsPerPrincipal) return writeText(res, 429, "Session capacity reached");
        let created!: Session;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          onsessioninitialized: (id) => { this.sessions.set(id, created); },
        });
        const mcpServer = createKanmerMcpServer("remote-http-v1");
        created = { principal, transport, server: mcpServer, lastActive: this.now(), inFlight: 0, closing: false };
        transport.onclose = () => { const id = transport.sessionId; if (id) void this.closeSession(id); };
        await mcpServer.connect(transport);
        session = created;
      }
      if (session.inFlight >= this.options.maxInFlightPerSession) return writeText(res, 429, "Too many requests");
      session.lastActive = this.now();
      session.inFlight++;
      try { await session.transport.handleRequest(req, res, body); }
      finally { session.inFlight--; session.lastActive = this.now(); }
    } catch {
      if (!res.headersSent) writeText(res, 500, "Internal server error");
    } finally { this.inFlight--; }
  }

  private sessionsFor(principal: string): number {
    return [...this.sessions.values()].filter((session) => session.principal === principal).length;
  }

  private async sweep(): Promise<void> {
    const cutoff = this.now() - this.options.idleTtlMs;
    await Promise.all([...this.sessions.entries()].filter(([, session]) => session.lastActive < cutoff && session.inFlight === 0).map(([id]) => this.closeSession(id)));
  }

  async invalidatePrincipal(principal: string): Promise<void> {
    await Promise.all([...this.sessions.entries()].filter(([, session]) => session.principal === principal).map(([id]) => this.closeSession(id)));
  }

  /** Local-parent lifecycle control only; never exposed as an MCP tool. */
  async rotateBearerVerifier(verifier: BearerVerifier): Promise<void> {
    if (!(this.options.authorizer instanceof BearerAuthorizer)) throw new Error("REMOTE_AUTH_UNSUPPORTED_LIFECYCLE");
    const previous = this.options.authorizer.replace(verifier);
    try {
      if (previous) await this.invalidatePrincipal(previous);
    } catch (error) {
      this.options.authorizer.revoke();
      throw error;
    }
    this.emit({ kind: "auth-rotated", tokenId: verifier.tokenId, fingerprint: verifier.fingerprint });
  }

  /** Revocation closes active sessions and makes every subsequent request fail closed. */
  async revokeBearer(): Promise<void> {
    if (!(this.options.authorizer instanceof BearerAuthorizer)) throw new Error("REMOTE_AUTH_UNSUPPORTED_LIFECYCLE");
    const previous = this.options.authorizer.revoke();
    if (previous) await this.invalidatePrincipal(previous);
    this.emit({ kind: "auth-revoked" });
  }

  private async closeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session || session.closing) return;
    session.closing = true;
    this.sessions.delete(id);
    await Promise.allSettled([session.transport.close(), session.server.close()]);
  }

  async close(): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    clearInterval(this.sweepTimer);
    // Stop accepts first, then close/abort protocol state. A forced socket
    // cleanup is armed before awaiting either operation so a stuck transport
    // cannot make shutdown unbounded.
    const listenerClosed = new Promise<void>((resolve) => this.httpServer.close(() => resolve()));
    const sessionsClosed = Promise.all([...this.sessions.keys()].map((id) => this.closeSession(id)));
    let forced = false;
    const force = setTimeout(() => {
      forced = true;
      for (const socket of this.sockets) socket.destroy();
    }, this.options.shutdownGraceMs);
    force.unref();
    const completed = await Promise.race([
      Promise.all([listenerClosed, sessionsClosed]).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), this.options.shutdownGraceMs)),
    ]);
    if (!completed) forced = true;
    if (forced) {
      for (const socket of this.sockets) socket.destroy();
    }
    clearTimeout(force);
    if (!this.stoppedEmitted) {
      this.stoppedEmitted = true;
      this.emit({ kind: "kanmer-mcp-http-stopped", reason: forced ? "forced-timeout" : "requested" });
    }
  }
}

export function createKanmerHttpHost(options: HttpHostOptions): KanmerHttpHost {
  return new KanmerHttpHost(options);
}
