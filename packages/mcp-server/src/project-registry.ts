import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { KanmerStore, claimState, type Item } from "@kanmer/core";
import { projectIdentity, type LocationFingerprint, type LogicalProject } from "./project-identity.js";

/**
 * FRD-029 named endpoint registry (MCP-054).
 *
 * The registry is a small operator-owned JSON file that NAMES several
 * project-bound endpoints. It is a read surface only: one MCP process stays
 * bound to the one board it was started with, and nothing in here lets a
 * request pick another path. Where the file lives is decided by whoever
 * spawns the process (`KANMER_ENDPOINT_REGISTRY`, else `~/.kanmer/endpoints.json`)
 * — never by a tool argument (FRD-029 AC5).
 *
 * `writeRegistry`/`upsertEndpoint` exist for an operator tool or the GUI
 * (GUI-144); they are deliberately not reachable from any MCP tool.
 */

export const ENDPOINT_REGISTRY_ENV = "KANMER_ENDPOINT_REGISTRY";
export const ENDPOINT_REGISTRY_SCHEMA = 1 as const;
/** One registry name: short, lowercase, filesystem- and URL-safe. */
export const ENDPOINT_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface EndpointEntry {
  /** Absolute path of the folder containing `.kanmer` (the board). */
  boardRoot: string;
  /** Absolute path governing-doc refs resolve against; defaults like the server does. */
  repoRoot?: string;
  /** Expected board branch (informational). */
  boardBranch?: string;
  /** Operator-declared delivery policy label, echoed back; CORE-116 defines its semantics. */
  policy?: string;
}

export interface EndpointRegistryFile {
  schema: typeof ENDPOINT_REGISTRY_SCHEMA;
  endpoints: Record<string, EndpointEntry>;
}

export interface RegistryLocation {
  path: string;
  source: "env" | "default";
}

export type ParsedRegistry =
  | { ok: true; file: EndpointRegistryFile }
  | { ok: false; error: string };

export type EndpointHealth = "ok" | "unassigned" | "missing-board" | "invalid" | "error";

export interface EndpointController {
  controller: string;
  tickets: string[];
}

export interface EndpointWorkspace {
  ticket: string;
  branch: string | null;
  worktree: string | null;
  controller: string;
  claim: "live" | "expired";
  expiresAt: string | null;
}

export interface BoardSyncLike {
  remoteBranch: string;
  localSha: string | null;
  remoteSha: string | null;
  ahead: number;
  behind: number;
}

export interface EndpointObservation {
  name: string;
  boardRoot: string;
  repoRoot: string | null;
  boardBranch: string | null;
  policy: string | null;
  health: EndpointHealth;
  /** True when this endpoint IS the project the answering process is bound to. */
  bound: boolean;
  project: LogicalProject | null;
  location: LocationFingerprint | null;
  boardSync: BoardSyncLike | null;
  format: number | null;
  boardSource: "file" | "default" | null;
  ticketCount: number | null;
  controllers: EndpointController[];
  workspaces: EndpointWorkspace[];
  problems: string[];
}

export interface RegistryObservation {
  registry: { path: string; source: "env" | "default"; exists: boolean; error: string | null };
  endpoints: EndpointObservation[];
}

/** The git/os probes the server already owns, injected so the unit test can stub them. */
export interface ObservationDeps {
  inspectBoardBranch(root: string): Promise<string | null>;
  inspectBoardSync(root: string, branch: string): Promise<BoardSyncLike | null>;
  resolveLocation(input: { repoPath: string; boardPath: string; boardBranch: string | null }): Promise<LocationFingerprint>;
  now?: () => Date;
}

function isAbsolute(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value);
}

export function registryLocation(env: NodeJS.ProcessEnv, home: string): RegistryLocation & { error?: string } {
  const configured = env[ENDPOINT_REGISTRY_ENV]?.trim();
  if (configured) {
    if (!isAbsolute(configured)) {
      return { path: configured, source: "env", error: `${ENDPOINT_REGISTRY_ENV} must be an absolute path` };
    }
    return { path: configured, source: "env" };
  }
  return { path: path.join(home, ".kanmer", "endpoints.json"), source: "default" };
}

