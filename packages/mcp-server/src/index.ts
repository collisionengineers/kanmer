import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { homedir, hostname } from "node:os";
import { promisify } from "node:util";
import { z } from "zod";
import {
  BOUNDARIES,
  DOC_TYPES,
  GATE_EXEMPT_DIRS,
  KanmerStore,
  STAGES,
  STAGE_IDS,
  computeBlockedIds,
  detectStaleness,
  getLinkGraph,
  lastStageId,
  linkItems,
  migrateBoard,
  repoDocsMap,
  resolveSources,
  SourceDeclarationArraySchema,
  resolveGroupKinds,
  resolveProfiles,
  resolveProofTypes,
  serialiseItem,
  DispatchSupervisor,
  dispatchDeliverableProven,
  dispatchTaskById,
  taskFeasibility,
  takeTicketPromptText,
  leaseConfig,
  LEASE_PHASES,
  watchKanmer,
  type Item,
  type RootSource,
  type WatchHandle,
} from "@kanmer/core";
import { resolveProjectRoot, resolveRepoRoot } from "./root.js";
import { SERVER_VERSION, serverIdentity } from "./identity.js";
import { bundledSkillsDir } from "./bundled.js";
import { readTicketDocuments } from "./ticket-docs.js";
import { getExecutionPacket } from "./execution-packet.js";
import { collectReconciliationEvidence, leaseRecoverySummary, reconcileTicket } from "./reconciliation.js";
import { failCoded, KanmerError, type ResponseProject } from "./errors.js";
import {
  expectedProjectMatches,
  locationFingerprint,
  projectIdentity,
  redactRemoteOrigin,
  type LocationFingerprint,
  type LogicalProject,
} from "./project-identity.js";
import { dispatchPolicyView, parseDispatchPolicy } from "./dispatch-policy.js";
import { ENDPOINT_REGISTRY_ENV, observeRegistry, type ObservationDeps } from "./project-registry.js";
import { fetchLlmsTxt, LLMS_TXT_POLICY, validateLlmsSource } from "./sources.js";

export { createPinnedLookup, fetchLlmsTxt, LLMS_TXT_POLICY, validateLlmsSource } from "./sources.js";

const execFile = promisify(execFileCallback);

/**
 * Observational twin of apps/gui/src/main/kanmerGit.ts's board branch probe.
 * Keep these small copies local: core must not spawn Git and must not depend on
 * Electron, while the GUI must not depend on the MCP server package.
 */
