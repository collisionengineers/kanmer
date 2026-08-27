import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { KanmerStore, claimState, DEFAULT_CLAIM_EXPIRY_MINUTES, type Item } from "@kanmer/core";
import { inspectBoardSync, inspectBoardWorktree } from "./kanmerGit.js";
import { canonicalProjectPath, remoteProjectIdentity } from "./remoteAccess/identity.js";
import type {
  RegistryEndpointView,
  RegistryEntry,
  RegistryFile,
  RegistryHealth,
  RegistryProjectIdentity,
  RegistryView,
  RegistryWorkspaceView,
} from "../shared/ipc.js";

/**
 * GUI-side view of the FRD-029 named endpoint registry (GUI-144).
 *
 * This mirrors the file contract owned by
 * `packages/mcp-server/src/project-registry.ts` (MCP-054) byte-for-byte in
 * meaning: `{ schema: 1, endpoints: { <name>: { boardRoot, repoRoot?,
 * boardBranch?, policy? } } }` at `KANMER_ENDPOINT_REGISTRY` (absolute) else
 * `~/.kanmer/endpoints.json`. The server package ships no type declarations,
 * so the GUI keeps a mirror and a contract test rather than an import.
 *
 * Observation is read-only: every endpoint is inspected with a throw-away
 * `KanmerStore` that is never `init()`ed, so looking at a project never
 * writes to it. The GUI is the registry's only writer, and every write goes
 * through one in-process queue plus a stale-edit guard (MCP-054 F-001).
 */

export const ENDPOINT_REGISTRY_ENV = "KANMER_ENDPOINT_REGISTRY";
export const ENDPOINT_REGISTRY_SCHEMA = 1 as const;
export const ENDPOINT_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const POLICY_MAX = 64;
const POLICY_CONTROL = /[\u0000-\u001f\u007f]/;

const execFile = promisify(execFileCallback);

export type ParsedRegistry = { ok: true; file: RegistryFile } | { ok: false; error: string };

function isAbsolute(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value);
}

export function registryLocation(env: NodeJS.ProcessEnv, home: string): { path: string; source: "env" | "default"; error?: string } {
  const configured = env[ENDPOINT_REGISTRY_ENV]?.trim();
  if (configured) {
    if (!isAbsolute(configured)) return { path: configured, source: "env", error: `${ENDPOINT_REGISTRY_ENV} must be an absolute path` };
    return { path: configured, source: "env" };
  }
  return { path: path.join(home, ".kanmer", "endpoints.json"), source: "default" };
}

/** Problems with one entry; empty when well-formed. Same rules as the server module. */
export function validateEntry(name: string, entry: unknown): string[] {
  const problems: string[] = [];
  if (!ENDPOINT_NAME_RE.test(name)) problems.push(`name "${name}" must match ${ENDPOINT_NAME_RE}`);
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    problems.push("entry must be an object");
    return problems;
  }
  const record = entry as Record<string, unknown>;
  if (typeof record.boardRoot !== "string" || !record.boardRoot.trim()) problems.push("boardRoot is required");
  else if (!isAbsolute(record.boardRoot)) problems.push("boardRoot must be an absolute path");
  if (record.repoRoot !== undefined) {
    if (typeof record.repoRoot !== "string" || !record.repoRoot.trim()) problems.push("repoRoot must be a non-empty string");
    else if (!isAbsolute(record.repoRoot)) problems.push("repoRoot must be an absolute path");
  }
  if (record.boardBranch !== undefined && (typeof record.boardBranch !== "string" || !record.boardBranch.trim())) problems.push("boardBranch must be a non-empty string");
  if (record.policy !== undefined && typeof record.policy !== "string") problems.push("policy must be a string");
  return problems;
}

/** A policy label as the GUI accepts it from the renderer: short, printable, or absent. */
export function normalizePolicy(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("REGISTRY_POLICY_INVALID");
  const text = value.trim();
  if (!text) return undefined;
  if (text.length > POLICY_MAX || POLICY_CONTROL.test(text)) throw new Error("REGISTRY_POLICY_INVALID");
  return text;
}

export function assertEndpointName(value: unknown): asserts value is string {
  if (typeof value !== "string" || !ENDPOINT_NAME_RE.test(value)) throw new Error("REGISTRY_NAME_INVALID");
}

