import type {
  BoardColumn,
  BoardConfig,
  ColumnKind,
  CreateItemInput,
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
  addColumn: "kanmer:addColumn",
  linkItems: "kanmer:linkItems",
  getLinks: "kanmer:getLinks",
  getSettings: "kanmer:getSettings",
  setTheme: "kanmer:setTheme",
  connectAgent: "kanmer:connectAgent",
  changed: "kanmer:changed",
} as const;

export type Theme = "dark" | "light";

export type ConnectTarget = "codex" | "claude";

export interface ConnectResult {
  ok: boolean;
  command: string;
  output: string;
}

export interface AppSettings {
  theme: Theme;
  recentProjects: string[];
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
  deleteItem(id: string): Promise<boolean>;
  addColumn(kind: ColumnKind, column: BoardColumn): Promise<BoardConfig>;
  linkItems(source: string, target: string, action: "add" | "remove"): Promise<Item>;
  getLinks(id: string): Promise<LinkGraph>;
  getSettings(): Promise<AppSettings>;
  setTheme(theme: Theme): Promise<AppSettings>;
  /** Register the MCP server with codex / Claude Code for the open project. */
  connectAgent(target: ConnectTarget): Promise<ConnectResult>;
  /** Subscribe to on-disk changes (e.g. an agent editing via MCP). Returns an unsubscribe fn. */
  onChange(cb: (payload: ChangePayload) => void): () => void;
}
