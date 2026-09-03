import type { GateReport, Group, GroupWithMembers } from "@kanmer/core";
import type {
  ActivityEntry,
  BackfillReport,
  BoardColumn,
  BoardConfig,
  ColumnKind,
  CreateItemInput,
  DeleteItemResult,
  DocType,
  Item,
  ItemFilter,
  ItemWarning,
  LinkGraph,
  MigrationReport,
  MovePosition,
  TakeTicketInput,
  TicketDoc,
  TicketDocsInfo,
  UpdateItemPatch,
  V3Report,
  RepoStaleness,
  DispatchStatus as CoreDispatchStatus,
  DispatchProviderId,
  DispatchTaskId,
} from "@kanmer/core";
import type {
  RemoteDoctorResult,
  RemoteProjectIdentity,
  RemoteProjectView,
  RemoteSecretDelivery,
  RemoteStatus,
} from "./remote.js";
import type {
  OpenAITunnelConfigInput,
  OpenAITunnelDoctorResult,
  OpenAITunnelProjectView,
  OpenAITunnelStatus,
} from "./openaiTunnel.js";

export type { RemoteDoctorResult, RemoteProjectIdentity, RemoteProjectView, RemoteSecretDelivery, RemoteStatus };
export type { OpenAITunnelConfigInput, OpenAITunnelDoctorResult, OpenAITunnelProjectView, OpenAITunnelStatus };

  export interface RemoteConfigInput {
    executable: string;
    tunnelId: string;
    credentialsFile: string;
    hostname: string;
    enabled: boolean;
    autoStart: boolean;
    expectedConfigGeneration: string | null;
  }

/** What `migrateBoard` reports: the three upgrade steps, in order. */
export interface BoardMigrationReport {
  v2: MigrationReport;
  backfill: BackfillReport;
  v3: V3Report;
}