async function inspectBoardBranch(root: string): Promise<string | null> {
  try {
    const { stdout } = await execFile("git", ["symbolic-ref", "--short", "HEAD"], {
      cwd: root,
      windowsHide: true,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export interface BoardSyncState {
  remoteBranch: string;
  localSha: string | null;
  remoteSha: string | null;
  /** Local board commits not on the last-fetched remote ref (unpushed). */
  ahead: number;
  /** Remote commits not in the local board (unpulled). */
  behind: number;
}

/**
 * Observational twin of the GUI's `inspectBoardSync` (CORE-123): compares the
 * board worktree HEAD with its last-fetched `origin/<branch>` ref so a stalled
 * board push is visible to agents. Never fetches, never throws; `null` when the
 * board is not a Git checkout or has no remote-tracking ref for the branch.
 */
async function inspectBoardSync(root: string, branch: string): Promise<BoardSyncState | null> {
  const run = async (args: string[]): Promise<string | null> => {
    try {
      const { stdout } = await execFile("git", args, { cwd: root, windowsHide: true, timeout: 15_000 });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  };
  const localSha = await run(["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!localSha) return null;
  const remoteRef = `refs/remotes/origin/${branch}`;
  const remoteSha = await run(["rev-parse", "--verify", `${remoteRef}^{commit}`]);
  if (!remoteSha) return null;
  const counts = await run(["rev-list", "--left-right", "--count", `HEAD...${remoteRef}`]);
  const [ahead, behind] = (counts ?? "0\t0").split(/\s+/).map((value) => Number.parseInt(value, 10));
  return {
    remoteBranch: branch,
    localSha,
    remoteSha,
    ahead: Number.isFinite(ahead) ? ahead : 0,
    behind: Number.isFinite(behind) ? behind : 0,
  };
}

function boardWorktreeRepair(
  boardSource: "file" | "default",
  actualBranch: string | null,
  expectedBranch: string,
  path: string,
): string {
  if (boardSource === "default") {
    return `This path is serving a synthesized default board; check ${path} when tickets are expected.`;
  }
  if (actualBranch === expectedBranch) return "No repair is required.";
  if (actualBranch) {
    return `Board worktree is on "${actualBranch}", expected "${expectedBranch}". Restore the board worktree through Kanmer setup or board Git repair.`;
  }
  return `Board branch inspection failed or HEAD is detached. Restore ${path} to "${expectedBranch}" through Kanmer setup or board Git repair.`;
}

/**
 * Root resolution happens inside `main()`, not here — see `resolveRoot()`
 * below. These bindings are assigned before the transport connects, and every
 * handler closure below reads them by name, so none of them needs to know.
 *
 * Why not `const` at module scope, as it was: `resolveProjectRoot` can now
 * throw (no board found anywhere), and a throw at module-evaluation time never
 * reaches `main().catch` at the foot of this file — the host reports only
 * "server failed to start" and the diagnostic naming every path tried is lost.
 * A diagnostic nobody sees is the same invisibility this change exists to end.
 * ADR-0012 §Decision 11.
 */
let projectRoot!: string;
let rootSource!: RootSource;
let repoRootSource!: RepoRootSource;
let store!: KanmerStore;
let rootResolved = false;

/**
 * How the *repo* root was arrived at — the sibling of `rootSource` for the
 * second root. `derived` means neither `--repo-root` nor `KANMER_REPO_ROOT`
 * was given and core worked it out from the board path (`deriveRepoRoot`,
 * falling back to the board root itself).
 *
 * Reported because it is half of a real, measured, previously invisible
 * divergence: this repo's `.codex/config.toml` passes `--repo-root` and its
 * `.mcp.json` does not, so the two hosts resolved governing-doc `refs` against
 * different trees while `get_status` said nothing. MCP-012.
 */
type RepoRootSource = "flag" | "env" | "derived";

/** Resolve the board root and build the store. Called once, at the top of main(). */
function resolveRoot(): void {
  const argv = process.argv.slice(2);
  const resolved = resolveProjectRoot(argv, process.env);
  const repoRoot = resolveRepoRoot(argv, process.env);
  projectRoot = resolved.root;
  rootSource = resolved.how;
  // Classified here, where resolveRepoRoot's inputs are still in scope — the
  // store keeps only the resolved value, not how it was reached. Keyed off the
  // resolved value first, so a valueless `--repo-root` (which readFlag ignores)
  // is not reported as "flag" when nothing actually came of it.
  const repoRootFlag = argv.some((a) => a === "--repo-root" || a.startsWith("--repo-root="));
  repoRootSource = repoRoot === undefined ? "derived" : repoRootFlag ? "flag" : "env";
  store = new KanmerStore(projectRoot, { repoRoot });
  rootResolved = true;
}

/**
 * The last logical project this process resolved. `ok()`/`guard()` are
 * synchronous result builders, so they decorate with this snapshot; every
 * handler refreshes it through `resolveProject()` (get_status, every write,
 * and the read paths that already compute the identity) before building a
 * result. It is per-process because a process is bound to one project.
 */
let lastProject: ResponseProject | null = null;

/** The `structuredContent.project` block — FRD-029 "every response identifies the logical project". */
function responseProject(project: LogicalProject): ResponseProject {
  return { project_id: project.project_id, board_id: project.board_id, fingerprint: project.fingerprint };
}

/** The one result shape every handler returns: text for every client, structured extras for those that read them. */
type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

/** JSON tool result; the text payload is unchanged, the project rides in structuredContent. */
function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    ...(lastProject ? { structuredContent: { project: lastProject } } : {}),
  };
}

/** Error tool result (surfaced to the model, not a protocol failure). */
function fail(message: string): ToolResult {
  return failCoded(new Error(message), lastProject ?? undefined);
}

/** Wrap a handler so thrown errors become clean isError results. */
function guard<A extends unknown[]>(fn: (...args: A) => Promise<ToolResult>) {
  return async (...args: A): Promise<ToolResult> => {
    try {
      if (!lastProject) await resolveProject();
      return await fn(...args);
    } catch (err) {
      return failCoded(err, lastProject ?? undefined);
    }
  };
}

/**
 * The legacy machine-local fingerprint (`kanmer-proj-v1`). Unchanged bytes:
 * it is the auditable fallback a migrated board records, and what pre-FRD-029
 * clients still send as `expected_project`.
 */
async function legacyIdentity() {
  const format = await store.detectFormat();
  const { source } = await store.getBoardWithSource();
  return projectIdentity({ boardRoot: projectRoot, format, repoRoot: store.paths.repoRoot, boardSource: source });
}

/** Resolve the logical project from `.kanmer/project.json` plus the legacy fingerprint, and remember it. */
async function resolveProject(): Promise<LogicalProject> {
  const [record, legacy] = await Promise.all([store.getProject(), legacyIdentity()]);
  const project: LogicalProject = {
    project_id: record?.project_id ?? null,
    board_id: record?.board_id ?? null,
    identity: record ? "logical" : "unassigned",
    origin: record?.origin ?? null,
    fingerprint: legacy.fingerprint,
  };
  lastProject = responseProject(project);
  return project;
}

/**
 * Where the board physically is (FRD-029 location fingerprint). Observational:
 * Git failures and a missing remote are reported as null, never thrown, and
 * none of it feeds the logical identity.
 */
async function resolveLocation(): Promise<LocationFingerprint> {
  const boardBranch = await inspectBoardBranch(projectRoot);
  return resolveLocationFor({ repoPath: store.paths.repoRoot, boardPath: projectRoot, boardBranch });
}

/** Root-parameterised twin of `resolveLocation` so the endpoint registry (MCP-054) can observe any board, not only the bound one. */
async function resolveLocationFor(input: { repoPath: string; boardPath: string; boardBranch: string | null }): Promise<LocationFingerprint> {
  let remoteOrigin: string | null = null;
  try {
    const { stdout } = await execFile("git", ["config", "--get", "remote.origin.url"], {
      cwd: input.boardPath,
      windowsHide: true,
      timeout: 15_000,
    });
    remoteOrigin = redactRemoteOrigin(stdout.trim());
  } catch {
    remoteOrigin = null;
  }
  let machine: string | null = null;
  try {
    machine = hostname() || null;
  } catch {
    machine = null;
  }
  return locationFingerprint({
    repoPath: input.repoPath,
    boardPath: input.boardPath,
    machine,
    boardBranch: input.boardBranch,
    remoteOrigin,
  });
}

/** The probes the registry observes every endpoint with — the same git/os calls `get_status` uses for the bound board. */
const registryObservationDeps: ObservationDeps = { inspectBoardBranch, inspectBoardSync, resolveLocation: resolveLocationFor };

/** The WRONG_PROJECT refusal, raised before actor attribution, initialisation or any store call. */
async function assertExpectedProject(expected: string | undefined): Promise<LogicalProject> {
  const project = await resolveProject();
  if (expected !== undefined && !expectedProjectMatches(expected, project)) {
    const accepted =
      project.project_id === null
        ? `this board has no logical project_id yet (identity unassigned); its fingerprint is ${project.fingerprint}`
        : `this project is project_id ${project.project_id} (fingerprint ${project.fingerprint})`;
    throw new KanmerError("WRONG_PROJECT", `expected project ${expected} does not match: ${accepted}`);
  }
  return project;
}

/**
 * Create the .kanmer skeleton on first write — never merely because we booted.
 * The first write is also where a legacy board receives its one-time logical
 * identity; the fingerprint it was known by is passed along as the auditable
 * fallback (FRD-029 edge case).
 */
let initialised = false;
async function ensureInit() {
  if (initialised) return;
  const legacy = await legacyIdentity();
  await store.init({ fallbackFingerprint: legacy.fingerprint });
  initialised = true;
  await resolveProject();
}

/**
 * Who is calling: the per-request `_meta` client identity, else the
 * clientInfo negotiated at initialize, else "agent". Used to default
 * take_ticket's assignee and to attribute activity-log entries.
 *
 * The `io.modelcontextprotocol/client` key is the 2026-07-28 spec's client-
 * identity carrier. SDK 1.30 negotiates at most protocol 2025-11-25 and no
 * 2025-11-25 host sends that key, so in practice today the actor comes from
 * getClientVersion(). The branch is kept deliberately — it is the forward
 * path, and the SDK does deliver params._meta to handlers on every protocol
 * — and it is exercised for real by smoke-protocol.mjs.
 */
function actorName(requestServer: McpServer, extra?: unknown): string {
  const meta = (extra as { _meta?: Record<string, unknown> } | undefined)?._meta;
  const candidates = [
    (meta?.["io.modelcontextprotocol/client"] as { name?: string } | undefined)?.name,
    (meta?.["clientInfo"] as { name?: string } | undefined)?.name,
  ];
  for (const c of candidates) if (typeof c === "string" && c) return c;
  return requestServer.server.getClientVersion()?.name ?? "agent";
}

/**
 * Ask the host to confirm a destructive operation when it supports
 * elicitation; hosts without the capability proceed as before (their own
 * approval flow is the gate there). Returns false only on an explicit
 * decline/cancel.
 */
async function confirmDestructive(requestServer: McpServer, message: string): Promise<boolean> {
  if (!requestServer.server.getClientCapabilities()?.elicitation) return true;
  try {
    const res = await requestServer.server.elicitInput({
      message,
      requestedSchema: {
        type: "object",
        properties: {
          confirm: { type: "boolean", description: "true to proceed" },
        },
        required: ["confirm"],
      },
    });
    return res.action === "accept" && (res.content as { confirm?: boolean })?.confirm === true;
  } catch {
    // Capability advertised but the round-trip failed — treat as unsupported.
    return true;
  }
}

/**
 * Trim an item to a list-friendly summary (no body). Every key is always
 * present so agents never have to guess whether an absent key means "no" or
 * "not reported": docs/checklist are null for legacy-layout items, taken is
 * null when the ticket isn't taken, order/refs/deployment are null when unset.
 */
async function summarise(item: Item, blockedIds: Set<string>) {
  const info = item.type === "ticket" ? await store.getTicketDocsInfo(item.id) : null;
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    status: item.status,
    area: item.area,
    profile: item.profile ?? null,
    groups: item.groups ?? null,
    assignee: item.assignee,
    labels: item.labels,
    order: item.order ?? null,
    blocked: blockedIds.has(item.id),
    refs: item.refs ?? null,
    deployment: item.deployment ?? null,
    created: item.created,
    updated: item.updated,
    archived: item.archived,
    taken: item.taken_at
      ? { taken_at: item.taken_at, branch: item.branch ?? null, worktree: item.worktree ?? null }
      : null,
    docs: info?.docs ?? null,
    documentPaths: info?.documentPaths ?? null,
    checklist: info?.checklist ?? null,
  };
}

/** Which item ids are currently blocked (live blocker, per the whole board). */
async function blockedSet(): Promise<Set<string>> {
  const all = await store.listItems({ includeArchived: true });
  return computeBlockedIds(all, lastStageId());
}

const itemTypeEnum = z.enum(["ticket", "plan", "research"]);
// Doc names are per-area configurable data now (board.docs); core validates a
// write against the ticket area's set, so the wire type is a plain string.
const ticketDocEnum = z.string();
// Areas are the only configurable column: stages are constants (ADR-0002)
// and priority is gone (ADR-0006).
const columnKindEnum = z.literal("area");

const createFields = {
  type: itemTypeEnum.default("ticket").describe("ticket | plan | research (v2 boards: ticket only)"),
  title: z.string().describe("Short title"),
  status: z.string().optional().describe("Status id / workflow stage (defaults to the first stage)"),
  area: z.string().optional().describe("Area id (see list_board → areas)"),
  assignee: z.string().optional(),
  profile: z
    .string()
    .optional()
    .describe(
      "Requirement profile — which documents each stage boundary needs of this ticket. feature | fix | chore | spike | custom (see list_board → profiles). Omit to inherit the area default, then the board default.",
    ),
  requires: z
    .record(z.array(z.string()))
    .optional()
    .describe(
      "Inline requirements, honoured only when profile is \"custom\": { \"leave-preparing\": [\"plan\"], \"enter-done\": [\"proof:visual\"] }. An empty map means no requirements.",
    ),
  groups: z.array(z.string()).optional().describe("Group ids this ticket belongs to (must exist)"),
  labels: z.array(z.string()).optional(),
  links: z.array(z.string()).optional().describe("Ids of related items (must exist)"),
  blocks: z.array(z.string()).optional().describe("Ids this item blocks (must exist)"),
  refs: z
    .array(z.string())
    .optional()
    .describe("Repo-relative paths to governing docs (PRD/FRD/ADR); each must exist"),
  docs_todo: z
    .boolean()
    .optional()
    .describe("A governing doc is still to be created — satisfies the leave-backlog gate"),
  commits: z.array(z.string()).optional().describe("Commit SHAs associated with this ticket"),
  prs: z.array(z.string()).optional().describe("PR references (number or URL)"),
  deployment: z
    .string()
    .optional()
    .describe("Deployment status (only when the board declares environments): n/a | not-deployed | <env-id>"),
  body: z.string().optional().describe("Markdown body; may contain [[id]] wiki-links"),
};

const expectedProjectField = z
  .string()
  .optional()
  .describe("Optional project fingerprint from get_status.project.fingerprint; send only when get_status.compat.expectedProject is optional");

/**
 * FRD-029 document-inclusive revision CAS. Optional this release so clients
 * written for older servers keep working; a stale token is refused with
 * REVISION_CONFLICT before any write.
 */
const expectedRevisionField = z
  .string()
  .optional()
  .describe(
    "Optimistic concurrency over the WHOLE ticket: the `revision` you last read from get_item (or set_ticket_doc / get_execution_packet). " +
      "Unlike expected_updated it also changes when any pipeline document (plan, proof, review record) is rewritten. Rejected with REVISION_CONFLICT if anything changed since; nothing is written.",
  );

function withProject<T extends z.ZodRawShape>(shape: T): T & { expected_project: typeof expectedProjectField } {
  return { ...shape, expected_project: expectedProjectField };
}

// The version is the build-time-injected release, not a hardcoded literal: the
// old "0.1.0" here was two minor versions stale and never bumped by anything.
// `get_status.server.version` reports the same value — one fact, one source.
export type ExposurePolicy = "local-stdio" | "remote-http-v1";

/**
 * Tool ids that are intentionally unavailable over remote HTTP. The set is
 * Background agent dispatch is intentionally local-only. Keeping the policy
 * named and central means remote discovery cannot accidentally grow a second
 * per-handler exclusion list as dispatch evolves.
 */
export const REMOTE_HTTP_EXCLUDED_TOOLS = new Set<string>(["dispatch_task", "list_dispatches", "cancel_dispatch"]);

/** Canonical read-only tool policy used by the remote doctor and HTTP smoke. */
export function remoteHttpToolNames(): readonly string[] {
  const server = createKanmerMcpServer("remote-http-v1");
  const registered = (server as unknown as { readonly _registeredTools?: Record<string, unknown> })._registeredTools ?? {};
  return Object.keys(registered).filter((name) => !REMOTE_HTTP_EXCLUDED_TOOLS.has(name)).sort();
}

function dispatchTerminalSummary(status: { dispatchId: string; provider: string; state: string; exitCode?: number | null; reason?: string }, tail: readonly string[]): string {
  return [
    `## Dispatch ${status.dispatchId} — ${status.provider}`,
    `- state: ${status.state} (exit ${status.exitCode ?? "unknown"})`,
    status.reason ? `- reason: ${status.reason}` : "",
    "",
    "```",
    ...tail.slice(-50),
    "```",
  ].filter(Boolean).join("\n");
}

function dispatchRefusal(code: string, reason: string, policy: ReturnType<typeof dispatchPolicyView>) {
  return ok({ ok: false, code, reason, policy });
}

/**
 * Construct the one canonical Kanmer registry for a transport. The factory is
 * deliberately transport-agnostic: stdio and HTTP attach their SDK transports
 * after this function returns, while the store/root/tool definitions remain
 * single-sourced here.
 */
export function createKanmerMcpServer(policy: ExposurePolicy = "local-stdio"): McpServer {
  if (policy !== "local-stdio" && policy !== "remote-http-v1") {
    throw new Error(`Unknown MCP exposure policy: ${policy}`);
  }
  if (!rootResolved) resolveRoot();
  // Each factory result owns its negotiated client identity and capabilities.
  // HTTP creates one result per session, so this must never be module-global.
  const server = new McpServer({ name: "kanmer", version: SERVER_VERSION ?? "0.0.0-dev" });
  const dispatchPolicy = parseDispatchPolicy(process.env);
  const dispatchLogRoot = process.env.KANMER_DISPATCH_LOG_DIR?.trim() || path.join(homedir(), ".kanmer", "dispatch");
  const dispatchSupervisor = new DispatchSupervisor({
    logDir: dispatchLogRoot,
    maxActive: dispatchPolicy.maxActive,
    defaultTimeoutMs: dispatchPolicy.timeoutMs,
    maxTimeoutMs: dispatchPolicy.maxTimeoutMs,
    recordTerminal: async (status, tail) => {
      await store.appendScratch(status.ticketId, "dispatch", dispatchTerminalSummary(status, tail));
    },
    verifyDeliverable: async (status) =>
      dispatchDeliverableProven(status.task, await store.getTicketDocsInfo(status.ticketId), await store.getItem(status.ticketId)),
  });
  const registerTool = server.registerTool.bind(server);
  // All mutating tool schemas carry transport metadata at their call boundary.
  // This is intentionally central: a future write tool cannot silently lose
  // the guard because its author forgot a local schema wrapper.
  server.registerTool = ((name: string, config: { inputSchema?: z.ZodRawShape; annotations?: { readOnlyHint?: boolean } }, ...args: unknown[]) => {
    if (policy === "remote-http-v1" && REMOTE_HTTP_EXCLUDED_TOOLS.has(name)) return { remove: () => undefined } as never;
    const next = config.annotations?.readOnlyHint === false && config.inputSchema
      ? { ...config, inputSchema: withProject(config.inputSchema) }
      : config;
    return Reflect.apply(registerTool, server, [name, next, ...args]) as never;
  }) as typeof server.registerTool;

  /** Wrap a write handler using this server's calling-client context. */
  function write<T extends Record<string, unknown>, R extends unknown[]>(fn: (input: T, ...rest: R) => Promise<ReturnType<typeof ok>>) {
    return guard(async (input: T, ...rest: R) => {
      const { expected_project, ...cleanInput } = input as T & { expected_project?: string };
      await assertExpectedProject(expected_project);
      // Attribute this mutation in the activity log to the calling client.
      store.setActor(actorName(server, rest[0]));
      await ensureInit();
      return fn(cleanInput as T, ...rest);
    });
  }

// ---------------------------------------------------------------------------
// Read tools
// ---------------------------------------------------------------------------

server.registerTool(
  "get_status",
  {
    title: "Project status",
    description:
      "Orientation call — use it first, every session. Answers both of the questions you have at session start: WHICH BOARD, and WHICH SERVER. " +
      "Board: the project root and `rootSource` (how it was found: flag | env | cwd | cwd-worktree | ancestor | ancestor-worktree | init), the `repoRoot` that governing-doc refs resolve against and its `repoRootSource` (flag | env | derived), whether .kanmer/ exists (this tool never creates it), the storage format version, whether the board came from a real board.yml or is the synthesized default, per-stage and per-type item counts, archived/taken counts, and how many file warnings the listing produced. " +
      "Server: a `server` block naming the build that is answering — the release `version`, the resolved `path` of the running script, the runtime `sha256` of its bytes (plus `sha256Short`), its `mtime` and `size`, and the `build` shape (packaged | plugin | dev-standalone | dev-esm | unknown). " +
      "Two hosts pointed at the same board can be running different server builds that enforce different gates; comparing `server.sha256` is how you see that instead of guessing. " +
      "Repo: a `repo` block answering WHICH KANMER THIS REPO WAS SET UP BY — `{ upToDate, stale: [{ artefact, state, detail, fix }] }`. Itemised, never a bare boolean. Artefacts checked are the ones migration does not touch: the AGENTS.md managed block, the installed skills trees and their `.kanmer-skills-version` stamps, `board.yml`, and the provider MCP registrations — compared by CONTENT HASH against what this build ships, not by version string (no artefact records a product version). " +
      "`state` is `behind` (act on it), `compensated` (the file is old and the runtime already papers over it — informational, no action), `unstamped` (no evidence either way) or `unknown` (could not be read). `upToDate` is true iff nothing is `behind`. Repair is never automatic: run `kanmer-setup`, which is the reconciliation path (FRD-013). Board format is not listed here — it is the `format` field above. " +
      "Board worktree: an informational, non-blocking `boardWorktree` block reports the board path, expected and actual branch, branch match, board source, active ticket count, and operator repair guidance. It never checks out, repairs, initializes, or refuses another tool. " +
      "Board sync: `boardSync` is `{ remoteBranch, localSha, remoteSha, ahead, behind }` comparing the board HEAD with its last-fetched origin ref, or null without a Git board/remote ref; `ahead > 0` means unpushed board commits the CI merge gate cannot see. It never fetches or pushes. " +
      "Project identity (FRD-029): `project.project_id` is the board's stable LOGICAL identity (persisted in .kanmer/project.json; the same across copies of the board at other paths or machines) and `project.board_id` its board; `project.identity` is `logical` once assigned or `unassigned` on a legacy board that has not yet received its one-time identity migration (the first write or migrate_board performs it, recording the prior `fingerprint` as the auditable fallback in `project.origin`/project.json). `project.location` is the separate machine-local evidence — repo path, board path, machine, board branch, remote origin and a `kanmer-loc-v1` digest — reported, never used to reassign identity. `project.fingerprint` is the legacy `kanmer-proj-v1` machine-local fingerprint, retained for older clients. When `compat.expectedProject` is `optional`, send `project_id` (preferred) or that fingerprint as `expected_project` on any write to be refused with WRONG_PROJECT before anything runs; omit it for older servers that do not advertise compatibility. When `compat.expectedRevision` is `optional`, ticket mutations also accept `expected_revision` — the document-inclusive `revision` from get_item — and refuse a stale one with REVISION_CONFLICT. Every tool result carries `structuredContent.project` naming the logical project. " +
      "Endpoint registry (FRD-029, MCP-054): when `compat.endpointRegistry` is `optional`, `list_projects` reports every NAMED project endpoint the operator registered — this process still serves exactly one of them. " +
      "IMPORTANT: the `server` block is absent on servers older than 0.3.3, and the `repo` block on servers older than 0.3.4 — that ABSENCE is itself the signal 'this build predates the check', not an error. Individual fields are null if they could not be read; the call never fails over it.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async () => {
    const exists = await store.exists();
    const format = await store.detectFormat();
    const { board, source } = await store.getBoardWithSource();
    const { items, warnings } = await store.listItemsWithWarnings({ includeArchived: true });
    const active = items.filter((i) => !i.archived);
    const expectedBranch = process.env.KANMER_BOARD_BRANCH?.trim() || "kanmer-board";
    const actualBranch = await inspectBoardBranch(projectRoot);
    const boardSync = await inspectBoardSync(projectRoot, actualBranch ?? expectedBranch);
    const [legacy, logical, location] = await Promise.all([legacyIdentity(), resolveProject(), resolveLocation()]);
    const byStage: Record<string, number> = {};
    for (const s of STAGE_IDS) byStage[s] = 0;
    let offBoardStage = 0;
    const byType: Record<string, number> = {};
    for (const item of active) {
      if (item.status in byStage) byStage[item.status]++;
      else offBoardStage++;
      byType[item.type] = (byType[item.type] ?? 0) + 1;
    }
    return ok({
      // --- Identity: which board, and which server. ---------------------
      // These four plus `server` are the block an agent reads to know what it
      // is talking to. `projectRoot`/`rootSource` are MCP-010's, unchanged.
      projectRoot,
      /** What governing-doc `refs` resolve against — MCP-012. */
      repoRoot: store.paths.repoRoot,
      /** Which resolution step produced projectRoot — see ADR-0012. */
      rootSource,
      /** How repoRoot was reached: flag | env | derived — MCP-012. */
      repoRootSource,
      /**
       * Which build is answering. Absent on servers older than 0.3.3, and that
       * absence is the signal — see the tool description. Never throws: any
       * field it could not determine is null.
       */
      server: serverIdentity(),
      /**
       * Whether this REPO's Kanmer artefacts are as new as the build above —
       * CORE-023. `server` says which binary is answering; this says whether
       * what it left behind in the repo has kept up. Itemised, because "stale:
       * true" is not actionable and the whole point is naming what.
       *
       * Recomputed every call, not cached: the obvious next move after reading
       * it is `kanmer-setup`, and a cached answer would survive its own fix.
       * Never throws — an unreadable artefact reports `unknown`.
       */
      repo: detectStaleness({
        paths: store.paths,
        board,
        boardSource: source,
        format,
        bundledSkillsDir: bundledSkillsDir(),
      }),
      kanmerDir: store.paths.kanmer,
      exists,
      format,
      boardSource: source,
      /**
       * FRD-029: the legacy location-derived block (boardRoot, format,
       * repoRoot, boardSource, fingerprint — unchanged) plus the logical
       * identity (`project_id`, `board_id`, `identity`, `origin`) and the
       * separate machine-local `location` evidence.
       */
      project: { ...legacy, ...logical, location },
      compat: { expectedProject: "optional", projectIdentity: "logical", expectedRevision: "optional", endpointRegistry: "optional" },
      dispatch: dispatchPolicyView(dispatchPolicy),
      /** FRD-030 lease timing: explicit so workers know their heartbeat cadence and the expiry window. */
      leases: leaseConfig(board),
      deploymentTracking: board.deployment !== undefined,
      boardWorktree: {
        path: projectRoot,
        expectedBranch,
        actualBranch,
        onBoardBranch: actualBranch === expectedBranch,
        boardSource: source,
        ticketCount: active.filter((item) => item.type === "ticket").length,
        repair: boardWorktreeRepair(source, actualBranch, expectedBranch, projectRoot),
      },
      /**
       * Board push drift — CORE-123. `ahead > 0` means local board commits
       * the remote (and therefore the CI merge gate) has not seen; confirm the
       * board is pushed before treating a `kanmer-gate` result as current.
       * `null` when there is no Git board or no remote-tracking ref.
       */
      boardSync,
      counts: {
        byStage,
        byType,
        offBoardStage,
        archived: items.length - active.length,
        taken: active.filter((i) => i.taken_at).length,
      },
      warningsCount: warnings.length,
    });
  }),
);

server.registerTool(
  "list_board",
  {
    title: "List board configuration",
    description:
      "Return the board configuration: the ordered statuses (the workflow stages, which are the kanban columns), the areas (each with the id prefix its tickets are born with), the priorities, and the legacy id prefixes. Call this to learn valid status/area/priority ids before creating or moving items. The `source` field says whether this is a real board.yml (\"file\") or the synthesized default for a project with no board yet (\"default\").",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async () => {
    const { board, source } = await store.getBoardWithSource();
    // Everything a skill needs to orient, resolved (fallbacks included), so no
    // bespoke follow-up call is required — FRD-022 R5.
    return ok({
      ...board,
      source,
      stages: STAGES,
      profiles: resolveProfiles(board),
      defaultProfile: board.defaultProfile ?? "fix",
      groupKinds: resolveGroupKinds(board),
      proofTypes: resolveProofTypes(board),
      docTypes: DOC_TYPES,
      gateExemptFolders: GATE_EXEMPT_DIRS,
      boundaries: BOUNDARIES,
      repoDocs: repoDocsMap(board),
      deploymentTracking: board.deployment !== undefined,
    });
  }),
);

server.registerTool(
  "list_projects",
  {
    title: "List named project endpoints",
    description:
      "Observe every NAMED project endpoint in the operator-owned endpoint registry (FRD-029, MCP-054) — read-only, and never a way to reach another board. " +
      "One MCP process stays bound to exactly one project: the registry is a JSON file whose location is fixed when the process is spawned (`KANMER_ENDPOINT_REGISTRY`, else `~/.kanmer/endpoints.json`); no request can supply a path, and this tool takes at most a registry NAME filter. " +
      "Each endpoint reports its `project` (logical `project_id`/`board_id`, `identity`, legacy `fingerprint`), machine-local `location`, `boardSync`, `health` (`ok` | `unassigned` — legacy board without project.json | `missing-board` | `invalid` — malformed registry entry, see `problems` | `error`), the operator-declared `policy`, and the active `controllers` and `workspaces` (taken tickets with branch/worktree and a `live`/`expired` claim). " +
      "`bound` marks the one endpoint that IS this process's project; `bound.endpoint` at the top level names it, or null when this project is not registered. Cross-project registry operations are observational only: to mutate another project, connect to ITS endpoint and pass ITS `project_id` as `expected_project` — sending it here is refused with WRONG_PROJECT. " +
      "A missing registry is not an error (`registry.exists: false`, no endpoints); a malformed one reports `registry.error`.",
    inputSchema: {
      name: z.string().optional().describe("Only this registry endpoint name; `missing` lists it when the registry has no such name"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ name }) => {
    // This process's own identity is the only one that may touch lastProject;
    // every other endpoint is resolved fresh inside observeRegistry.
    const bound = await resolveProject();
    const observed = await observeRegistry(process.env, homedir(), registryObservationDeps, bound, name ? { name } : undefined);
    const boundEndpoint = observed.endpoints.find((endpoint) => endpoint.bound)?.name ?? null;
    return ok({
      registry: { ...observed.registry, env: ENDPOINT_REGISTRY_ENV },
      bound: { project_id: bound.project_id, board_id: bound.board_id, identity: bound.identity, fingerprint: bound.fingerprint, endpoint: boundEndpoint },
      endpoints: observed.endpoints,
      missing: observed.missing,
    });
  }),
);

server.registerTool(
  "get_sources",
  {
    title: "Resolve declared project sources",
    description:
      "Return the project's declared MCP, plugin, and llms.txt preferences in deterministic priority order. Host observations are optional inputs: an MCP/plugin is only available when the host says it is already connected/installed; a declaration never installs, enables, authenticates, or grants authority. llms.txt is only a declared HTTPS documentation source and is fetched separately with fetch_source under its bounded policy.",
    inputSchema: {
      area: z.string().optional().describe("Area id used by appliesTo.areas"),
      labels: z.array(z.string()).max(64).optional().describe("Ticket labels used by appliesTo.labels"),
      connected_mcp: z.array(z.string()).max(128).optional().describe("Explicit host observation of connected MCP namespaces"),
      installed_plugins: z.array(z.string()).max(128).optional().describe("Explicit host observation of installed plugin ids"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ area, labels, connected_mcp, installed_plugins }) => {
    const { board, source } = await store.getBoardWithSource();
    const resolved = resolveSources(board.sources, {
      area,
      labels,
      connectedMcp: connected_mcp,
      installedPlugins: installed_plugins,
    });
    return ok({
      sources: resolved,
      source,
      declaredCount: board.sources?.length ?? 0,
      llmsPolicy: LLMS_TXT_POLICY,
    });
  }),
);

server.registerTool(
  "list_items",
  {
    title: "List items",
    description:
      "List items as summaries (no body). Filter by type, status (workflow stage), area, label, group, or updated_since (ISO timestamp — only items changed after it). Filters combine with AND, so group + status narrows to one stage of one group. Sort by id (default) or updated_desc; cap with limit. Archived items are excluded unless include_archived is true (summaries carry `archived` either way). Summaries also carry `taken` (who/where, when a ticket is taken), `profile`, and `docs`/`checklist` (pipeline document presence and checklist progress) — which is why this, rather than get_group, is how you build a roster from a group: get_group's derived members carry only id/title/stage. Normally returns a plain array; if any files in .kanmer are malformed or misnamed, returns { items, warnings } instead so the problem is visible.",
    inputSchema: {
      type: itemTypeEnum.optional().describe("Restrict to one item type"),
      status: z.string().optional().describe("Filter by status id (workflow stage)"),
      area: z.string().optional().describe("Filter by area id"),
      label: z.string().optional().describe("Filter by a label"),
      group: z
        .string()
        .optional()
        .describe(
          "Filter by group membership, e.g. EPIC-001 or HZN-003. An unknown group id returns no items rather than erroring — a filter asks a question, it does not assert one.",
        ),
      include_archived: z.boolean().optional().describe("Include archived items"),
      updated_since: z
        .string()
        .optional()
        .describe("Only items whose `updated` is after this ISO timestamp"),
      sort: z.enum(["id", "updated_desc"]).optional().describe("Sort order (default id)"),
      limit: z.number().int().positive().optional().describe("Return at most this many"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(
    async ({ type, status, area, label, group, include_archived, updated_since, sort, limit }) => {
      const { items, warnings } = await store.listItemsWithWarnings({
        type,
        status,
        area,
        label,
        group,
        includeArchived: include_archived,
      });
      let selected = items;
      if (updated_since !== undefined) {
        selected = selected.filter((i) => i.updated > updated_since);
      }
      if (sort === "updated_desc") {
        selected = [...selected].sort((a, b) => (a.updated < b.updated ? 1 : -1));
      }
      if (limit !== undefined) selected = selected.slice(0, limit);
      const blocked = await blockedSet();
      const summaries = await Promise.all(selected.map((i) => summarise(i, blocked)));
      return ok(warnings.length ? { items: summaries, warnings } : summaries);
    },
  ),
);

server.registerTool(
  "get_item",
  {
    title: "Get an item",
    description:
      "Return the full frontmatter and markdown body of one item by id (e.g. API-001). For tickets this also reports which pipeline document types exist (docs), their exact readable documentPaths, and checklist progress — read a selected path with get_ticket_doc.",
    inputSchema: { id: z.string().describe("Item id, e.g. API-001") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const item = await store.getItem(id);
    if (!item) return fail(`No item with id "${id}"`);
    const info = await store.getTicketDocsInfo(id);
    const blocked = (await blockedSet()).has(id);
    // FRD-029: the document-inclusive revision rides beside the item in the
    // response only — it is computed, never written to frontmatter.
    const revision = (await store.getRevision(id))?.revision ?? null;
    return ok(
      info
        ? {
            ...item,
            blocked,
            revision,
            docs: info.docs,
            documentPaths: info.documentPaths,
            checklist: info.checklist,
          }
        : { ...item, blocked, revision },
    );
  }),
);

server.registerTool(
  "reconcile_ticket",
  {
    title: "Inspect a ticket's reconciliation state (read-only)",
    description:
      "Read one ticket's board, claim, proof, recorded-workspace, GitHub PR and required-check facts, then return typed findings plus an ADVISORY recommendation or none. This is a dry-run inspector only: it never mutates the board, Git, workspace, checks or release state, and there is no apply surface — an operator or controller acts on the recommendation through the ordinary tools. Claim state is current | expired | unclaimed with review_round/remediation_budget. Unavailable GitHub/CI/workspace facts are reported as inconclusive, never invented. The request selects only an existing ticket id; it cannot supply a path, command, executable or project root.",
    inputSchema: { id: z.string().describe("Existing ticket id") },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  guard(async ({ id }) => ok(await reconcileTicket(store, id))),
);

server.registerTool(
  "get_execution_packet",
  {
    title: "Get an execution packet",
    description:
      "Return one bounded, read-only implementation packet for a ticket, or a normal ready:false refusal with code GATE_BLOCKED. Refusals are ordered: non-ticket/legacy, spike, unmet leave-preparing requirements, unresolved questions, then occupancy by another actor. An occupied ticket may be deliberately resumed only by providing its exact recorded branch and worktree. A ready packet contains the ticket, ordered group contexts, profile-resolved gates, plan/checklist/files index documents with versions, extra document paths and versions, a stop condition, and command hint. It never takes, moves, writes, dispatches, or creates a worktree.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      resume: z.object({ branch: z.string(), worktree: z.string() }).optional()
        .describe("Exact recorded branch/worktree required to resume an occupied ticket from a different MCP client identity"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id, resume }, extra) => {
    const [project, logical] = await Promise.all([legacyIdentity(), resolveProject()]);
    const packet = await getExecutionPacket({ store, id, actor: actorName(server, extra), project, resume });
    // FRD-029: the packet names the logical project and the ticket's
    // document-inclusive revision so a worker's first write can be CAS-bound.
    const revision = packet.ready ? await store.getRevision(id) : null;
    return ok({
      ...packet,
      project: { ...packet.project, project_id: logical.project_id, board_id: logical.board_id, identity: logical.identity },
      ...(packet.ready ? { ticket: { ...packet.ticket, revision: revision?.revision ?? null } } : {}),
    });
  }),
);

server.registerTool(
  "dispatch_task",
  {
    title: "Dispatch one named task",
    description:
      "Start one fixed, named core task for one existing ticket through the operator-enabled dispatch policy. The caller chooses only ticket, shared provider id, shared task id and an optional bounded timeout; command, args, prompt, cwd, environment and log path are never accepted. Dispatch is disabled by default, bearer authentication is not authorization, and `get_status.dispatch` explains the local policy. Refusals are normal structured `{ok:false,code,reason}` results and never create a child or log before all checks and approval pass.",
    inputSchema: {
      ticket_id: z.string().describe("Existing non-archived ticket id"),
      provider: z.string().describe("Operator-allowlisted shared provider id: codex | claude | opencode | grok | antigravity"),
      task: z.string().describe("Operator-allowlisted core task id from DISPATCH_TASKS"),
      timeout_ms: z.number().int().positive().optional().describe("Optional bounded timeout in milliseconds"),
      expected_project: expectedProjectField,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  guard(async ({ ticket_id, provider, task: taskId, timeout_ms, expected_project }, extra) => {
    const policy = dispatchPolicyView(dispatchPolicy);
    if (!dispatchPolicy.enabled) return dispatchRefusal("DISPATCH_DISABLED", dispatchPolicy.reason ?? "dispatch is disabled", policy);
    if (!dispatchPolicy.providers.includes(provider as never)) return dispatchRefusal("DISPATCH_PROVIDER_NOT_ALLOWED", `provider "${provider}" is not allowlisted`, policy);
    if (!dispatchPolicy.tasks.includes(taskId)) return dispatchRefusal("DISPATCH_TASK_NOT_ALLOWED", `task "${taskId}" is not allowlisted`, policy);
    const identity = await assertExpectedProject(expected_project);
    const item = await store.getItem(ticket_id);
    if (!item || item.type !== "ticket") return dispatchRefusal("DISPATCH_TICKET_NOT_FOUND", `No ticket "${ticket_id}".`, policy);
    if (item.archived) return dispatchRefusal("DISPATCH_TICKET_ARCHIVED", `${ticket_id} is archived.`, policy);
    if (item.taken_at) return dispatchRefusal("DISPATCH_TICKET_TAKEN", `${ticket_id} is already taken; dispatch does not steal tickets.`, policy);
    const info = await store.getTicketDocsInfo(ticket_id);
    const task = dispatchTaskById(taskId);
    if (!task) return dispatchRefusal("DISPATCH_TASK_UNKNOWN", `Unknown task "${taskId}".`, policy);
    const feasibility = taskFeasibility(taskId, { stage: item.status, docCounts: info?.counts ?? {} });
    if (!feasibility.ok) return dispatchRefusal("DISPATCH_TASK_INFEASIBLE", feasibility.reason ?? "task is not feasible for this ticket", policy);
    if (dispatchSupervisor.list({ projectId: projectRoot, ticketId: ticket_id, includeRecent: false }).length > 0) return dispatchRefusal("DISPATCH_DUPLICATE", `${ticket_id} already has a dispatch in flight for this project.`, policy);
    if (dispatchPolicy.approval === "elicit") {
      if (!server.server.getClientCapabilities()?.elicitation) return dispatchRefusal("DISPATCH_APPROVAL_UNAVAILABLE", "dispatch approval requires an MCP host with elicitation capability", policy);
      try {
        const approval = await server.server.elicitInput({
          message: `Allow ${provider}/${taskId} to run for ticket ${ticket_id} in the configured Kanmer project?`,
          requestedSchema: { type: "object", properties: { confirm: { type: "boolean", description: "true to proceed" } }, required: ["confirm"] },
        });
        if (approval.action !== "accept" || (approval.content as { confirm?: boolean })?.confirm !== true) return dispatchRefusal("DISPATCH_APPROVAL_DECLINED", "dispatch approval was declined", policy);
      } catch {
        return dispatchRefusal("DISPATCH_APPROVAL_UNAVAILABLE", "dispatch approval round trip failed; dispatch remains refused", policy);
      }
    }
    try {
      const status = await dispatchSupervisor.start({
        projectId: projectRoot,
        projectFingerprint: identity.fingerprint,
        sourceRoot: store.paths.repoRoot,
        ticketId: ticket_id,
        provider: provider as never,
        requestedBy: actorName(server, extra),
        task: { id: task.id, label: task.label, deliverable: task.deliverable, prompt: task.prompt(ticket_id) },
        ...(timeout_ms === undefined ? {} : { timeoutMs: timeout_ms }),
      });
      return ok({ ok: true, status, deliverable: task.deliverable, warning: feasibility.warning ?? null, policy });
    } catch (error) {
      return dispatchRefusal("DISPATCH_START_REFUSED", error instanceof Error ? error.message : String(error), policy);
    }
  }),
);

server.registerTool(
  "list_dispatches",
  {
    title: "List dispatches",
    description: "List active and bounded recent dispatch lifecycle metadata for this configured project. Output is sanitized: no command, environment, local log path or raw output tail is ever returned. When policy is disabled the response says so instead of pretending the feature is absent.",
    inputSchema: {
      ticket_id: z.string().optional().describe("Filter by ticket id"),
      state: z.enum(["running", "done", "failed", "cancelled", "timed-out"]).optional(),
      include_recent: z.boolean().optional().default(true),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ ticket_id, state, include_recent }) => ok({
    policy: dispatchPolicyView(dispatchPolicy),
    dispatches: dispatchSupervisor.list({ projectId: projectRoot, ...(ticket_id ? { ticketId: ticket_id } : {}), ...(state ? { state } : {}), includeRecent: include_recent }),
  })),
);

server.registerTool(
  "cancel_dispatch",
  {
    title: "Cancel a dispatch",
    description: "Cancel one active dispatch in this configured project. The caller supplies only an opaque dispatch id and a short reason; the server resolves the child and performs safe descendant cancellation. Cancellation is project-bound and policy-bound, and the cancelling actor is recorded.",
    inputSchema: {
      dispatch_id: z.string().min(1).max(200).describe("Opaque dispatch id returned by dispatch_task/list_dispatches"),
      reason: z.string().max(200).optional().describe("Short human-readable cancellation reason"),
      expected_project: expectedProjectField,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  guard(async ({ dispatch_id, reason, expected_project }, extra) => {
    const policy = dispatchPolicyView(dispatchPolicy);
    if (!dispatchPolicy.enabled) return dispatchRefusal("DISPATCH_DISABLED", dispatchPolicy.reason ?? "dispatch is disabled", policy);
    await assertExpectedProject(expected_project);
    const active = dispatchSupervisor.list({ projectId: projectRoot, includeRecent: false }).find((status) => status.dispatchId === dispatch_id);
    if (!active) return dispatchRefusal("DISPATCH_NOT_FOUND", `No active dispatch "${dispatch_id}" in this project.`, policy);
    const status = dispatchSupervisor.cancel(dispatch_id, reason?.trim() || "cancelled by client", actorName(server, extra));
    return status ? ok({ ok: true, status, policy }) : dispatchRefusal("DISPATCH_NOT_FOUND", `No active dispatch "${dispatch_id}" in this project.`, policy);
  }),
);

server.registerTool(
  "get_ticket_doc",
  {
    title: "Read a ticket document",
    description:
      "Read one ticket document (`doc`) or 1–25 selected documents (`docs`) by type-relative path. Supply exactly one form. Scratch files use `scratch/<slug>` (for example, `scratch/review`) and map to `scratch/<slug>.md`. The legacy single response is unchanged; batch returns ordered per-document content/version records. Missing known documents are normal entries; versions bind to returned bytes and are not an atomic snapshot.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      doc: ticketDocEnum.optional().describe("One type-relative document path (legacy form)"),
      docs: z.array(ticketDocEnum).min(1).max(25).optional().describe("1–25 type-relative document paths (batch form; mutually exclusive with doc)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id, doc, docs }) => {
    if ((doc === undefined) === (docs === undefined)) throw new Error("Supply exactly one of doc or docs.");
    if (doc !== undefined) {
      const [result] = await readTicketDocuments(store, id, [doc]);
      return ok({ id, ...result });
    }
    return ok({ id, documents: await readTicketDocuments(store, id, docs!) });
  }),
);

server.registerTool(
  "search_items",
  {
    title: "Search items",
    description:
      "Full-text search over item id, title, body, labels and assignee. Returns matching summaries.",
    inputSchema: {
      query: z.string().describe("Text to search for"),
      type: itemTypeEnum.optional().describe("Restrict to one item type"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ query, type }) => {
    const blocked = await blockedSet();
    return ok(
      await Promise.all(
        (await store.searchItems(query, { type })).map((i) => summarise(i, blocked)),
      ),
    );
  }),
);

// ---------------------------------------------------------------------------
// Groups (FRD-001). Membership rides on `update_item(groups: [...])` — there is
// deliberately no add/remove tool, matching how labels and blocks already work.
// ---------------------------------------------------------------------------

server.registerTool(
  "create_group",
  {
    title: "Create a group",
    description:
      "Create a cross-cutting group of tickets: an `epic` (these ship together) or a `horizon` (this is what matters now). Returns the group including its allocated id (EPIC-001, HZN-001). The body is the group's goal; add shared context agents should read with set_group_doc. Add members by calling update_item(groups: [...]) on each ticket — membership lives on tickets, and the member list is always derived, never stored.",
    inputSchema: {
      kind: z.string().describe("Group kind (see list_board → groupKinds): epic | horizon"),
      title: z.string().describe("Short title"),
      body: z.string().optional().describe("Markdown body — the group's goal"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ kind, title, body }) => ok(await store.createGroup(kind, title, body ?? ""))),
);

server.registerTool(
  "update_group",
  {
    title: "Update a group",
    description:
      "Patch a group's own fields: title, body and archived. Only provided fields change; a supplied body REPLACES the whole body rather than merging, and a patch that changes nothing does NOT bump `updated`. Set archived to true to retire a group — it drops out of list_groups unless include_archived, stays readable, and its member tickets are untouched; archiving is the retirement path and there is no delete, since deleting would orphan the membership recorded on the tickets. `kind` cannot be changed here — the id prefix (EPIC-, HZN-) is allocated from it, so create a new group and archive the old one instead. Membership is not patchable here either: it lives on the tickets, via update_item(groups: [...]), and the member list is always derived. Pass expected_updated (the `updated` you last read) to be rejected with a conflict instead of overwriting a concurrent edit.",
    inputSchema: {
      id: z.string().describe("Group id, e.g. EPIC-001"),
      title: z.string().optional().describe("New title"),
      body: z.string().optional().describe("Markdown body — replaces the whole body"),
      archived: z
        .boolean()
        .optional()
        .describe("true retires the group (reversible); members are untouched"),
      expected_updated: z
        .string()
        .optional()
        .describe(
          "Optimistic concurrency: the `updated` timestamp you last read. Rejected as a conflict if the group changed since.",
        ),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ id, expected_updated, ...patch }) =>
    ok(await store.updateGroup(id, { ...patch, expectedUpdated: expected_updated })),
  ),
);

server.registerTool(
  "get_group",
  {
    title: "Get a group",
    description:
      "A group with its derived membership: every ticket that names it, each with title and stage, plus per-stage progress counts. Members and progress are computed from the tickets on every read, so they cannot go stale. Archived members are listed but excluded from the counts. Read this before working any member ticket — the group's shared context is part of the ticket's context.",
    inputSchema: { id: z.string().describe("Group id, e.g. EPIC-001") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const group = await store.getGroup(id);
    return group ? ok(group) : fail(`No group with id "${id}"`);
  }),
);

server.registerTool(
  "list_groups",
  {
    title: "List groups",
    description:
      "Every group, optionally filtered by kind. Archived groups are excluded unless include_archived is true — archiving is how a group is retired, since deleting one would orphan the membership recorded on its tickets. Retire one with update_group(id, archived: true); it is reversible.",
    inputSchema: {
      kind: z.string().optional().describe("Only this kind (epic | horizon)"),
      include_archived: z.boolean().optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ kind, include_archived }) =>
    ok(await store.listGroups({ kind, includeArchived: include_archived })),
  ),
);

server.registerTool(
  "get_group_doc",
  {
    title: "Read a group's shared document",
    description:
      "Read a shared context document from a group's folder by relative path (`context.md`, `decisions/api.md`). These are free-form — a group's context is whatever its work needs — and every member ticket's agent is expected to have read them.",
    inputSchema: {
      id: z.string().describe("Group id"),
      path: z.string().describe("Path within the group folder, e.g. context.md"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id, path: rel }) => ok({ id, path: rel, content: await store.getGroupDoc(id, rel) })),
);

server.registerTool(
  "set_group_doc",
  {
    title: "Write a group's shared document",
    description:
      "Write a shared context document into a group's folder. Use this for the context every member ticket needs — the decision that binds them, the constraint they all sit under — rather than repeating it in each ticket. Cannot write the group's own `<ID>.md` — edit that with update_group instead.",
    inputSchema: {
      id: z.string().describe("Group id"),
      path: z.string().describe("Path within the group folder, e.g. context.md"),
      content: z.string().describe("Markdown content"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, path: rel, content }) => ok(await store.setGroupDoc(id, rel, content))),
);

server.registerTool(
  "get_links",
  {
    title: "Get links and backlinks",
    description:
      "Return the items this item links to (frontmatter links[] plus [[wiki]] links in its body), the items that link back to it, plus the typed dependency edges: blocks (stored) and blockedBy (derived — never stored). Each id is annotated with its title.",
    inputSchema: { id: z.string().describe("Item id, e.g. API-001") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const graph = await getLinkGraph(store, id);
    const titles = new Map(
      (await store.listItems({ includeArchived: true })).map((i) => [i.id, i.title]),
    );
    const withTitles = (ids: string[]) =>
      ids.map((linkId) => ({ id: linkId, title: titles.get(linkId) ?? null }));
    return ok({
      id: graph.id,
      links: withTitles(graph.links),
      backlinks: withTitles(graph.backlinks),
      blocks: withTitles(graph.blocks),
      blockedBy: withTitles(graph.blockedBy),
    });
  }),
);

server.registerTool(
  "get_activity",
  {
    title: "Read the activity log",
    description:
      "What actually happened on the board: one entry per mutation ({ts, id, op, field, from, to, actor}), oldest-first. Filter by item id and/or since (ISO timestamp); limit keeps the most recent N. Derived convenience, not truth — the log is safe to delete and never consulted for state.",
    inputSchema: {
      id: z.string().optional().describe("Only entries for this item"),
      since: z.string().optional().describe("Only entries after this ISO timestamp"),
      limit: z.number().int().positive().optional().describe("Most recent N entries (default 200)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id, since, limit }) =>
    ok(await store.getActivity({ id, since, limit: limit ?? 200 })),
  ),
);

server.registerTool(
  "get_doc_gates",
  {
    title: "Inspect the document model and gates",
    description:
      "With an `id`: the ticket's resolved doc types, which of them exist, its area and current status, and the per-area gate rules — enough to self-check before move_item instead of failing into a gate. Without an `id`: the board's document model (default + per-area doc types and gates, the governing-doc path globs, and whether deployment tracking is on).",
    inputSchema: {
      id: z.string().optional().describe("Ticket id to inspect; omit for the board's config"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const board = await store.getBoard();
    if (id !== undefined) {
      const item = await store.getItem(id);
      if (!item) return fail(`No item with id "${id}"`);
      const report = await store.getDocGates(id);
      if (!report) return fail(`"${id}" has no ticket folder to inspect.`);
      const info = await store.getTicketDocsInfo(id);
      // The core resolver verbatim: every surface reads this same answer, so
      // none of them restates a rule (ADR-0009).
      return ok({
        id,
        area: item.area,
        status: item.status,
        stages: STAGE_IDS,
        ...report,
        docCounts: info?.counts ?? {},
        documentPaths: info?.documentPaths ?? [],
        references: info?.references ?? [],
        refs: item.refs ?? [],
        docs_todo: item.docs_todo === true,
      });
    }
    return ok({
      stages: STAGES,
      boundaries: BOUNDARIES,
      profiles: resolveProfiles(board),
      defaultProfile: board.defaultProfile ?? "fix",
      docTypes: DOC_TYPES,
      gateExemptFolders: GATE_EXEMPT_DIRS,
      proofTypes: resolveProofTypes(board),
      repoDocs: repoDocsMap(board),
      deploymentTracking: board.deployment ?? null,
    });
  }),
);

// ---------------------------------------------------------------------------
// Write tools
// ---------------------------------------------------------------------------

server.registerTool(
  "set_sources",
  {
    title: "Set declared project sources",
    description:
      "Replace the project's declared source preferences in board.yml. This is an explicit, project-owned declaration only: it does not install or enable MCPs/plugins, grant trust, or fetch the network. Use get_sources to resolve the result for an area/label context. The board write is protected by the normal expected_project concurrency guard.",
    inputSchema: {
      sources: SourceDeclarationArraySchema.describe("The complete ordered declaration list; [] clears it"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ sources }) => {
    const board = await store.updateBoard((board) => {
      board.sources = SourceDeclarationArraySchema.parse(sources);
      return board;
    });
    return ok({ sources: board.sources });
  }),
);

server.registerTool(
  "fetch_source",
  {
    title: "Fetch a declared llms.txt source",
    description:
      "Fetch one applicable project-declared llms.txt source using a bounded same-origin depth-1 policy (32 direct pages, 2 MiB aggregate, 10-second request timeout, 24-hour cache with validators). This writes only cache metadata/content under .kanmer/data/sources; it never fetches MCP/plugin sources or treats documentation as authority. Failures remain in the response.",
    inputSchema: {
      source_id: z.string().min(1).max(512).describe("The exact declared HTTPS llms.txt URL"),
      area: z.string().optional().describe("Area id used by appliesTo.areas"),
      labels: z.array(z.string()).max(64).optional().describe("Ticket labels used by appliesTo.labels"),
      force: z.boolean().optional().describe("Ignore a fresh cache; validators are still used when available"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ source_id, area, labels, force }) => {
    const board = await store.getBoard();
    const resolved = resolveSources(board.sources, { area, labels });
    const source = resolved.find((candidate) => candidate.kind === "llms-txt" && candidate.id === source_id);
    if (!source) throw new Error(`No applicable declared llms-txt source "${source_id}"`);
    validateLlmsSource(source);
    return ok(
      await fetchLlmsTxt({
        url: source.id,
        cacheDir: path.join(store.paths.data, "sources"),
        force,
      }),
    );
  }),
);

server.registerTool(
  "create_item",
  {
    title: "Create an item",
    description:
      "Create a ticket. Returns the created item including its allocated id — tickets born in an area get that area's prefix (e.g. API-007); area-less tickets get the fallback prefix. status defaults to the first workflow stage; status/area/priority are validated against the board and links[] targets must exist. Creation is ungated: a ticket may be created directly in any stage (imports/backfills of finished work) — the document gates apply on move_item, not creation. Link governing docs with refs (each must exist) or set docs_todo. On format-2 boards plans and research are documents inside a ticket's folder (set_ticket_doc), not standalone items.",
    inputSchema: createFields,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async (input) => ok(await store.createItem(input))),
);

server.registerTool(
  "create_items",
  {
    title: "Create several items",
    description:
      "Bulk create up to 50 items in one call (sequential, so ids stay ordered). Each entry takes the same fields as create_item, including that creation is ungated — an entry may be created directly in any stage, which is what makes importing or backfilling finished work possible. Document gates apply on move_item, not creation. Partial success is possible: the result carries one { ok, item | error } per entry, in order.",
    inputSchema: {
      items: z.array(z.object(createFields)).min(1).max(50).describe("Entries to create, in order"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ items }) => {
    const results: ({ ok: true; item: Item } | { ok: false; error: string })[] = [];
    for (const entry of items) {
      try {
        results.push({ ok: true, item: await store.createItem(entry) });
      } catch (err) {
        results.push({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return ok({
      created: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  }),
);

server.registerTool(
  "update_item",
  {
    title: "Update an item",
    description:
      "Patch a frontmatter field and/or the markdown body of an existing item. Only provided fields change; `updated` is stamped automatically (a patch that changes nothing does NOT bump `updated`). Changing a ticket's area moves its folder — the id never changes. Set archived to true to hide an item from the board without deleting it. `type` cannot be changed here — create a new item and archive the old one instead. Pass expected_updated (the `updated` you last read) when rewriting the body so a concurrent edit is rejected as a conflict instead of overwritten.",
    inputSchema: {
      id: z.string().describe("Item id to update"),
      title: z.string().optional(),
      status: z.string().optional(),
      area: z.string().optional(),
      assignee: z.string().optional(),
      profile: z
        .string()
        .optional()
        .describe(
          "Requirement profile: feature | fix | chore | spike | custom. Gates re-evaluate immediately — changing it can unblock a move that was blocked a moment ago.",
        ),
      requires: z
        .record(z.array(z.string()))
        .optional()
        .describe("Inline requirements, honoured only when profile is \"custom\""),
      groups: z.array(z.string()).optional().describe("Group ids this ticket belongs to"),
      order: z.number().optional().describe("Manual sort key (move_item's position computes this)"),
      labels: z.array(z.string()).optional(),
      links: z.array(z.string()).optional(),
      blocks: z.array(z.string()).optional().describe("Ids this item blocks"),
      refs: z
        .array(z.string())
        .optional()
        .describe("Repo-relative governing-doc paths (each must exist); [] clears them"),
      docs_todo: z.boolean().optional().describe("A governing doc is still to be created"),
      commits: z.array(z.string()).optional().describe("Commit SHAs; [] clears them"),
      prs: z.array(z.string()).optional().describe("PR references; [] clears them"),
      deployment: z
        .string()
        .optional()
        .describe("Deployment status; pass \"\" to clear (only when the board declares environments)"),
      body: z.string().optional(),
      archived: z.boolean().optional(),
      expected_revision: expectedRevisionField,
      expected_updated: z
        .string()
        .optional()
        .describe(
          "Optimistic concurrency: the `updated` timestamp you last read. Rejected as a conflict if the item changed since.",
        ),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ id, expected_updated, expected_revision, ...patch }) =>
    ok(await store.updateItem(id, { ...patch, expectedUpdated: expected_updated, expectedRevision: expected_revision })),
  ),
);

server.registerTool(
  "move_item",
  {
    title: "Move an item to a workflow stage",
    description:
      "Kanban move: set an item's status, i.e. move it to one of the six fixed stages (backlog, preparing, implementing, review, verifying, done). Enforces the ticket's profile gates and names the unmet requirement and boundary on failure. IMPORTANT: a single move may cross at most ONE gated boundary — writing every document and jumping straight to done is refused even though nothing is missing, because the pipeline is meant to be walked, not satisfied at the end. Move one stage at a time; the refusal names the next one. Which boundaries your ticket has depends on its profile, so call get_doc_gates to self-check first. Optional position places the item within the column: \"top\", \"bottom\", or { after: \"API-003\" } — this maintains the manual order humans see.",
    inputSchema: {
      id: z.string().describe("Item id to move"),
      status: z.string().describe("Target status id (workflow stage)"),
      position: z
        .union([z.enum(["top", "bottom"]), z.object({ after: z.string() })])
        .optional()
        .describe("Where in the column to place the item"),
      expected_revision: expectedRevisionField,
      expected_updated: z
        .string()
        .optional()
        .describe(
          "Optimistic concurrency: the `updated` timestamp you last read. Rejected as a conflict if the item changed since.",
        ),
      reason: z
        .string()
        .optional()
        .describe(
          'Required for any move to an EARLIER stage. Review → Implementing additionally needs a needs-changes attestation in scratch/review.md naming this ticket\'s PR (or a reason beginning "operator:"), and is refused with REMEDIATION_BUDGET_EXHAUSTED once review_round reaches remediation_budget. Backward moves are audited in the activity log and the ticket\'s scratch/execution.md.',
        ),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ id, status, position, expected_updated, expected_revision, reason }) =>
    ok(
      await store.moveItem(id, {
        status,
        position,
        expectedUpdated: expected_updated,
        expectedRevision: expected_revision,
        reason,
      }),
    ),
  ),
);

server.registerTool(
  "take_ticket",
  {
    title: "Take, release, transfer or renew a ticket workspace lease",
    description:
      "Acquire a ticket's workspace lease before working it (FRD-030): records taken_at, the branch (required) and optionally the worktree, sets the assignee (defaults to the calling client's name), stamps the lease expiry (board `claimExpiryMinutes`, default 30) and mints the lease record — lease_id, lease_revision, lease_workspace, lease_phase, lease_heartbeat_at, plus controller_run/worker_run/provider when given — and moves the ticket to the working stage (default `implementing`). One live writer per workspace: a worktree or branch recorded on another taken ticket refuses with WORKSPACE_OCCUPIED (force does not bypass it); an already-taken ticket refuses with LEASE_LIVE unless force is true. Batch mode is the one deliberate exception: the first member's take passes batch (an id) plus batch_members (the complete list of two or more small related ticket ids, including itself) — that declares AND freezes the batch in one locked write (BATCH_INVALID for an unknown, archived, done, already-taken or otherwise-batched member; BATCH_FROZEN if the batch already started), and later members take the same worktree and branch with batch: <id> (any other workspace is BATCH_WORKSPACE_MISMATCH; a non-member is still WORKSPACE_OCCUPIED). Members share one PR and one review head; each keeps its own review mapping and proof; release refuses BATCH_ACTIVE until every member is Done or archived. action: \"renew\" is the heartbeat (renew at least every get_status.leases.heartbeatMinutes): pass the lease_id and lease_revision from your packet or last take — a non-current lease_id refuses with LEASE_EXPIRED (the lease was reclaimed; stop), a stale lease_revision with REVISION_CONFLICT, and nothing is written on refusal; an expired lease nobody reclaimed still renews for its holder. Optional phase (implementing | running-command | review | verifying | closeout); phase \"running-command\" with extend_minutes is the explicit long-command state, bounded by board `leaseCommandMaxMinutes` (default 120). A renew that names no lease falls back to the owner check (CLAIM_NOT_OWNED) and migrates a legacy claim into a lease. action: \"transfer\" reclaims an EXPIRED lease for the caller (or another assignee): it first re-reads worktree, branch, PR, commit and proof evidence, records it with the old and new controller in scratch/execution.md, preserves the recorded branch/worktree and any dirty work, and refuses with RECOVERY_REFUSED for a board, foreign-repository or branch-mismatched workspace; a live lease refuses with CLAIM_LIVE unless reason begins \"operator:\". action: \"release\" clears the claim, lease and batch fields when the work ends (closeout). Never use force to recover a dead controller's ticket; transfer it.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      action: z.enum(["take", "release", "transfer", "renew"]).default("take"),
      branch: z.string().optional().describe("Branch the work happens on (required for take)"),
      worktree: z.string().optional().describe("Worktree path, when working in one"),
      stage: z.string().optional().describe("Stage to move to (default: implementing)"),
      assignee: z.string().optional().describe("Defaults to the calling client's name"),
      controller: z.string().optional().describe("Durable controller identity behind the claim (defaults to assignee)"),
      reason: z.string().optional().describe('For transfer of a live claim: an operator override beginning "operator:"'),
      force: z.boolean().optional().describe("Take over an already-taken ticket"),
      expected_revision: expectedRevisionField,
      lease_id: z.string().optional().describe("renew: the lease_id you hold (from the packet or your take)"),
      lease_revision: z.number().int().positive().optional().describe("renew: the lease_revision you last read; stale ⇒ REVISION_CONFLICT"),
      phase: z.enum(LEASE_PHASES).optional().describe("take/renew: lease phase; running-command is the explicit long-command state"),
      extend_minutes: z.number().positive().optional().describe("renew in phase running-command: extend the lease by up to leaseCommandMaxMinutes"),
      controller_run: z.string().optional().describe("Durable controller run identity behind the lease"),
      worker_run: z.string().optional().describe("Worker run identity doing the work"),
      provider: z.string().optional().describe("Provider behind the worker (e.g. claude-code, codex)"),
      batch: z.string().min(1).optional().describe("take: the batch workspace this ticket belongs to (FRD-030 batch mode)"),
      batch_members: z.array(z.string().min(1)).min(2).optional().describe("take, first member only: the complete membership (two or more ids incl. this one); declares and freezes the batch"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, action, branch, worktree, stage, assignee, controller, reason, force, expected_revision, lease_id, lease_revision, phase, extend_minutes, controller_run, worker_run, provider, batch, batch_members }, extra) => {
    const identity = { controllerRun: controller_run, workerRun: worker_run, provider };
    if (action === "release") return ok(await store.releaseTicket(id, { expectedRevision: expected_revision }));
    if (action === "renew") {
      return ok(
        await store.renewTicket(id, {
          actor: assignee ?? actorName(server, extra),
          leaseId: lease_id,
          leaseRevision: lease_revision,
          phase,
          extendMinutes: extend_minutes,
          ...identity,
          expectedRevision: expected_revision,
        }),
      );
    }
    if (action === "transfer") {
      // FRD-030: a reclaim re-reads board, branch, worktree and PR evidence
      // before anything is written; the store records it and never acts on
      // it destructively. Core cannot run Git, so the boundary collects.
      const recovery = leaseRecoverySummary(await collectReconciliationEvidence(store, id));
      return ok(
        await store.transferTicket(id, {
          assignee: assignee ?? actorName(server, extra),
          controller,
          reason,
          expectedRevision: expected_revision,
          ...identity,
          recovery,
        }),
      );
    }
    if (!branch) return fail(`branch is required when taking a ticket — it's the point of taking`);
    return ok(
      await store.takeTicket(id, {
        branch,
        worktree,
        stage,
        assignee: assignee ?? actorName(server, extra),
        controller,
        force,
        expectedRevision: expected_revision,
        phase,
        batch,
        batchMembers: batch_members,
        ...identity,
      }),
    );
  }),
);

server.registerTool(
  "set_ticket_doc",
  {
    title: "Write a ticket document",
    description:
      "Write one of a ticket's pipeline documents into its folder. `doc` is a document id from the ticket area's configured doc types (see get_doc_gates); an unknown id is rejected with the valid ids, and a doc that `requires` others is rejected until they exist. Plain Markdown is preserved byte-for-byte, including frontmatter used by SHA-bound review/proof records. Pass append: true only for running-note content; frontmatter records such as `scratch/review` and `proof` require a whole-file write with append omitted or false. For free-form notes use append_scratch instead. Pass the `version` you last read from get_ticket_doc as `expected_version` to be rejected instead of overwriting a concurrent edit; the result carries the new `version`.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      doc: ticketDocEnum.describe("Which document"),
      content: z.string().describe("Markdown content"),
      append: z.boolean().optional().describe("Append below existing content instead of replacing"),
      expected_version: z
        .string()
        .optional()
        .describe(
          "Optimistic concurrency: the `version` you last read from get_ticket_doc. " +
            "Rejected as a conflict if the document changed since. Omit for last-write-wins.",
        ),
      expected_revision: expectedRevisionField,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, doc, content, append, expected_version, expected_revision }) => {
    const { version } = await store.setDoc(id, doc, content, {
      append,
      expectedVersion: expected_version,
      expectedRevision: expected_revision,
    });
    const revision = (await store.getRevision(id))?.revision ?? null;
    return ok({ id, doc, written: true, appended: append === true, version, revision });
  }),
);

server.registerTool(
  "append_scratch",
  {
    title: "Append a scratch note",
    description:
      'Append a free-form running note to a ticket\'s scratch file (`scratch/<slug>.md`). Separate from set_ticket_doc: scratch is never gated or validated against the doc types. Read it back with get_ticket_doc(doc: "scratch/<slug>"). Use whole-file set_ticket_doc for frontmatter-backed SHA-bound records; successive note appends are separated by a blank line. slug defaults to "notes".',
    inputSchema: {
      id: z.string().describe("Ticket id"),
      slug: z.string().optional().describe('Scratch slug (default "notes") → scratch/<slug>.md'),
      content: z.string().describe("Markdown to append below a blank line"),
      expected_revision: expectedRevisionField,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, slug, content, expected_revision }) => {
    const useSlug = slug ?? "notes";
    const { file } = await store.appendScratch(id, useSlug, content, { expectedRevision: expected_revision });
    return ok({ id, slug: useSlug, appended: true, file });
  }),
);

server.registerTool(
  "link_doc",
  {
    title: "Link or unlink a governing document",
    description:
      "Maintain a ticket's refs[] — repo-relative paths to governing docs (PRD/FRD/ADR) in the repo's own /docs/. add validates the path exists under the project root; remove drops it. Distinct from link_items (item↔item); this is item↔repo-file. A linked governing doc satisfies the leave-backlog gate.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      path: z.string().describe("Repo-relative path, e.g. docs/prd/checkout.md"),
      action: z.enum(["add", "remove"]).default("add"),
      expected_revision: expectedRevisionField,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ id, path: refPath, action, expected_revision }) => {
    const item = await store.getItem(id);
    if (!item) return fail(`No item with id "${id}"`);
    const refs = new Set(item.refs ?? []);
    if (action === "remove") refs.delete(refPath);
    else refs.add(refPath);
    return ok(await store.updateItem(id, { refs: [...refs], expectedRevision: expected_revision }));
  }),
);

server.registerTool(
  "link_items",
  {
    title: "Link or unlink two items",
    description:
      "Add or remove a structured relation from source_id to target_id. rel \"relates\" (default) writes the source's links[]; rel \"blocks\" writes blocks[] — meaning the source blocks the target (blocked-by is derived, never stored). Adding requires the target to exist; removal works even on dangling links.",
    inputSchema: {
      source_id: z.string().describe("The item that will hold the link"),
      target_id: z.string().describe("The item being linked to / blocked"),
      action: z.enum(["add", "remove"]).default("add"),
      rel: z.enum(["relates", "blocks"]).default("relates"),
      expected_revision: expectedRevisionField,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ source_id, target_id, action, rel, expected_revision }) =>
    ok(await linkItems(store, source_id, target_id, action, rel, { expectedRevision: expected_revision })),
  ),
);

server.registerTool(
  "add_column",
  {
    title: "Add a board column",
    description:
      "Add a new column to the board: a status (workflow stage), area or priority. Areas group tickets within stage columns and are colour-coded; provide a hex color, and optionally a 2-6 uppercase-alphanumeric id prefix for tickets born there (derived from the id when omitted). Returns the updated board configuration.",
    inputSchema: {
      id: z.string().describe("New column id, e.g. ui"),
      name: z.string().describe("Display name, e.g. UI"),
      kind: columnKindEnum.default("area"),
      color: z.string().optional().describe("Hex colour, e.g. #5b8cff (recommended for areas)"),
      prefix: z
        .string()
        .optional()
        .describe("Areas only: id prefix for tickets born in this area, e.g. API"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, name, kind, color, prefix }) =>
    ok(
      await store.addColumn(kind, {
        id,
        name,
        ...(color ? { color } : {}),
        ...(prefix ? { prefix } : {}),
      }),
    ),
  ),
);

server.registerTool(
  "update_column",
  {
    title: "Update a board column",
    description:
      "Rename or recolour a status/area/priority, or pin an area's id prefix. The column id itself is immutable (items reference it).",
    inputSchema: {
      kind: columnKindEnum,
      id: z.string().describe("Column id to update"),
      name: z.string().optional(),
      color: z.string().optional(),
      prefix: z.string().optional().describe("Areas only"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ kind, id, name, color, prefix }) =>
    ok(await store.updateColumn(kind, id, { name, color, prefix })),
  ),
);

server.registerTool(
  "remove_column",
  {
    title: "Remove a board column",
    description:
      "Remove a status/area/priority from the board. Refuses while items still use it unless migrate_to names another column of the same kind — then every matching item is rewritten to it first (an area migration moves ticket folders; migrating tickets into the final stage still requires their proof.md). Returns the updated board plus the ids that were migrated.",
    inputSchema: {
      kind: columnKindEnum,
      id: z.string().describe("Column id to remove"),
      migrate_to: z
        .string()
        .optional()
        .describe("Column id (same kind) to move the referencing items to"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  },
  write(async ({ kind, id, migrate_to }) => {
    if (migrate_to !== undefined) {
      const proceed = await confirmDestructive(
        server,
        `Remove ${kind} "${id}" and move every item using it to "${migrate_to}"?`,
      );
      if (!proceed) return fail("cancelled by user");
    }
    return ok(await store.removeColumn(kind, id, { migrateTo: migrate_to }));
  }),
);

server.registerTool(
  "reorder_columns",
  {
    title: "Reorder board columns",
    description:
      "Reorder the statuses, areas or priorities. `order` must be a permutation of the existing ids. Note that the FIRST status is where new items land and the LAST status is the proof-gated final stage.",
    inputSchema: {
      kind: columnKindEnum,
      order: z.array(z.string()).min(1).describe("Every existing id, in the new order"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ kind, order }) => ok(await store.reorderColumns(kind, order))),
);

server.registerTool(
  "migrate_board",
  {
    title: "Migrate / upgrade the board",
    description:
      "Bring the board fully current: run the v1→v2 migration if needed, then backfill the 7-stage default (alias-aware, additive — never renames or reorders existing stages, never touches item files), then the one-time logical identity migration (FRD-029): a board without .kanmer/project.json receives a `project_id` with the prior machine-local fingerprint recorded as its auditable fallback, reported under `identity`. Pass dry_run: true to preview what would move, which stages would be added and whether an identity would be allocated, without writing. The agent-facing route to the same upgrade the GUI offers.",
    inputSchema: {
      dry_run: z.boolean().optional().describe("Preview without writing"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  // Deliberately not `write()`: that wrapper's lazy ensureInit() would allocate
  // the identity (and stamp the skeleton) before the handler ran, so a dry run
  // could never be read-only and `identity.wouldAllocate` was unreachable over
  // MCP. Same guard order as write() — WRONG_PROJECT first, then actor, then
  // init — but init only when actually writing.
  guard(async ({ dry_run, expected_project }: { dry_run?: boolean; expected_project?: string }, extra) => {
    await assertExpectedProject(expected_project);
    store.setActor(actorName(server, extra));
    if (!dry_run) await ensureInit();
    const legacy = await legacyIdentity();
    const report = await migrateBoard(store, { dryRun: dry_run, fallbackFingerprint: legacy.fingerprint });
    await resolveProject();
    return ok(report);
  }),
);

server.registerTool(
  "delete_item",
  {
    title: "Delete an item",
    description:
      "Permanently delete an item by id. For tickets this removes the whole ticket folder — pipeline documents and attachments included. This cannot be undone (prefer update_item with archived: true). Frontmatter links[] in other items that pointed at the deleted id are cleaned up automatically (cleanedLinks); [[wiki]] references in bodies are prose and stay put (bodyReferencesRemain).",
    inputSchema: { id: z.string().describe("Item id to delete") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  write(async ({ id }) => {
    const proceed = await confirmDestructive(
      server,
      `Permanently delete "${id}" (its whole folder, documents and attachments included)?`,
    );
    if (!proceed) return fail("cancelled by user");
    const result = await store.deleteItem(id);
    return result.deleted
      ? ok({
          deleted: id,
          cleanedLinks: result.cleanedLinks,
          bodyReferencesRemain: result.bodyReferencesRemain,
        })
      : fail(`No item with id "${id}"`);
  }),
);

// ---------------------------------------------------------------------------
// Resources — the board and every item, with opt-in change subscriptions
// (the same signal the GUI gets from its file watcher).
// ---------------------------------------------------------------------------

server.registerResource(
  "board",
  "kanmer://board",
  {
    title: "Kanmer board configuration",
    description: "The stages, areas and priorities driving this project's board",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(await store.getBoardWithSource(), null, 2),
      },
    ],
  }),
);

server.registerResource(
  "item",
  new ResourceTemplate("kanmer://items/{id}", {
    list: async () => ({
      resources: (await store.listItems()).map((i) => ({
        uri: `kanmer://items/${i.id}`,
        name: i.id,
        description: i.title,
        mimeType: "text/markdown",
      })),
    }),
  }),
  {
    title: "Kanmer items",
    description: "Each ticket/plan/research item as Markdown with frontmatter",
    mimeType: "text/markdown",
  },
  async (uri, variables) => {
    const id = String(variables["id"]);
    const item = await store.getItem(id);
    if (!item) throw new Error(`No item with id "${id}"`);
    return {
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: serialiseItem(item) }],
    };
  },
);

const subscriptions = new Set<string>();
let subscriptionWatch: WatchHandle | null = null;

/** Push resources/updated for subscribed URIs when the files change on disk. */
function ensureSubscriptionWatcher(): void {
  if (subscriptionWatch) return;
  subscriptionWatch = watchKanmer(projectRoot, (_event, file) => {
    const base = path.basename(file);
    if (base === "board.yml" && subscriptions.has("kanmer://board")) {
      void server.server.sendResourceUpdated({ uri: "kanmer://board" });
    }
    if (base.endsWith(".md")) {
      const uri = `kanmer://items/${base.slice(0, -3)}`;
      if (subscriptions.has(uri)) {
        void server.server.sendResourceUpdated({ uri });
      }
    }
  });
}

server.server.registerCapabilities({ resources: { subscribe: true } });
server.server.setRequestHandler(SubscribeRequestSchema, async (req) => {
  subscriptions.add(req.params.uri);
  ensureSubscriptionWatcher();
  return {};
});
server.server.setRequestHandler(UnsubscribeRequestSchema, async (req) => {
  subscriptions.delete(req.params.uri);
  return {};
});

// ---------------------------------------------------------------------------
// Prompts — host slash-command affordances for the two everyday flows.
// ---------------------------------------------------------------------------

server.registerPrompt(
  "standup",
  {
    title: "Board standup",
    description: "Summarise what happened on the Kanmer board and what needs attention",
  },
  () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Give me a standup from the Kanmer board. Call get_status first, then list_items " +
            "(sort: updated_desc) for the current picture. Group by the board's configured " +
            "stages by role — first stage is Up next, last stage is Recently done, a " +
            "review-like stage is In review, everything between is In flight (include " +
            "taken branch/worktree info). Flag stale items, off-board stages, and any " +
            "warnings. Keep it scannable: one line per item.",
        },
      },
    ],
  }),
);

server.registerPrompt(
  "take-ticket",
  {
    title: "Take a ticket",
    description: "Take a Kanmer ticket and work it through the doc pipeline",
    argsSchema: { id: z.string().describe("Ticket id to take") },
  },
  ({ id }) => ({
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: takeTicketPromptText(id) },
      },
    ],
  }),
);

  return server;
}

/** A stable, non-secret identifier for status/readiness without exposing a path. */
export async function projectFingerprint(): Promise<string> {
  if (!rootResolved) resolveRoot();
  return (await legacyIdentity()).fingerprint;
}

/** The logical project this process is bound to — for HTTP/remote readiness (FRD-029: every endpoint identifies its project). */
export async function boundProject(): Promise<LogicalProject> {
  if (!rootResolved) resolveRoot();
  return resolveProject();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main() {
  // Resolve the board root first, and inside main(): not finding one throws,
  // and only a throw from here reaches the fatal handler below, which is the
  // only thing that prints the diagnostic to stderr. ADR-0012 §Decision 11.
  const stdioServer = createKanmerMcpServer("local-stdio");
  // No store.init() here: a read-only session in a workspace that never
  // opted into Kanmer must not create .kanmer/ just by being opened.
  // Write handlers call ensureInit() lazily instead.
  //
  // 2026-07-28 note: the whole revision — not just cacheable list results
  // (ttlMs/cacheScope on tools/list) — is unavailable in SDK 1.30. Its
  // SUPPORTED_PROTOCOL_VERSIONS tops out at 2025-11-25 and contains no
  // 2026-07-28 entry, so nothing in this repo can negotiate it. Adopt when
  // the SDK grows support; smoke-protocol.mjs covers what is reachable today.
  const transport = new StdioServerTransport();
  await stdioServer.connect(transport);
  // Never write logs to stdout — that stream is the MCP transport.
  // The identity goes here too, not only in get_status: a host that never calls
  // the tool still leaves the answer in its own log, which is where anyone
  // debugging "why did these two hosts disagree" actually looks first.
  const id = serverIdentity();
  process.stderr.write(
    `kanmer-mcp ready — root: ${projectRoot} (${rootSource}), ` +
      `repo: ${store.paths.repoRoot} (${repoRootSource}), ` +
      `build: ${id.build} v${id.version ?? "?"} sha ${id.sha256Short ?? "?"}\n`,
  );
}

const invokedName = path.basename(process.argv[1] ?? "");
if (invokedName === "index.js" || invokedName === "kanmer-mcp.cjs") main().catch((err) => {
  // A resolution failure is a plain, already-worded diagnostic: print it as
  // written, without a stack, so the paths tried are the first thing read.
  const message = err instanceof Error ? err.message : String(err);
  const detail =
    message.startsWith("no Kanmer board found") || !(err instanceof Error) ? message : err.stack;
  process.stderr.write(`kanmer-mcp fatal: ${detail}\n`);
  process.exit(1);
});