export function parseRegistry(text: string): ParsedRegistry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "registry is not valid JSON" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "registry must be a JSON object" };
  const record = parsed as Record<string, unknown>;
  if (record.schema !== ENDPOINT_REGISTRY_SCHEMA) return { ok: false, error: `registry schema must be ${ENDPOINT_REGISTRY_SCHEMA}` };
  if (!record.endpoints || typeof record.endpoints !== "object" || Array.isArray(record.endpoints)) {
    return { ok: false, error: "registry.endpoints must be an object keyed by endpoint name" };
  }
  return { ok: true, file: { schema: ENDPOINT_REGISTRY_SCHEMA, endpoints: record.endpoints as Record<string, RegistryEntry> } };
}

export interface RegistryReadResult {
  exists: boolean;
  /** The raw text, kept so a writer can prove the file did not change under it. */
  text: string | null;
  parsed: ParsedRegistry | null;
}

export async function readRegistry(file: string): Promise<RegistryReadResult> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false, text: null, parsed: null };
    return { exists: true, text: null, parsed: { ok: false, error: `registry could not be read: ${(error as Error).message}` } };
  }
  return { exists: true, text, parsed: parseRegistry(text) };
}

export function serializeRegistry(registry: RegistryFile): string {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// Observation
// ---------------------------------------------------------------------------

export interface ObservationDeps {
  inspectBoardBranch(boardRoot: string): Promise<string | null>;
  inspectBoardSync(boardRoot: string, branch: string): Promise<RegistryEndpointView["boardSync"]>;
  remoteOrigin(repoRoot: string): Promise<string | null>;
  machine(): string | null;
  now?: () => Date;
}

/** Same redaction as the server's `redactRemoteOrigin`: never report credentials embedded in a URL. */
export function redactRemoteOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return value.replace(/^([^@\s/]+)@/, "");
  }
}

async function gitRemoteOrigin(repoRoot: string): Promise<string | null> {
  try {
    const { stdout } = await execFile("git", ["remote", "get-url", "origin"], { cwd: repoRoot, windowsHide: true, timeout: 15_000 });
    return redactRemoteOrigin(stdout.trim());
  } catch {
    return null;
  }
}

export const productionObservationDeps: ObservationDeps = {
  inspectBoardBranch: async (boardRoot) => (await inspectBoardWorktree(boardRoot)).actualBranch,
  inspectBoardSync: (boardRoot, branch) => inspectBoardSync(boardRoot, branch),
  remoteOrigin: gitRemoteOrigin,
  machine: () => { try { return hostname() || null; } catch { return null; } },
};

/** Which registry entry names the selected project: logical id first, legacy fingerprint as the fallback. */
export function endpointMatches(project: RegistryProjectIdentity, selected: RegistryProjectIdentity | null): boolean {
  if (!selected) return false;
  if (selected.project_id !== null && project.project_id !== null) return selected.project_id === project.project_id;
  return selected.fingerprint === project.fingerprint;
}

function emptyView(name: string, entry: unknown, health: RegistryHealth, problems: string[]): RegistryEndpointView {
  const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
  return {
    name,
    boardRoot: typeof record.boardRoot === "string" ? record.boardRoot : "",
    repoRoot: typeof record.repoRoot === "string" ? record.repoRoot : null,
    boardBranch: typeof record.boardBranch === "string" ? record.boardBranch : null,
    policy: typeof record.policy === "string" ? record.policy : null,
    health,
    selected: false,
    project: null,
    location: null,
    boardSync: null,
    format: null,
    ticketCount: null,
    controllers: [],
    workspaces: [],
    problems,
  };
}

function optionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value ? value : null;
}