/** IPC channel names (main ↔ renderer). */
export const CH = {
  pickProject: "kanmer:pickProject",
  openProject: "kanmer:openProject",
  closeProject: "kanmer:closeProject",
  currentProject: "kanmer:currentProject",
  setOpenTabs: "kanmer:setOpenTabs",
  getBoard: "kanmer:getBoard",
  setBoard: "kanmer:setBoard",
  listItems: "kanmer:listItems",
  listItemsWithWarnings: "kanmer:listItemsWithWarnings",
  getItem: "kanmer:getItem",
  createItem: "kanmer:createItem",
  updateItem: "kanmer:updateItem",
  moveItem: "kanmer:moveItem",
  deleteItem: "kanmer:deleteItem",
  takeTicket: "kanmer:takeTicket",
  releaseTicket: "kanmer:releaseTicket",
  addColumn: "kanmer:addColumn",
  linkItems: "kanmer:linkItems",
  getLinks: "kanmer:getLinks",
  getSettings: "kanmer:getSettings",
  setTheme: "kanmer:setTheme",
  setNotifications: "kanmer:setNotifications",
  setPreferences: "kanmer:setPreferences",
  setDispatchSettings: "kanmer:setDispatchSettings",
  setKanmerGitPreferences: "kanmer:setKanmerGitPreferences",
  getKanmerGitStatus: "kanmer:getKanmerGitStatus",
  syncKanmerNow: "kanmer:syncKanmerNow",
  confirmKanmerGitHandoff: "kanmer:confirmKanmerGitHandoff",
  gitStatus: "kanmer:gitStatus",
  connectAgent: "kanmer:connectAgent",
  disconnectAgent: "kanmer:disconnectAgent",
  listProviders: "kanmer:listProviders",
  getRepoStaleness: "kanmer:getRepoStaleness",
  scanLegacyCodexRegistrations: "kanmer:scanLegacyCodexRegistrations",
  drainLegacyCodexRegistrations: "kanmer:drainLegacyCodexRegistrations",
  getSkillsStatus: "kanmer:getSkillsStatus",
  updateSkills: "kanmer:updateSkills",
  dispatchAgent: "kanmer:dispatchAgent",
  dispatchOptions: "kanmer:dispatchOptions",
  dispatchTasks: "kanmer:dispatchTasks",
  dispatchPromptPreview: "kanmer:dispatchPromptPreview",
  cancelDispatch: "kanmer:cancelDispatch",
  listDispatches: "kanmer:listDispatches",
  /** Main → renderer: a background dispatch's status changed. */
  dispatchStatus: "kanmer:dispatchStatus",
  migrate: "kanmer:migrate",
  backfillBoard: "kanmer:backfillBoard",
  getFormat: "kanmer:getFormat",
  getDoc: "kanmer:getDoc",
  setDoc: "kanmer:setDoc",
  getDocsInfo: "kanmer:getDocsInfo",
  getDocTypes: "kanmer:getDocTypes",
  getDocModel: "kanmer:getDocModel",
  openRepoDoc: "kanmer:openRepoDoc",
  getRepoDoc: "kanmer:getRepoDoc",
  pickRepoDoc: "kanmer:pickRepoDoc",
  getGateStatus: "kanmer:getGateStatus",
  getGates: "kanmer:getGates",
  listGroups: "kanmer:listGroups",
  getGroup: "kanmer:getGroup",
  createGroup: "kanmer:createGroup",
  updateGroup: "kanmer:updateGroup",
  getGroupDoc: "kanmer:getGroupDoc",
  setGroupDoc: "kanmer:setGroupDoc",
  pickReferences: "kanmer:pickReferences",
  addReference: "kanmer:addReference",
  openReference: "kanmer:openReference",
  removeReference: "kanmer:removeReference",
  getActivity: "kanmer:getActivity",
  changed: "kanmer:changed",
  /** Main → renderer: reveal an item (toast click, etc.). */
  reveal: "kanmer:reveal",
  /** Main → renderer: application-menu commands. */
  menu: "kanmer:menu",
  /** Main → renderer: a change NOT made by this GUI (agent/manual edit). */
  agentChange: "kanmer:agentChange",
  /** Renderer → main: current update state (for a renderer that mounted late). */
  getUpdateState: "kanmer:getUpdateState",
  /** Renderer → main: install the downloaded update and restart. Guarded in the renderer. */
  installUpdate: "kanmer:installUpdate",
  /** Renderer → main: agent MCP sessions an update would force-kill. */
  mcpSessions: "kanmer:mcpSessions",
  /** Main → renderer: auto-update state changes. */
  updateStatus: "kanmer:updateStatus",
  remoteRegister: "kanmer:remoteRegister",
  remoteView: "kanmer:remoteView",
  remoteSaveConfig: "kanmer:remoteSaveConfig",
  remoteCreateSecret: "kanmer:remoteCreateSecret",
  remoteConsumeSecret: "kanmer:remoteConsumeSecret",
  remoteCopySecret: "kanmer:remoteCopySecret",
  remoteStart: "kanmer:remoteStart",
  remoteStop: "kanmer:remoteStop",
  remoteDoctor: "kanmer:remoteDoctor",
  remoteStatus: "kanmer:remoteStatus",
  remoteOverview: "kanmer:remoteOverview",
  remoteReconcile: "kanmer:remoteReconcile",
  remoteRemove: "kanmer:remoteRemove",
  openAITunnelRegister: "kanmer:openAITunnelRegister",
  openAITunnelView: "kanmer:openAITunnelView",
  openAITunnelOverview: "kanmer:openAITunnelOverview",
  openAITunnelSaveProfile: "kanmer:openAITunnelSaveProfile",
  openAITunnelInitialize: "kanmer:openAITunnelInitialize",
  openAITunnelDoctor: "kanmer:openAITunnelDoctor",
  openAITunnelStart: "kanmer:openAITunnelStart",
  openAITunnelStop: "kanmer:openAITunnelStop",
  openAITunnelRestart: "kanmer:openAITunnelRestart",
  openAITunnelReconcile: "kanmer:openAITunnelReconcile",
  openAITunnelRemove: "kanmer:openAITunnelRemove",
  openAITunnelStatus: "kanmer:openAITunnelStatus",
  registryObserve: "kanmer:registryObserve",
  registryAddProject: "kanmer:registryAddProject",
  registryRename: "kanmer:registryRename",
  registryRemove: "kanmer:registryRemove",
  registrySetPolicy: "kanmer:registrySetPolicy",
} as const;

// ---------------------------------------------------------------------------
// FRD-029 named endpoint registry (GUI-144). Mirrors the file contract owned
// by packages/mcp-server/src/project-registry.ts; the GUI observes every
// named endpoint read-only and is the registry's only writer.
// ---------------------------------------------------------------------------

export interface RegistryEntry {
  /** Absolute path of the folder containing `.kanmer` (the board). */
  boardRoot: string;
  repoRoot?: string;
  boardBranch?: string;
  /** Operator-declared delivery policy label, echoed back. */
  policy?: string;
}

export interface RegistryFile {
  schema: 1;
  endpoints: Record<string, RegistryEntry>;
}

