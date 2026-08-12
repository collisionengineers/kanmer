import type {
  BoardColumn,
  BoardConfig,
  ColumnKind,
  CreateItemInput,
  DeleteItemResult,
  Item,
  ItemFilter,
  LinkGraph,
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
  getItem: "kanmer:getItem",
  createItem: "kanmer:createItem",
  updateItem: "kanmer:updateItem",
  moveItem: "kanmer:moveItem",
  deleteItem: "kanmer:deleteItem",
  releaseTicket: "kanmer:releaseTicket",
  addColumn: "kanmer:addColumn",
  linkItems: "kanmer:linkItems",
  getLinks: "kanmer:getLinks",
  getSettings: "kanmer:getSettings",
  setTheme: "kanmer:setTheme",
  setNotifications: "kanmer:setNotifications",
  connectAgent: "kanmer:connectAgent",
  showItemMenu: "kanmer:showItemMenu",
  changed: "kanmer:changed",
  /** Main → renderer: reveal an item (toast click, etc.). */
  reveal: "kanmer:reveal",
  /** Main → renderer: application-menu commands. */
  menu: "kanmer:menu",
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
}

export interface ChangePayload {
  event: "add" | "change" | "unlink";
  file: string;
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
  getItem(id: string): Promise<Item | null>;
  createItem(input: CreateItemInput): Promise<Item>;
  updateItem(id: string, patch: UpdateItemPatch): Promise<Item>;
  moveItem(id: string, to: { status: string }): Promise<Item>;
  deleteItem(id: string): Promise<DeleteItemResult>;
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
  /** Subscribe to on-disk changes (e.g. an agent editing via MCP). Returns an unsubscribe fn. */
  onChange(cb: (payload: ChangePayload) => void): () => void;
  /** Subscribe to reveal requests (notification clicks). */
  onReveal(cb: (id: string) => void): () => void;
  /** Subscribe to application-menu commands. */
  onMenu(cb: (cmd: MenuCommand) => void): () => void;
}