/** Controllers and workspaces as observable now: every taken ticket, classified live/expired, lease fields read defensively (CORE-115). */
export function claims(items: Item[], now: Date, minutes: number | undefined): { controllers: RegistryEndpointView["controllers"]; workspaces: RegistryWorkspaceView[] } {
  const byController = new Map<string, string[]>();
  const workspaces: RegistryWorkspaceView[] = [];
  for (const item of items) {
    if (item.type !== "ticket" || !item.taken_at) continue;
    const state = claimState(item, now, minutes ?? DEFAULT_CLAIM_EXPIRY_MINUTES);
    if (state === "unclaimed") continue;
    const controller = item.claim_controller || item.assignee || "unknown";
    byController.set(controller, [...(byController.get(controller) ?? []), item.id]);
    const raw = item as unknown as Record<string, unknown>;
    const leaseId = optionalString(raw, "lease_id");
    const revision = raw.lease_revision;
    workspaces.push({
      ticket: item.id,
      stage: item.status,
      branch: item.branch ?? null,
      worktree: item.worktree ?? null,
      controller,
      assignee: item.assignee || null,
      claim: state,
      takenAt: item.taken_at,
      expiresAt: item.claim_expires_at ?? null,
      lease: leaseId
        ? {
            id: leaseId,
            revision: typeof revision === "number" ? revision : null,
            phase: optionalString(raw, "lease_phase"),
            provider: optionalString(raw, "lease_provider"),
            workspace: optionalString(raw, "lease_workspace"),
            heartbeatAt: optionalString(raw, "lease_heartbeat_at"),
            controllerRun: optionalString(raw, "lease_controller_run"),
            workerRun: optionalString(raw, "lease_worker_run"),
          }
        : null,
    });
  }
  const controllers = [...byController.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([controller, tickets]) => ({ controller, tickets: tickets.sort() }));
  workspaces.sort((a, b) => a.ticket.localeCompare(b.ticket));
  return { controllers, workspaces };
}