export type RegistryHealth = "ok" | "unassigned" | "missing-board" | "invalid" | "error";

export interface RegistryProjectIdentity {
  project_id: string | null;
  board_id: string | null;
  identity: "logical" | "unassigned";
  origin: "generated" | "migrated" | null;
  /** Legacy machine-local `kanmer-proj-v1` fingerprint, the auditable fallback. */
  fingerprint: string;
}

export interface RegistryLocation {
  repoPath: string;
  boardPath: string;
  machine: string | null;
  boardBranch: string | null;
  remoteOrigin: string | null;
  fingerprint: string;
}

export interface RegistryLeaseView {
  id: string;
  revision: number | null;
  phase: string | null;
  provider: string | null;
  workspace: string | null;
  heartbeatAt: string | null;
  controllerRun: string | null;
  workerRun: string | null;
  /** True when the last heartbeat is older than the board's heartbeat window (core `leaseState`). */
  heartbeatStale: boolean;
}

export interface RegistryWorkspaceView {
  ticket: string;
  stage: string;
  branch: string | null;
  worktree: string | null;
  controller: string;
  assignee: string | null;
  claim: "live" | "expired";
  takenAt: string;
  expiresAt: string | null;
  /** CORE-115 lease fields when the board carries them; null on a legacy claim. */
  lease: RegistryLeaseView | null;
}

export interface RegistryEndpointView {
  name: string;
  boardRoot: string;
  repoRoot: string | null;
  boardBranch: string | null;
  policy: string | null;
  health: RegistryHealth;
  /** True when this endpoint IS the project the renderer has selected. */
  selected: boolean;
  project: RegistryProjectIdentity | null;
  location: RegistryLocation | null;
  boardSync: { remote: boolean; ahead: number; behind: number; localSha: string | null; remoteSha: string | null } | null;
  format: number | null;
  ticketCount: number | null;
  controllers: Array<{ controller: string; tickets: string[] }>;
  workspaces: RegistryWorkspaceView[];
  problems: string[];
}

export interface RegistryView {
  registry: { path: string; source: "env" | "default"; exists: boolean; error: string | null };
  endpoints: RegistryEndpointView[];
  /** Whether the selected project is named in the registry at all. */
  selectedRegistered: boolean;
}

/**
 * Where the auto-updater is in its cycle. One channel carries all of it —
 * download progress is a phase, not a second channel, so there is one
 * KanmerApi method and one preload wrapper for one concept. Main throttles
 * `downloading` to whole percents.
 */
export type UpdatePhase =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available"; version: string }
  | { phase: "downloading"; version: string; percent: number }
  | { phase: "downloaded"; version: string; releaseNotes?: string }
  /** Up to date; `version` is the installed one. */
  | { phase: "none"; version: string }
  | { phase: "error"; message: string }
  /** Dev or smoke run — the updater is not running at all. */
  | { phase: "disabled" };

/**
 * An update state change. `source` is what triggered the check: an `auto` check
 * that finds nothing, or fails because the laptop is offline, is not news and
 * the renderer stays silent about it.
 */
export interface UpdateStatusEvent {
  status: UpdatePhase;
  source: "auto" | "manual";
}

export type Theme = "dark" | "light" | "system";
export type CardDensity = "comfortable" | "compact";

/**
 * App-global UI preferences (Phase 4.4) — behaviour/appearance knobs that aren't
 * board data: card density, delete confirmation, and the defaults a new ticket
 * starts with. `defaultArea`/`defaultPriority` are matched against the active
 * board by id and fall back gracefully when the id isn't on that board.
 */
export interface UiPreferences {
  cardDensity: CardDensity;
  confirmOnDelete: boolean;
  defaultPriority: string;
  defaultArea: string;
}

export interface DispatchProviderSettings {
  defaultModel?: string;
  taskModels?: Partial<Record<DispatchTaskId, string>>;
  promptSuffix?: string;
}

export interface DispatchSettings {
  providers: Partial<Record<DispatchProviderId, DispatchProviderSettings>>;
}

/** The agent hosts Connect supports (mirrors main/providers.ts ProviderId). */
export type ConnectTarget = "codex" | "claude" | "opencode" | "grok" | "antigravity";

export interface ConnectResult {
  ok: boolean;
  command: string;
  output: string;
}

/** One entry in the Connect tab's provider list. */
export interface ProviderInfo {
  id: ConnectTarget;
  label: string;
  dispatch: boolean;
  model?: { flag: string; evidence: string };
}