/** Problems with one entry; empty when it is well-formed. Never throws. */
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
  if (record.boardBranch !== undefined && (typeof record.boardBranch !== "string" || !record.boardBranch.trim())) {
    problems.push("boardBranch must be a non-empty string");
  }
  if (record.policy !== undefined && typeof record.policy !== "string") problems.push("policy must be a string");
  return problems;
}

/** Parse the registry text. Entries are NOT validated here: an invalid entry is reported per endpoint, never dropped. */
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
  return { ok: true, file: { schema: ENDPOINT_REGISTRY_SCHEMA, endpoints: record.endpoints as Record<string, EndpointEntry> } };
}

export async function readRegistry(file: string): Promise<{ exists: boolean; parsed: ParsedRegistry | null }> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false, parsed: null };
    return { exists: true, parsed: { ok: false, error: `registry could not be read: ${(error as Error).message}` } };
  }
  return { exists: true, parsed: parseRegistry(text) };
}

function invalidObservation(name: string, entry: unknown, problems: string[]): EndpointObservation {
  const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
  return {
    name,
    boardRoot: typeof record.boardRoot === "string" ? record.boardRoot : "",
    repoRoot: typeof record.repoRoot === "string" ? record.repoRoot : null,
    boardBranch: typeof record.boardBranch === "string" ? record.boardBranch : null,
    policy: typeof record.policy === "string" ? record.policy : null,
    health: "invalid",
    bound: false,
    project: null,
    location: null,
    boardSync: null,
    format: null,
    boardSource: null,
    ticketCount: null,
    controllers: [],
    workspaces: [],
    problems,
  };
}

/** Which registry entry names the bound project: logical id first, legacy fingerprint as the fallback. */
export function endpointMatches(project: LogicalProject, bound: LogicalProject | null): boolean {
  if (!bound) return false;
  if (bound.project_id !== null && project.project_id !== null) return bound.project_id === project.project_id;
  return bound.fingerprint === project.fingerprint;
}

/**
 * Observe one endpoint with a throw-away read-only store. Never `init()`s,
 * never writes, never throws: a failure is `health: "error"` with the reason
 * in `problems`. The bound process's own snapshot is untouched — the caller
 * passes its project in and this returns a fresh one per endpoint.
 */
export async function observeEndpoint(
  name: string,
  entry: unknown,
  deps: ObservationDeps,
  bound: LogicalProject | null,
): Promise<EndpointObservation> {
  const problems = validateEntry(name, entry);
  if (problems.length) return invalidObservation(name, entry, problems);
  const { boardRoot, repoRoot, boardBranch, policy } = entry as EndpointEntry;
  const base = invalidObservation(name, entry, []);
  try {
    const store = new KanmerStore(boardRoot, repoRoot ? { repoRoot } : {});
    const exists = await store.exists();
    if (!exists) return { ...base, repoRoot: store.paths.repoRoot, health: "missing-board", problems: [`no .kanmer board at ${boardRoot}`] };
    const [format, { source }, record, listing, actualBranch] = await Promise.all([
      store.detectFormat(),
      store.getBoardWithSource(),
      store.getProject(),
      store.listItemsWithWarnings({ includeArchived: false }),
      deps.inspectBoardBranch(boardRoot),
    ]);
    const legacy = projectIdentity({ boardRoot, format, repoRoot: store.paths.repoRoot, boardSource: source });
    const project: LogicalProject = {
      project_id: record?.project_id ?? null,
      board_id: record?.board_id ?? null,
      identity: record ? "logical" : "unassigned",
      origin: record?.origin ?? null,
      fingerprint: legacy.fingerprint,
    };
    const branchForSync = actualBranch ?? boardBranch ?? null;
    const [location, boardSync] = await Promise.all([
      deps.resolveLocation({ repoPath: store.paths.repoRoot, boardPath: boardRoot, boardBranch: actualBranch }),
      branchForSync ? deps.inspectBoardSync(boardRoot, branchForSync) : Promise.resolve(null),
    ]);
    const { board } = await store.getBoardWithSource();
    const { controllers, workspaces } = claims(listing.items, deps.now?.() ?? new Date(), board.claimExpiryMinutes);
    const observationProblems = listing.warnings.length ? [`${listing.warnings.length} board file warning(s)`] : [];
    if (boardBranch && actualBranch && boardBranch !== actualBranch) observationProblems.push(`board is on "${actualBranch}", registry expects "${boardBranch}"`);
    return {
      ...base,
      repoRoot: store.paths.repoRoot,
      boardBranch: boardBranch ?? actualBranch,
      policy: policy ?? null,
      health: project.identity === "logical" ? "ok" : "unassigned",
      bound: endpointMatches(project, bound),
      project,
      location,
      boardSync,
      format,
      boardSource: source,
      ticketCount: listing.items.filter((item) => item.type === "ticket").length,
      controllers,
      workspaces,
      problems: observationProblems,
    };
  } catch (error) {
    return { ...base, health: "error", problems: [error instanceof Error ? error.message : String(error)] };
  }
}

