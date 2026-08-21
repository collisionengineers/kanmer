import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createKanmerMcpServer, projectFingerprint } from "./index.js";
import { unauthorizedHeaders } from "./http-auth.js";

export { BearerAuthorizer, generateBearerToken, verifierForToken } from "./http-auth.js";

export interface HttpAuthorizer {
  authorize(request: { headers: IncomingMessage["headers"] }): Promise<{ principal: string }>;
}

export interface HttpHostOptions {
  authorizer: HttpAuthorizer;
  host?: string;
  port?: number;
  allowedOrigins?: readonly string[];
  maxBodyBytes?: number;
  maxSessions?: number;
  maxSessionsPerPrincipal?: number;
  maxInFlight?: number;
  idleTtlMs?: number;
  sweepIntervalMs?: number;
  shutdownGraceMs?: number;
}

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
  maxBodyBytes: 1_048_576,
  maxSessions: 32,
  maxSessionsPerPrincipal: 8,
  maxInFlight: 32,
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
  private readonly options: Required<Omit<HttpHostOptions, "allowedOrigins">> & Pick<HttpHostOptions, "allowedOrigins">;
  private readonly sessions = new Map<string, Session>();
  private readonly sockets = new Set<Socket>();
  private readonly httpServer: Server;
  private readonly sweepTimer: NodeJS.Timeout;
  private stopping = false;
  private inFlight = 0;

  constructor(options: HttpHostOptions) {
    if (!options.authorizer) throw new Error("HTTP transport requires an authorizer");
    const host = options.host ?? DEFAULTS.host;
    if (!isLoopback(host)) throw new Error("HTTP transport may bind only to 127.0.0.1 or ::1");
    const port = options.port ?? DEFAULTS.port;
    positive(port, "port", true);
    if (port > 65_535) throw new Error("port must be at most 65535");
    this.options = {
      authorizer: options.authorizer,
      host,
      port,
      allowedOrigins: options.allowedOrigins,
      maxBodyBytes: positive(options.maxBodyBytes ?? DEFAULTS.maxBodyBytes, "maxBodyBytes"),
      maxSessions: positive(options.maxSessions ?? DEFAULTS.maxSessions, "maxSessions"),
      maxSessionsPerPrincipal: positive(options.maxSessionsPerPrincipal ?? DEFAULTS.maxSessionsPerPrincipal, "maxSessionsPerPrincipal"),
      maxInFlight: positive(options.maxInFlight ?? DEFAULTS.maxInFlight, "maxInFlight"),
      idleTtlMs: positive(options.idleTtlMs ?? DEFAULTS.idleTtlMs, "idleTtlMs"),
      sweepIntervalMs: positive(options.sweepIntervalMs ?? DEFAULTS.sweepIntervalMs, "sweepIntervalMs"),
      shutdownGraceMs: positive(options.shutdownGraceMs ?? DEFAULTS.shutdownGraceMs, "shutdownGraceMs"),
    };
    this.httpServer = createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => void this.handle(req, res));
    this.httpServer.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.on("close", () => this.sockets.delete(socket));
    });
    this.sweepTimer = setInterval(() => void this.sweep(), this.options.sweepIntervalMs);
    this.sweepTimer.unref();
  }

  async start(): Promise<HttpReadyEvent> {
    if (this.stopping) throw new Error("HTTP host is stopping");
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => { this.httpServer.off("listening", onListening); reject(error); };
      const onListening = () => { this.httpServer.off("error", onError); resolve(); };
      this.httpServer.once("error", onError);
      this.httpServer.once("listening", onListening);
      this.httpServer.listen(this.options.port, this.options.host);
    });
    const address = this.httpServer.address();
    if (!address || typeof address === "string") throw new Error("HTTP listener did not return a TCP address");
    return { kind: "kanmer-mcp-http-ready", version: 1, pid: process.pid, host: this.options.host, port: address.port, endpoint: `http://${this.options.host}:${address.port}/mcp`, projectFingerprint: projectFingerprint(), mode: "remote-http-v1", authRequired: true };
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
    if (req.url !== "/mcp") return writeText(res, 404, "Not found");
    if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
      return writeText(res, 405, "Method not allowed", { allow: "POST, GET, DELETE" });
    }
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    if (!this.originAllowed(origin)) return writeText(res, 403, "Forbidden");
    let principal: string;
    try {
      const authorized = await this.options.authorizer.authorize({ headers: req.headers });
      principal = authorized.principal;
      if (!principal) throw new Error("empty principal");
    } catch { return writeText(res, 401, "Unauthorized", unauthorizedHeaders()); }
    if (this.inFlight >= this.options.maxInFlight) return writeText(res, 429, "Too many requests");
    this.inFlight++;
    try {
      const sessionId = typeof req.headers["mcp-session-id"] === "string" ? req.headers["mcp-session-id"] : undefined;
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
        created = { principal, transport, server: mcpServer, lastActive: Date.now(), inFlight: 0, closing: false };
        transport.onclose = () => { const id = transport.sessionId; if (id) void this.closeSession(id); };
        await mcpServer.connect(transport);
        session = created;
      }
      session.lastActive = Date.now();
      session.inFlight++;
      try { await session.transport.handleRequest(req, res, body); }
      finally { session.inFlight--; session.lastActive = Date.now(); }
    } catch {
      if (!res.headersSent) writeText(res, 500, "Internal server error");
    } finally { this.inFlight--; }
  }

  private sessionsFor(principal: string): number {
    return [...this.sessions.values()].filter((session) => session.principal === principal).length;
  }

  private async sweep(): Promise<void> {
    const cutoff = Date.now() - this.options.idleTtlMs;
    await Promise.all([...this.sessions.entries()].filter(([, session]) => session.lastActive < cutoff && session.inFlight === 0).map(([id]) => this.closeSession(id)));
  }

  async invalidatePrincipal(principal: string): Promise<void> {
    await Promise.all([...this.sessions.entries()].filter(([, session]) => session.principal === principal).map(([id]) => this.closeSession(id)));
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
    // close() first stops new accepts; sessions are then closed before waiting
    // for keep-alive/SSE sockets, with a bounded forced cleanup fallback.
    const listenerClosed = new Promise<void>((resolve) => this.httpServer.close(() => resolve()));
    await Promise.all([...this.sessions.keys()].map((id) => this.closeSession(id)));
    const force = setTimeout(() => {
      for (const socket of this.sockets) socket.destroy();
    }, this.options.shutdownGraceMs);
    force.unref();
    await listenerClosed;
    clearTimeout(force);
  }
}

export function createKanmerHttpHost(options: HttpHostOptions): KanmerHttpHost {
  return new KanmerHttpHost(options);
}