/**
 * Why a legacy global codex entry may or may not be drained (GUI-079).
 *
 * Only `drainable` and `orphaned` are removable at all; the rest are reported
 * so the user knows the pile is not empty and what to do about each one.
 */
export type LegacyCodexStatus =
  | "drainable"
  | "no-replacement"
  | "untrusted"
  | "orphaned"
  | "unknown-root";

/** One legacy `[mcp_servers.kanmer-*]` entry in the global `~/.codex/config.toml`. */
export interface LegacyCodexFinding {
  name: string;
  projectRoot: string | null;
  status: LegacyCodexStatus;
  /** False means the UI must not offer to remove it — not even behind a confirmation. */
  removable: boolean;
  /** Pre-select this row? Only ever true for `drainable`. */
  recommended: boolean;
  detail: string;
}

export interface LegacyCodexScan {
  configPath: string;
  findings: LegacyCodexFinding[];
}

export interface LegacyCodexRemoval {
  name: string;
  ok: boolean;
  command: string;
  output: string;
}

export interface LegacyCodexDrainResult {
  removals: LegacyCodexRemoval[];
  /** Asked for but not currently removable — the main process refuses rather than trusting the list. */
  refused: string[];
  scan: LegacyCodexScan;
}

/** Whether a host's copied skill set is present and outdated (Phase 6.2). */
export interface SkillsStatus {
  scope: "marketplace" | "plugin" | "project" | "agentsOnly";
  installedVersion: string | null;
  bundledVersion: string;
  updateAvailable: boolean;
  /** The host's own reason its plugin is not usable (marketplace hosts), else null (GUI-150). */
  hostError: string | null;
}

/** A background agent dispatch's live status. */
/**
 * One row of the Dispatch task menu, with core's feasibility already applied.
 *
 * Resolved in main rather than the renderer: `DISPATCH_TASKS` and
 * `taskFeasibility` are runtime values in core, and the renderer may only
 * `import type` from it. Sending the decided rows avoids a fourth
 * core↔renderer duplication (AGENTS.md §7).
 */
export interface DispatchOption {
  id: string;
  label: string;
  /** What must exist for the task to be finished. */
  deliverable: string;
  enabled: boolean;
  /** Why it is disabled. */
  reason?: string;
  /** Enabled, but an input it builds on is thin. */
  warning?: string;
}

export interface DispatchTaskInfo {
  id: string;
  label: string;
  deliverable: string;
  prompt: string;
}

export interface DispatchStatus extends CoreDispatchStatus {
  /** Bounded local diagnostics; MCP status deliberately omits this field. */
  tail?: string[];
}

export interface AppSettings extends UiPreferences {
  theme: Theme;
  recentProjects: string[];
  notifications: boolean;
  /** Open-tab session restored on boot (project roots). */
  openTabs: string[];
  /** The active tab's project root. */
  activeTab: string;
  /** Whether an empty openTabs array is an intentional persisted session. */
  sessionInitialized: boolean;
  kanmerBranch: string;
  gitSyncMinutes: number;
  pendingNativeReconnects?: Record<string, NativeReconnectRequirement>;
  lastKnownBoardBranches?: Record<string, string>;
  dispatch: DispatchSettings;
}

export interface KanmerGitPreferences { kanmerBranch: string; gitSyncMinutes: number; }
/** Read-only health observation for the board worktree (GUI-098). */
export interface BoardWorktreeHealth {
  path: string;
  expectedBranch: string;
  actualBranch: string | null;
  onBoardBranch: boolean;
  boardSource: "file" | "default";
  ticketCount: number;
  repair: string;
}

/**
 * Existing Git-sync status plus the independently observed board health.
 * `null` means there is no Git board worktree to inspect (for example, a
 * non-Git project), not that the board itself is unusable.
 */
export interface KanmerGitStatus {
  available: boolean;
  boardRoot: string | null;
  branch: string;
  lastSync: string | null;
  error: string | null;
  paused: boolean;
  handoffPending?: { from: string; to: string; warning: string };
  /** User-scoped native plugins whose staged board branch needs an explicit reconnect. */
  nativeReconnectRequired?: NativeReconnectRequirement;
  providerReconciliationPending?: { providers: string[]; branch: string };
  boardWorktree: BoardWorktreeHealth | null;
  /** Board push drift against the last-fetched origin ref; absent for non-Git boards. */
  sync?: { remote: boolean; ahead: number; behind: number; localSha: string | null; remoteSha: string | null };
}

export type NativeReconnectProvider = "grok" | "antigravity";

export interface NativeReconnectRequirement {
  branch: string;
  providers: NativeReconnectProvider[];
}

