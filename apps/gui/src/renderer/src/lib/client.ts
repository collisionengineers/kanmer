import { createContext, useContext } from "react";
import type { GateReport } from "@kanmer/core";
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
import type {
  ConnectResult,
  ConnectTarget,
  DispatchStatus,
  DocModel,
  SkillsStatus,
} from "../../../shared/ipc.js";

/**
 * The project-scoped subset of the IPC API, with `projectId` already bound
 * (Phase 5, D3). Components consume it from `useClient()` and call
 * `client.getItem(id)` — the tab wiring supplies the right per-project client,
 * so a component never has to know which project it's showing.
 */
export interface ProjectClient {
  projectId: string;
  getBoard(): Promise<BoardConfig>;
  setBoard(board: BoardConfig): Promise<BoardConfig>;
  listItems(filter?: ItemFilter): Promise<Item[]>;
  listItemsWithWarnings(filter?: ItemFilter): Promise<{ items: Item[]; warnings: ItemWarning[] }>;
  getItem(id: string): Promise<Item | null>;
  createItem(input: CreateItemInput): Promise<Item>;
  updateItem(id: string, patch: UpdateItemPatch): Promise<Item>;
  moveItem(id: string, to: { status: string; position?: MovePosition }): Promise<Item>;
  deleteItem(id: string): Promise<DeleteItemResult>;
  takeTicket(id: string, input: TakeTicketInput): Promise<Item>;
  releaseTicket(id: string): Promise<Item>;
  addColumn(kind: ColumnKind, column: BoardColumn): Promise<BoardConfig>;
  linkItems(source: string, target: string, action: "add" | "remove"): Promise<Item>;
  getLinks(id: string): Promise<LinkGraph>;
  connectAgent(target: ConnectTarget): Promise<ConnectResult>;
  disconnectAgent(target: ConnectTarget): Promise<ConnectResult>;
  getSkillsStatus(target: ConnectTarget): Promise<SkillsStatus>;
  updateSkills(target: ConnectTarget): Promise<ConnectResult>;
  dispatchAgent(ticketId: string, target: ConnectTarget): Promise<DispatchStatus>;
  migrate(dryRun: boolean): Promise<MigrationReport>;
  backfillBoard(dryRun: boolean): Promise<{ addedStages: string[] }>;
  getFormat(): Promise<1 | 2 | 3>;
  getDoc(id: string, doc: TicketDoc): Promise<{ content: string | null; version: string | null }>;
  setDoc(
    id: string,
    doc: TicketDoc,
    content: string,
    opts?: { append?: boolean; expectedVersion?: string | null },
  ): Promise<{ version: string }>;
  getDocsInfo(id: string): Promise<TicketDocsInfo | null>;
  getDocTypes(id: string): Promise<DocType[]>;
  getDocModel(): Promise<DocModel>;
  openRepoDoc(relPath: string): Promise<void>;
  getRepoDoc(relPath: string): Promise<string | null>;
  pickRepoDoc(): Promise<string | null>;
  getGateStatus(id: string): Promise<Record<string, string[]>>;
  getGates(id: string): Promise<GateReport | null>;
  getActivity(opts?: { id?: string; since?: string; limit?: number }): Promise<ActivityEntry[]>;
}

/** Bind a projectId to the global IPC surface. */
export function makeClient(projectId: string): ProjectClient {
  const k = window.kanmer;
  return {
    projectId,
    getBoard: () => k.getBoard(projectId),
    setBoard: (b) => k.setBoard(projectId, b),
    listItems: (f) => k.listItems(projectId, f),
    listItemsWithWarnings: (f) => k.listItemsWithWarnings(projectId, f),
    getItem: (id) => k.getItem(projectId, id),
    createItem: (i) => k.createItem(projectId, i),
    updateItem: (id, p) => k.updateItem(projectId, id, p),
    moveItem: (id, to) => k.moveItem(projectId, id, to),
    deleteItem: (id) => k.deleteItem(projectId, id),
    takeTicket: (id, i) => k.takeTicket(projectId, id, i),
    releaseTicket: (id) => k.releaseTicket(projectId, id),
    addColumn: (kind, c) => k.addColumn(projectId, kind, c),
    linkItems: (s, t, a) => k.linkItems(projectId, s, t, a),
    getLinks: (id) => k.getLinks(projectId, id),
    connectAgent: (t) => k.connectAgent(projectId, t),
    disconnectAgent: (t) => k.disconnectAgent(projectId, t),
    getSkillsStatus: (t) => k.getSkillsStatus(projectId, t),
    updateSkills: (t) => k.updateSkills(projectId, t),
    dispatchAgent: (ticketId, t) => k.dispatchAgent(projectId, ticketId, t),
    migrate: (d) => k.migrate(projectId, d),
    backfillBoard: (d) => k.backfillBoard(projectId, d),
    getFormat: () => k.getFormat(projectId),
    getDoc: (id, doc) => k.getDoc(projectId, id, doc),
    setDoc: (id, doc, content, opts) => k.setDoc(projectId, id, doc, content, opts),
    getDocsInfo: (id) => k.getDocsInfo(projectId, id),
    getDocTypes: (id) => k.getDocTypes(projectId, id),
    getDocModel: () => k.getDocModel(projectId),
    openRepoDoc: (rel) => k.openRepoDoc(projectId, rel),
    getRepoDoc: (rel) => k.getRepoDoc(projectId, rel),
    pickRepoDoc: () => k.pickRepoDoc(projectId),
    getGateStatus: (id) => k.getGateStatus(projectId, id),
    getGates: (id) => k.getGates(projectId, id),
    getActivity: (opts) => k.getActivity(projectId, opts),
  };
}

export const ClientContext = createContext<ProjectClient | null>(null);

/** The active project's client. Throws if used outside a ProjectContext.Provider. */
export function useClient(): ProjectClient {
  const client = useContext(ClientContext);
  if (!client) throw new Error("useClient must be used within a ClientContext.Provider");
  return client;
}