function locationFingerprint(payload: { repoPath: string; boardPath: string; machine: string | null; boardBranch: string | null; remoteOrigin: string | null }): string {
  return `kanmer-loc-v1:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

/** Observe one endpoint. Never writes, never throws: a failure is `health: "error"` with the reason in `problems`. */
export async function observeEndpoint(name: string, entry: unknown, deps: ObservationDeps, selected: RegistryProjectIdentity | null): Promise<RegistryEndpointView> {
  const problems = validateEntry(name, entry);
  if (problems.length) return emptyView(name, entry, "invalid", problems);
  const { boardRoot, repoRoot, boardBranch, policy } = entry as RegistryEntry;
  const base = emptyView(name, entry, "error", []);
  try {
    const store = new KanmerStore(boardRoot, repoRoot ? { repoRoot } : {});
    if (!(await store.exists())) return { ...base, repoRoot: store.paths.repoRoot, health: "missing-board", problems: [`no .kanmer board at ${boardRoot}`] };
    const [format, { board, source }, record, listing, actualBranch] = await Promise.all([
      store.detectFormat(),
      store.getBoardWithSource(),
      store.getProject(),
      store.listItemsWithWarnings({ includeArchived: false }),
      deps.inspectBoardBranch(boardRoot),
    ]);
    const legacy = remoteProjectIdentity({ boardRoot, repoRoot: store.paths.repoRoot, format, boardSource: source });
    const project: RegistryProjectIdentity = {
      project_id: record?.project_id ?? null,
      board_id: record?.board_id ?? null,
      identity: record ? "logical" : "unassigned",
      origin: record?.origin ?? null,
      fingerprint: legacy.fingerprint,
    };
    const branchForSync = actualBranch ?? boardBranch ?? null;
    const [remoteOrigin, boardSync] = await Promise.all([
      deps.remoteOrigin(store.paths.repoRoot),
      branchForSync ? deps.inspectBoardSync(boardRoot, branchForSync) : Promise.resolve(null),
    ]);
    const locationPayload = {
      repoPath: canonicalProjectPath(store.paths.repoRoot),
      boardPath: canonicalProjectPath(boardRoot),
      machine: deps.machine(),
      boardBranch: actualBranch,
      remoteOrigin,
    };
    const { controllers, workspaces } = claims(listing.items, deps.now?.() ?? new Date(), board.claimExpiryMinutes);
    const observationProblems = listing.warnings.length ? [`${listing.warnings.length} board file warning(s)`] : [];
    if (boardBranch && actualBranch && boardBranch !== actualBranch) observationProblems.push(`board is on "${actualBranch}", registry expects "${boardBranch}"`);
    return {
      ...base,
      repoRoot: store.paths.repoRoot,
      boardBranch: boardBranch ?? actualBranch,
      policy: policy ?? null,
      health: project.identity === "logical" ? "ok" : "unassigned",
      selected: endpointMatches(project, selected),
      project,
      location: { ...locationPayload, fingerprint: locationFingerprint(locationPayload) },
      boardSync,
      format,
      ticketCount: listing.items.filter((item) => item.type === "ticket").length,
      controllers,
      workspaces,
      problems: observationProblems,
    };
  } catch (error) {
    return { ...base, health: "error", problems: [error instanceof Error ? error.message : String(error)] };
  }
}

export async function observeRegistry(env: NodeJS.ProcessEnv, home: string, deps: ObservationDeps, selected: RegistryProjectIdentity | null): Promise<RegistryView> {
  const location = registryLocation(env, home);
  const registry = { path: location.path, source: location.source, exists: false, error: location.error ?? null };
  if (location.error) return { registry, endpoints: [], selectedRegistered: false };
  const { exists, parsed } = await readRegistry(location.path);
  registry.exists = exists;
  if (!parsed) return { registry, endpoints: [], selectedRegistered: false };
  if (!parsed.ok) {
    registry.error = parsed.error;
    return { registry, endpoints: [], selectedRegistered: false };
  }
  const names = Object.keys(parsed.file.endpoints).sort();
  const endpoints = await Promise.all(names.map((name) => observeEndpoint(name, parsed.file.endpoints[name], deps, selected)));
  return { registry, endpoints, selectedRegistered: endpoints.some((endpoint) => endpoint.selected) };
}

// ---------------------------------------------------------------------------
// Writer — the GUI is the only process that writes the registry.
// ---------------------------------------------------------------------------

/**
 * Serialised registry writer. Every mutation is a read → mutate → verify →
 * atomic-rename step on one in-process queue, so two GUI writes can never
 * interleave (MCP-054 F-001). Before the rename the file is read again and
 * compared with the text the mutation was computed from: an operator editing
 * the file by hand in between gets `REGISTRY_CHANGED` instead of a silent
 * overwrite, and a malformed file is never replaced.
 */
export class ProjectRegistryWriter {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string, private readonly hooks: { afterRead?: () => Promise<void> } = {}) {
    if (!isAbsolute(file)) throw new Error("registry path must be absolute");
  }

  get path(): string {
    return this.file;
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.catch(() => undefined).then(work);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async mutate(change: (current: RegistryFile) => RegistryFile): Promise<RegistryFile> {
    return this.enqueue(async () => {
      const before = await readRegistry(this.file);
      if (before.exists && before.parsed && !before.parsed.ok) throw new Error(`REGISTRY_MALFORMED: ${before.parsed.error}`);
      const current: RegistryFile = before.parsed?.ok ? before.parsed.file : { schema: ENDPOINT_REGISTRY_SCHEMA, endpoints: {} };
      await this.hooks.afterRead?.();
      const next = change({ schema: ENDPOINT_REGISTRY_SCHEMA, endpoints: { ...current.endpoints } });
      const problems = Object.entries(next.endpoints).flatMap(([name, entry]) => validateEntry(name, entry).map((problem) => `${name}: ${problem}`));
      if (problems.length) throw new Error(`REGISTRY_INVALID: ${problems.join("; ")}`);
      const again = await readRegistry(this.file);
      if (again.text !== before.text) throw new Error("REGISTRY_CHANGED");
      await mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await writeFile(tmp, serializeRegistry(next), "utf8");
      await rename(tmp, this.file);
      return next;
    });
  }

  async upsert(name: string, entry: RegistryEntry): Promise<RegistryFile> {
    assertEndpointName(name);
    return this.mutate((current) => ({ ...current, endpoints: { ...current.endpoints, [name]: entry } }));
  }

  async rename(from: string, to: string): Promise<RegistryFile> {
    assertEndpointName(from);
    assertEndpointName(to);
    return this.mutate((current) => {
      const entry = current.endpoints[from];
      if (!entry) throw new Error("REGISTRY_ENDPOINT_MISSING");
      if (from === to) return current;
      if (current.endpoints[to]) throw new Error("REGISTRY_NAME_TAKEN");
      const endpoints = { ...current.endpoints };
      delete endpoints[from];
      endpoints[to] = entry;
      return { ...current, endpoints };
    });
  }

  async remove(name: string): Promise<RegistryFile> {
    assertEndpointName(name);
    return this.mutate((current) => {
      if (!current.endpoints[name]) throw new Error("REGISTRY_ENDPOINT_MISSING");
      const endpoints = { ...current.endpoints };
      delete endpoints[name];
      return { ...current, endpoints };
    });
  }

  async setPolicy(name: string, policy: string | undefined): Promise<RegistryFile> {
    assertEndpointName(name);
    return this.mutate((current) => {
      const entry = current.endpoints[name];
      if (!entry) throw new Error("REGISTRY_ENDPOINT_MISSING");
      const { policy: _previous, ...rest } = entry;
      return { ...current, endpoints: { ...current.endpoints, [name]: policy ? { ...rest, policy } : rest } };
    });
  }
}