export interface OpenProjectResult {
  /** Canonical project root — the projectId every scoped call carries. */
  projectId: string;
  root: string;
  boardRoot: string;
  board: BoardConfig;
  items: Item[];
  /** Storage format: 1 = legacy layout (offer migration), 2 = current. */
  format: 1 | 2 | 3;
}

export interface ChangePayload {
  projectId: string;
  event: "add" | "change" | "unlink";
  file: string;
}

/** A notification-click reveal request, scoped to its project. */
export interface RevealPayload {
  projectId: string;
  id: string;
}

/** The board's resolved document model — the defaults a board inherits when it has no `docs` block. */
export interface DocModel {
  repoDocs: Record<string, string>;
  /** The fixed document-type vocabulary (containment defines type). */
  docTypes: readonly string[];
  /** Folders that exist but can never satisfy a gate. */
  gateExemptFolders: readonly string[];
  /** The stage boundaries a profile can gate. */
  boundaries: readonly string[];
  /** Requirement profiles in force: profile → boundary → requirements. */
  profiles: Record<string, Record<string, string[]>>;
  defaultProfile: string;
  proofTypes: readonly string[];
}

/** A change on disk that this GUI didn't make (agent or manual edit). */
export interface AgentChangePayload {
  projectId: string;
  /** Item id, or "board". */
  key: string;
  event: "add" | "change" | "unlink";
}

/**
 * Agent MCP sessions running from the installed app. The NSIS installer kills
 * every process under the install dir, and the MCP server IS Kanmer.exe there
 * (connect.ts), so these are exactly what an update closes. `unknown` means the
 * probe failed — warn generically, never block.
 */
export interface McpSessions {
  count: number;
  projects: string[];
  /**
   * Process ids of the sessions found, so they can be stopped and not merely
   * counted (GUI-064). May be shorter than `count` if a row lacked a usable pid.
   */
  pids: number[];
  unknown: boolean;
}

/**
 * Outcome of the pre-install attempt to clear agent MCP servers out of the
 * install directory. `cleared: false` means the update must NOT be started.
 */
export interface McpStopResult {
  cleared: boolean;
  /** How many processes we actually terminated. */
  stopped: number;
  /** Sessions still holding the install dir; the reason a refusal is shown. */
  remaining: McpSessions;
}

/** What the native card context menu needs to build itself. */
export interface ItemMenuPayload {
  id: string;
  archived: boolean;
  taken: boolean;
  currentStatus: string;
  statuses: { id: string; name: string }[];
}

/** What the user picked in the native card context menu (null = dismissed / handled in main). */
export type ItemMenuAction =
  | { type: "open" }
  | { type: "move"; status: string }
  | { type: "release" }
  | { type: "archive" }
  | { type: "unarchive" }
  | { type: "delete" }
  | { type: "dispatch"; target: ConnectTarget };

/** Application-menu commands forwarded to the renderer. */
export type MenuCommand =
  | { type: "pick-project" }
  | { type: "open-project"; path: string }
  | { type: "manual"; chapter?: string };

/**
 * The API exposed to the renderer on `window.kanmer`. Project-scoped methods
 * take the canonical project root as their first argument (`projectId`) so the
 * main process routes them to the right per-project context (Phase 5). Global
 * methods (settings, providers, menus) take none.
 */
