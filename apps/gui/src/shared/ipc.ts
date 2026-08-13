import type {
  ActivityEntry,
  BoardColumn,
  BoardConfig,
  ColumnKind,
  CreateItemInput,
  DeleteItemResult,
  DocType,
  GateRule,
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
} from "@kanmer/core";

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
  setKanmerGitPreferences: "kanmer:setKanmerGitPreferences",
  getKanmerGitStatus: "kanmer:getKanmerGitStatus",
  syncKanmerNow: "kanmer:syncKanmerNow",
  gitStatus: "kanmer:gitStatus",
  connectAgent: "kanmer:connectAgent",
  disconnectAgent: "kanmer:disconnectAgent",
  listProviders: "kanmer:listProviders",
  getSkillsStatus: "kanmer:getSkillsStatus",
  updateSkills: "kanmer:updateSkills",
  dispatchAgent: "kanmer:dispatchAgent",
  cancelDispatch: "kanmer:cancelDispatch",
  listDispatches: "kanmer:listDispatches",
  /** Main → renderer: a background dispatch's status changed. */
  dispatchStatus: "kanmer:dispatchStatus",
  showItemMenu: "kanmer:showItemMenu",
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
  getActivity: "kanmer:getActivity",
  changed: "kanmer:changed",
  /** Main → renderer: reveal an item (toast click, etc.). */
  reveal: "kanmer:reveal",
  /** Main → renderer: application-menu commands. */
  menu: "kanmer:menu",
  /** Main → renderer: a change NOT made by this GUI (agent/manual edit). */
  agentChange: "kanmer:agentChange",
  /** Main → renderer: auto-update state changes. */
  updateStatus: "kanmer:updateStatus",
} as const;

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
}

/** Whether a host's copied skill set is present and outdated (Phase 6.2). */
export interface SkillsStatus {
  scope: "marketplace" | "project" | "agentsOnly";
  installedVersion: string | null;
  bundledVersion: string;
  updateAvailable: boolean;
}

/** A background agent dispatch's live status. */
export interface DispatchStatus {
  dispatchId: string;
  /** Canonical project root that owns this dispatch. */
  projectId: string;
  ticketId: string;
  provider: ConnectTarget;
  state: "running" | "done" | "failed" | "cancelled" | "timed-out";
  startedAt: number;
  exitCode?: number | null;
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
}

export interface KanmerGitPreferences { kanmerBranch: string; gitSyncMinutes: number; }
export interface KanmerGitStatus { available: boolean; boardRoot: string | null; branch: string; lastSync: string | null; error: string | null; paused: boolean; }

export interface OpenProjectResult {
  /** Canonical project root — the projectId every scoped call carries. */
  projectId: string;
  root: string;
  boardRoot: string;
  board: BoardConfig;
  items: Item[];
  /** Storage format: 1 = legacy layout (offer migration), 2 = current. */
  format: 1 | 2;
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
  defaultTypes: DocType[];
  defaultGates: GateRule[];
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
  unknown: boolean;
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
export type MenuCommand = { type: "pick-project" } | { type: "open-project"; path: string };

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
  setKanmerGitPreferences(prefs: KanmerGitPreferences): Promise<AppSettings>;
  getKanmerGitStatus(projectId: string): Promise<KanmerGitStatus>;
  syncKanmerNow(projectId: string): Promise<KanmerGitStatus>;
  onGitStatus(cb: (status: KanmerGitStatus & { projectId: string }) => void): () => void;
  /** Persist the open-tab session (project roots + the active one). */
  setOpenTabs(openTabs: string[], activeTab: string): Promise<AppSettings>;
  /** Register the MCP server + install skills for the given host in a project. */
  connectAgent(projectId: string, target: ConnectTarget): Promise<ConnectResult>;
  /** Unregister the host and remove the copied skills / AGENTS.md block. */
  disconnectAgent(projectId: string, target: ConnectTarget): Promise<ConnectResult>;
  /** The agent hosts Connect can register (drives the Connect tab). */
  listProviders(): Promise<ProviderInfo[]>;
  /** Whether the host's copied skill set is present and outdated (Phase 6.2). */
  getSkillsStatus(projectId: string, target: ConnectTarget): Promise<SkillsStatus>;
  /** Re-copy the bundled skills for a host ("Update skills"). */
  updateSkills(projectId: string, target: ConnectTarget): Promise<ConnectResult>;
  /** Spawn a background agent to work a ticket end-to-end (request #10). */
  dispatchAgent(projectId: string, ticketId: string, target: ConnectTarget): Promise<DispatchStatus>;
  /** Cancel a dispatch by its globally unique dispatch id (tree-kills the child). */
  cancelDispatch(dispatchId: string): Promise<boolean>;
  /** Current in-flight dispatches for a project. */
  listDispatches(projectId: string): Promise<DispatchStatus[]>;
  /** Subscribe to background-dispatch status updates. Returns an unsubscribe fn. */
  onDispatchStatus(cb: (status: DispatchStatus) => void): () => void;
  /** Show the native right-click menu for a card; resolves with the chosen action. */
  showItemMenu(payload: ItemMenuPayload): Promise<ItemMenuAction | null>;
  /** Migrate a v1 project to format 2 (dryRun for the report only). */
  migrate(projectId: string, dryRun: boolean): Promise<MigrationReport>;
  /** Backfill the 7-stage default onto an already-v2 board (dryRun previews). */
  backfillBoard(projectId: string, dryRun: boolean): Promise<{ addedStages: string[] }>;
  /** A project's current on-disk format — re-read after an external migration. */
  getFormat(projectId: string): Promise<1 | 2>;
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
}
