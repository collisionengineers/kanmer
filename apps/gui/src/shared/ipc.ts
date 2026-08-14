import type {
  ActivityEntry,
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
} from "@kanmer/core";

/** IPC channel names (main ↔ renderer). */
export const CH = {
  pickProject: "kanmer:pickProject",
  openProject: "kanmer:openProject",
  currentProject: "kanmer:currentProject",
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
  connectAgent: "kanmer:connectAgent",
  showItemMenu: "kanmer:showItemMenu",
  migrate: "kanmer:migrate",
  getFormat: "kanmer:getFormat",
  getDoc: "kanmer:getDoc",
  setDoc: "kanmer:setDoc",
  getDocsInfo: "kanmer:getDocsInfo",
  getDocTypes: "kanmer:getDocTypes",
  openRepoDoc: "kanmer:openRepoDoc",
  getRepoDoc: "kanmer:getRepoDoc",
  getActivity: "kanmer:getActivity",
  changed: "kanmer:changed",
  /** Main → renderer: reveal an item (toast click, etc.). */
  reveal: "kanmer:reveal",
  /** Main → renderer: application-menu commands. */
  menu: "kanmer:menu",
  /** Main → renderer: a change NOT made by this GUI (agent/manual edit). */
  agentChange: "kanmer:agentChange",
} as const;

export type Theme = "dark" | "light" | "system";

export type ConnectTarget = "codex" | "claude";

export interface ConnectResult {
  ok: boolean;
  command: string;
  output: string;
}

export interface AppSettings {
  theme: Theme;
  recentProjects: string[];
  notifications: boolean;
}

export interface OpenProjectResult {
  root: string;
  board: BoardConfig;
  items: Item[];
  /** Storage format: 1 = legacy layout (offer migration), 2 = current. */
  format: 1 | 2;
}

export interface ChangePayload {
  event: "add" | "change" | "unlink";
  file: string;
}

/** A change on disk that this GUI didn't make (agent or manual edit). */
export interface AgentChangePayload {
  /** Item id, or "board". */
  key: string;
  event: "add" | "change" | "unlink";
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
  | { type: "delete" };

/** Application-menu commands forwarded to the renderer. */
export type MenuCommand = { type: "pick-project" } | { type: "open-project"; path: string };

/** The API exposed to the renderer on `window.kanmer`. */
export interface KanmerApi {
  pickProject(): Promise<string | null>;
  openProject(root: string): Promise<OpenProjectResult>;
  currentProject(): Promise<string | null>;
  getBoard(): Promise<BoardConfig>;
  setBoard(board: BoardConfig): Promise<BoardConfig>;
  listItems(filter?: ItemFilter): Promise<Item[]>;
  /** Like listItems, but also surfaces unparseable/mislocated files. */
  listItemsWithWarnings(
    filter?: ItemFilter,
  ): Promise<{ items: Item[]; warnings: ItemWarning[] }>;
  getItem(id: string): Promise<Item | null>;
  createItem(input: CreateItemInput): Promise<Item>;
  updateItem(id: string, patch: UpdateItemPatch): Promise<Item>;
  /**
   * Move an item to a stage, optionally to a position within that column.
   * `position` is column-scoped (`order` is a column-wide key), and optional
   * at every layer: omitting it is the plain stage change.
   */
  moveItem(id: string, to: { status: string; position?: MovePosition }): Promise<Item>;
  deleteItem(id: string): Promise<DeleteItemResult>;
  /** Take a ticket: record branch/worktree and move it into the working stage. */
  takeTicket(id: string, input: TakeTicketInput): Promise<Item>;
  /** Clear an agent's taken_at/branch/worktree (e.g. a stuck ticket). */
  releaseTicket(id: string): Promise<Item>;
  addColumn(kind: ColumnKind, column: BoardColumn): Promise<BoardConfig>;
  linkItems(source: string, target: string, action: "add" | "remove"): Promise<Item>;
  getLinks(id: string): Promise<LinkGraph>;
  getSettings(): Promise<AppSettings>;
  setTheme(theme: Theme): Promise<AppSettings>;
  setNotifications(on: boolean): Promise<AppSettings>;
  /** Register the MCP server with codex / Claude Code for the open project. */
  connectAgent(target: ConnectTarget): Promise<ConnectResult>;
  /** Show the native right-click menu for a card; resolves with the chosen action. */
  showItemMenu(payload: ItemMenuPayload): Promise<ItemMenuAction | null>;
  /** Migrate the open v1 project to format 2 (dryRun for the report only). */
  migrate(dryRun: boolean): Promise<MigrationReport>;
  /** The store's current on-disk format — re-read after an external migration. */
  getFormat(): Promise<1 | 2>;
  /**
   * Read a ticket pipeline document with its version token (both null when
   * not written yet, or for a legacy item). Pass `version` back as
   * `expectedVersion` on setDoc to be rejected instead of overwriting a
   * concurrent edit.
   */
  getDoc(id: string, doc: TicketDoc): Promise<{ content: string | null; version: string | null }>;
  /**
   * Write (or append to) a ticket pipeline document, resolving with the
   * version token of exactly what was written. `expectedVersion: undefined`
   * is last-write-wins; a string expects those exact bytes; `null` expects
   * the document not to exist yet.
   */
  setDoc(
    id: string,
    doc: TicketDoc,
    content: string,
    opts?: { append?: boolean; expectedVersion?: string | null },
  ): Promise<{ version: string }>;
  /** Which pipeline docs exist + checklist progress; null for legacy items. */
  getDocsInfo(id: string): Promise<TicketDocsInfo | null>;
  /** The ticket area's resolved doc types (name/order/requires/progress) — for the doc tabs. */
  getDocTypes(id: string): Promise<DocType[]>;
  /** Open a governing doc (a repo-relative path under the project root) in the OS default app. */
  openRepoDoc(relPath: string): Promise<void>;
  /** Read a governing doc's text for the in-app view; null when missing/unreadable. */
  getRepoDoc(relPath: string): Promise<string | null>;
  /** Read the activity log. */
  getActivity(opts?: { id?: string; since?: string; limit?: number }): Promise<ActivityEntry[]>;
  /** Subscribe to on-disk changes (e.g. an agent editing via MCP). Returns an unsubscribe fn. */
  onChange(cb: (payload: ChangePayload) => void): () => void;
  /** Subscribe to reveal requests (notification clicks). */
  onReveal(cb: (id: string) => void): () => void;
  /** Subscribe to application-menu commands. */
  onMenu(cb: (cmd: MenuCommand) => void): () => void;
  /** Subscribe to changes made by someone other than this GUI. */
  onAgentChange(cb: (payload: AgentChangePayload) => void): () => void;
}