export interface KanmerApi {
  pickProject(): Promise<string | null>;
  openProject(root: string): Promise<OpenProjectResult>;
  /** Close a project's watcher + context (a tab was closed). */
  closeProject(projectId: string): Promise<void>;
  currentProject(): Promise<string | null>;
  getBoard(projectId: string): Promise<BoardConfig>;
  setBoard(projectId: string, board: BoardConfig): Promise<BoardConfig>;
  listItems(projectId: string, filter?: ItemFilter): Promise<Item[]>;
  /** Like listItems, but also surfaces unparseable/mislocated files. */
  listItemsWithWarnings(
    projectId: string,
    filter?: ItemFilter,
  ): Promise<{ items: Item[]; warnings: ItemWarning[] }>;
  getItem(projectId: string, id: string): Promise<Item | null>;
  createItem(projectId: string, input: CreateItemInput): Promise<Item>;
  updateItem(projectId: string, id: string, patch: UpdateItemPatch): Promise<Item>;
  /**
   * Move an item to a stage, optionally to a position within that column.
   * `position` is column-scoped (`order` is a column-wide key), and optional
   * at every layer: omitting it is the plain stage change.
   */
  moveItem(
    projectId: string,
    id: string,
    to: { status: string; position?: MovePosition },
  ): Promise<Item>;
  deleteItem(projectId: string, id: string): Promise<DeleteItemResult>;
  /** Take a ticket: record branch/worktree and move it into the working stage. */
  takeTicket(projectId: string, id: string, input: TakeTicketInput): Promise<Item>;
  /** Clear an agent's taken_at/branch/worktree (e.g. a stuck ticket). */
  releaseTicket(projectId: string, id: string): Promise<Item>;
  addColumn(projectId: string, kind: ColumnKind, column: BoardColumn): Promise<BoardConfig>;
  linkItems(
    projectId: string,
    source: string,
    target: string,
    action: "add" | "remove",
  ): Promise<Item>;
  getLinks(projectId: string, id: string): Promise<LinkGraph>;
  getSettings(): Promise<AppSettings>;
  setTheme(theme: Theme): Promise<AppSettings>;
  setNotifications(on: boolean): Promise<AppSettings>;
  /** Merge a partial UI-preferences patch (Phase 4.4). */
  setPreferences(patch: Partial<UiPreferences>): Promise<AppSettings>;
  setDispatchSettings(settings: DispatchSettings): Promise<AppSettings>;
  setKanmerGitPreferences(prefs: KanmerGitPreferences): Promise<AppSettings>;
  getKanmerGitStatus(projectId: string): Promise<KanmerGitStatus>;
  syncKanmerNow(projectId: string): Promise<KanmerGitStatus>;
  /** Acknowledge that the hosted KANMER_BOARD_BRANCH handoff is complete. */
  confirmKanmerGitHandoff(projectId: string): Promise<KanmerGitStatus>;
  onGitStatus(cb: (status: KanmerGitStatus & { projectId: string }) => void): () => void;
  /** Persist the open-tab session (project roots + the active one). */
  setOpenTabs(openTabs: string[], activeTab: string): Promise<AppSettings>;
  /** Register the MCP server + install skills for the given host in a project. */
  connectAgent(projectId: string, target: ConnectTarget): Promise<ConnectResult>;
  /** Unregister the host and remove the copied skills / AGENTS.md block. */
  disconnectAgent(projectId: string, target: ConnectTarget): Promise<ConnectResult>;
  /** The agent hosts Connect can register (drives the Connect tab). */
  listProviders(): Promise<ProviderInfo[]>;
  /** Itemised, read-only repository staleness report from core. */
  getRepoStaleness(projectId: string): Promise<RepoStaleness>;
  /**
   * List the legacy global `kanmer-*` codex registrations older Kanmers left in
   * `~/.codex/config.toml`. Machine-scoped, not project-scoped — the entries are
   * about *other* projects, which is the whole reason reconnecting one project
   * never drained them (GUI-079). Read-only.
   */
  scanLegacyCodexRegistrations(): Promise<LegacyCodexScan>;
  /** Remove the named legacy entries. Main re-checks removability; it never trusts this list. */
  drainLegacyCodexRegistrations(names: string[]): Promise<LegacyCodexDrainResult>;
  /** Whether the host's copied skill set is present and outdated (Phase 6.2). */
  getSkillsStatus(projectId: string, target: ConnectTarget): Promise<SkillsStatus>;
  /** Re-copy the bundled skills for a host ("Update skills"). */
  updateSkills(projectId: string, target: ConnectTarget): Promise<ConnectResult>;
  /** Spawn a background agent to work a ticket end-to-end (request #10). */
  dispatchAgent(projectId: string, ticketId: string, target: ConnectTarget, taskId?: string): Promise<DispatchStatus>;
  /** The task menu for one ticket, feasibility resolved by core. */
  dispatchOptions(projectId: string, ticketId: string): Promise<DispatchOption[]>;
  listDispatchTasks(): Promise<DispatchTaskInfo[]>;
  dispatchPromptPreview(taskId: string, suffix?: string): Promise<string>;
  /** Cancel a dispatch by its globally unique dispatch id (tree-kills the child). */
  cancelDispatch(dispatchId: string): Promise<boolean>;
  /** Current in-flight dispatches for a project. */
  listDispatches(projectId: string): Promise<DispatchStatus[]>;
  /** Subscribe to background-dispatch status updates. Returns an unsubscribe fn. */
  onDispatchStatus(cb: (status: DispatchStatus) => void): () => void;
  /** Show the native right-click menu for a card; resolves with the chosen action. */
  /** Bring a board fully current: v1→v2, stage backfill, v→3 (dryRun previews). */
  migrate(projectId: string, dryRun: boolean): Promise<BoardMigrationReport>;
  /** Backfill the 7-stage default onto an already-v2 board (dryRun previews). */
  backfillBoard(projectId: string, dryRun: boolean): Promise<{ addedStages: string[] }>;
  /** Native multi-select picker for reference files; [] when cancelled. */
  pickReferences(projectId: string): Promise<string[]>;
  /** Copy a file into the ticket's gate-exempt `reference/` folder. */
  addReference(projectId: string, id: string, sourcePath: string): Promise<{ name: string }>;
  /** Open a reference in the OS default application. */
  openReference(projectId: string, id: string, name: string): Promise<void>;
  /** Delete a reference. Irreversible — confirm before calling. */
  removeReference(projectId: string, id: string, name: string): Promise<void>;
  /** A project's current on-disk format — re-read after an external migration. */
  getFormat(projectId: string): Promise<1 | 2 | 3>;
  /**
   * Read a ticket pipeline document with its version token (both null when
   * not written yet, or for a legacy item). Pass `version` back as
   * `expectedVersion` on setDoc to be rejected instead of overwriting a
   * concurrent edit.
   */
  getDoc(
    projectId: string,
    id: string,
    doc: TicketDoc,
  ): Promise<{ content: string | null; version: string | null }>;
  /**
   * Write (or append to) a ticket pipeline document, resolving with the
   * version token of exactly what was written. `expectedVersion: undefined`
   * is last-write-wins; a string expects those exact bytes; `null` expects
   * the document not to exist yet.
   */
  setDoc(
    projectId: string,
    id: string,
    doc: TicketDoc,
    content: string,
    opts?: { append?: boolean; expectedVersion?: string | null },
  ): Promise<{ version: string }>;
  /** Which pipeline docs exist + checklist progress; null for legacy items. */
  getDocsInfo(projectId: string, id: string): Promise<TicketDocsInfo | null>;
  /** The ticket area's resolved doc types (name/order/requires/progress) — for the doc tabs. */
  getDocTypes(projectId: string, id: string): Promise<DocType[]>;
  /** The board's resolved default document model — seeds the Settings Documents tab. */
  getDocModel(projectId: string): Promise<DocModel>;
  /** Open a governing doc (a repo-relative path under the project root) in the OS default app. */
  openRepoDoc(projectId: string, relPath: string): Promise<void>;
  /** Read a governing doc's text for the in-app view; null when missing/unreadable. */
  getRepoDoc(projectId: string, relPath: string): Promise<string | null>;
  /** Native file picker rooted at the project; resolves to a repo-relative path or null. */
  pickRepoDoc(projectId: string): Promise<string | null>;
  /**
   * For a ticket, per board stage: the unmet gate reasons if it moved there from
   * its current stage (empty array = the move is allowed). Backs the drag lock-tint.
   */
  getGateStatus(projectId: string, id: string): Promise<Record<string, string[]>>;
  /** The full gate report for one ticket — the core resolver, verbatim. */
  getGates(projectId: string, id: string): Promise<GateReport | null>;
  listGroups(projectId: string, opts?: { kind?: string; includeArchived?: boolean }): Promise<Group[]>;
  getGroup(projectId: string, id: string): Promise<GroupWithMembers | null>;
  createGroup(projectId: string, kind: string, title: string, body?: string): Promise<Group>;
  updateGroup(
    projectId: string,
    id: string,
    patch: { title?: string; body?: string; archived?: boolean },
  ): Promise<Group>;
  getGroupDoc(projectId: string, id: string, path: string): Promise<string | null>;
  setGroupDoc(projectId: string, id: string, path: string, content: string): Promise<{ file: string }>;
  /** Read the activity log. */
  getActivity(
    projectId: string,
    opts?: { id?: string; since?: string; limit?: number },
  ): Promise<ActivityEntry[]>;
  /** Subscribe to on-disk changes (e.g. an agent editing via MCP). Returns an unsubscribe fn. */
  onChange(cb: (payload: ChangePayload) => void): () => void;
  /** Subscribe to reveal requests (notification clicks) — scoped to a project. */
  onReveal(cb: (payload: RevealPayload) => void): () => void;
  /** Subscribe to application-menu commands. */
  onMenu(cb: (cmd: MenuCommand) => void): () => void;
  /** Subscribe to changes made by someone other than this GUI. */
  onAgentChange(cb: (payload: AgentChangePayload) => void): () => void;
  /** Current auto-update state (`disabled` in dev/smoke). */
  getUpdateState(): Promise<UpdateStatusEvent>;
  /**
   * Install the downloaded update and restart. NOT CANCELLABLE — BaseUpdater
   * spawns the installer BEFORE app.quit(), and the installer force-kills every
   * process under the install dir. Every guard (unsaved edits, live agent
   * sessions) must run in the renderer BEFORE this is called. Main refuses
   * unless an update is actually downloaded.
   */
  /**
   * Start the install. Resolves to null when the app is on its way down, or to
   * a reason when the install was refused because the install folder could not
   * be cleared (GUI-064). A refusal leaves the update downloaded and retryable.
   */
  installUpdate(): Promise<string | null>;
  /** Agent MCP sessions an update would close. Probe before offering "Restart now". */
  mcpSessions(): Promise<McpSessions>;
  /** Subscribe to auto-update state changes. Returns an unsubscribe fn. */
  onUpdateStatus(cb: (payload: UpdateStatusEvent) => void): () => void;
  /** Cloudflare-only remote access, keyed by the canonical MCP project fingerprint. */
  remoteRegister(projectId: string): Promise<RemoteProjectView>;
  remoteView(projectId: string): Promise<RemoteProjectView>;
  remoteOverview(): Promise<RemoteProjectView[]>;
  remoteReconcile(projectId: string, expectedConfigGeneration?: string | null): Promise<RemoteProjectView>;
  remoteRemove(projectId: string, expectedConfigGeneration?: string | null): Promise<void>;
  remoteSaveConfig(projectId: string, config: RemoteConfigInput): Promise<RemoteProjectView>;
  remoteCreateSecret(projectId: string, rotate?: boolean, expectedConfigGeneration?: string | null): Promise<RemoteSecretDelivery>;
  remoteConsumeSecret(projectId: string, deliveryId: string): Promise<boolean>;
  remoteCopySecret(projectId: string, deliveryId: string): Promise<boolean>;
  remoteStart(projectId: string, expectedConfigGeneration?: string | null): Promise<RemoteStatus>;
  remoteStop(projectId: string, expectedRuntimeGeneration?: string | null): Promise<RemoteStatus>;
  remoteDoctor(projectId: string, expected?: { configGeneration?: string | null; runtimeGeneration?: string | null }): Promise<RemoteDoctorResult>;
  onRemoteStatus(cb: (status: RemoteStatus) => void): () => void;
  /** OpenAI Secure MCP Tunnel, deliberately separate from Cloudflare remote access. */
  openAITunnelRegister(projectId: string): Promise<OpenAITunnelProjectView>;
  openAITunnelView(projectId: string): Promise<OpenAITunnelProjectView>;
  openAITunnelOverview(): Promise<OpenAITunnelProjectView[]>;
  openAITunnelSaveProfile(projectId: string, config: OpenAITunnelConfigInput): Promise<OpenAITunnelProjectView>;
  openAITunnelInitialize(projectId: string): Promise<OpenAITunnelDoctorResult>;
  openAITunnelDoctor(projectId: string): Promise<OpenAITunnelDoctorResult>;
  openAITunnelStart(projectId: string, expectedGeneration?: string | null): Promise<OpenAITunnelStatus>;
  openAITunnelStop(projectId: string, expectedGeneration?: string | null): Promise<OpenAITunnelStatus>;
  openAITunnelRestart(projectId: string, expectedGeneration?: string | null): Promise<OpenAITunnelStatus>;
  openAITunnelReconcile(projectId: string, expectedGeneration?: string | null): Promise<OpenAITunnelProjectView>;
  openAITunnelRemove(projectId: string, expectedGeneration?: string | null): Promise<void>;
  onOpenAITunnelStatus(cb: (status: OpenAITunnelStatus) => void): () => void;
  /**
   * FRD-029 endpoint registry (GUI-144). Observation is read-only across every
   * named project; writes are registry metadata only and never carry a path —
   * a project is added by naming an OPEN tab, whose roots main already knows.
   */
  registryObserve(projectId: string | null): Promise<RegistryView>;
  registryAddProject(projectId: string, name: string, policy?: string | null): Promise<RegistryView>;
  /** Rename/remove/policy act only on the endpoint bound to `projectId`'s open project; any other name is refused (`REGISTRY_NOT_SELECTED`). */
  registryRename(projectId: string, from: string, to: string): Promise<RegistryView>;
  registryRemove(projectId: string, name: string): Promise<RegistryView>;
  registrySetPolicy(projectId: string, name: string, policy: string | null): Promise<RegistryView>;
}