/** Active controllers and workspaces as observable now: every taken ticket, classified live/expired. */
function claims(items: Item[], now: Date, minutes: number | undefined): { controllers: EndpointController[]; workspaces: EndpointWorkspace[] } {
  const byController = new Map<string, string[]>();
  const workspaces: EndpointWorkspace[] = [];
  for (const item of items) {
    if (item.type !== "ticket" || !item.taken_at) continue;
    const state = claimState(item, now, minutes);
    if (state === "unclaimed") continue;
    const controller = item.claim_controller || item.assignee || "unknown";
    byController.set(controller, [...(byController.get(controller) ?? []), item.id]);
    workspaces.push({
      ticket: item.id,
      branch: item.branch ?? null,
      worktree: item.worktree ?? null,
      controller,
      claim: state,
      expiresAt: item.claim_expires_at ?? null,
    });
  }
  const controllers = [...byController.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([controller, tickets]) => ({ controller, tickets: tickets.sort() }));
  workspaces.sort((a, b) => a.ticket.localeCompare(b.ticket));
  return { controllers, workspaces };
}

/** Observe the whole registry. `bound` is the answering process's own project, so the caller can mark its entry. */
export async function observeRegistry(
  env: NodeJS.ProcessEnv,
  home: string,
  deps: ObservationDeps,
  bound: LogicalProject | null,
  filter?: { name?: string },
): Promise<RegistryObservation & { missing: string[] }> {
  const location = registryLocation(env, home);
  const registry = { path: location.path, source: location.source, exists: false, error: location.error ?? null };
  if (location.error) return { registry, endpoints: [], missing: filter?.name ? [filter.name] : [] };
  const { exists, parsed } = await readRegistry(location.path);
  registry.exists = exists;
  if (!parsed) return { registry, endpoints: [], missing: filter?.name ? [filter.name] : [] };
  if (!parsed.ok) {
    registry.error = parsed.error;
    return { registry, endpoints: [], missing: filter?.name ? [filter.name] : [] };
  }
  const names = Object.keys(parsed.file.endpoints).sort();
  const selected = filter?.name ? names.filter((name) => name === filter.name) : names;
  const endpoints = await Promise.all(selected.map((name) => observeEndpoint(name, parsed.file.endpoints[name], deps, bound)));
  return { registry, endpoints, missing: filter?.name && !selected.length ? [filter.name] : [] };
}

/** Validate then atomically write a registry. For operator tooling / the GUI (GUI-144); not an MCP surface. */
export async function writeRegistry(file: string, registry: EndpointRegistryFile): Promise<void> {
  if (!isAbsolute(file)) throw new Error("registry path must be absolute");
  if (registry.schema !== ENDPOINT_REGISTRY_SCHEMA) throw new Error(`registry schema must be ${ENDPOINT_REGISTRY_SCHEMA}`);
  const problems = Object.entries(registry.endpoints).flatMap(([name, entry]) => validateEntry(name, entry).map((p) => `${name}: ${p}`));
  if (problems.length) throw new Error(`registry is invalid: ${problems.join("; ")}`);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  await rename(tmp, file);
}

/** Add or replace one named endpoint, creating the registry when absent. */
export async function upsertEndpoint(file: string, name: string, entry: EndpointEntry): Promise<EndpointRegistryFile> {
  const { exists, parsed } = await readRegistry(file);
  if (exists && parsed && !parsed.ok) throw new Error(parsed.error);
  const current = parsed?.ok ? parsed.file : { schema: ENDPOINT_REGISTRY_SCHEMA, endpoints: {} };
  const next: EndpointRegistryFile = { schema: ENDPOINT_REGISTRY_SCHEMA, endpoints: { ...current.endpoints, [name]: entry } };
  await writeRegistry(file, next);
  return next;
}
