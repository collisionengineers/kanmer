import { contextBridge, ipcRenderer } from "electron";
import {
  CH,
  type AgentChangePayload,
  type ChangePayload,
  type DispatchStatus,
  type KanmerApi,
  type MenuCommand,
  type RevealPayload,
  type UpdateStatusEvent,
} from "../shared/ipc.js";

const api: KanmerApi = {
  pickProject: () => ipcRenderer.invoke(CH.pickProject),
  openProject: (root) => ipcRenderer.invoke(CH.openProject, root),
  closeProject: (p) => ipcRenderer.invoke(CH.closeProject, p),
  currentProject: () => ipcRenderer.invoke(CH.currentProject),
  getBoard: (p) => ipcRenderer.invoke(CH.getBoard, p),
  setBoard: (p, board) => ipcRenderer.invoke(CH.setBoard, p, board),
  listItems: (p, filter) => ipcRenderer.invoke(CH.listItems, p, filter),
  listItemsWithWarnings: (p, filter) => ipcRenderer.invoke(CH.listItemsWithWarnings, p, filter),
  getItem: (p, id) => ipcRenderer.invoke(CH.getItem, p, id),
  createItem: (p, input) => ipcRenderer.invoke(CH.createItem, p, input),
  updateItem: (p, id, patch) => ipcRenderer.invoke(CH.updateItem, p, id, patch),
  moveItem: (p, id, to) => ipcRenderer.invoke(CH.moveItem, p, id, to),
  deleteItem: (p, id) => ipcRenderer.invoke(CH.deleteItem, p, id),
  takeTicket: (p, id, input) => ipcRenderer.invoke(CH.takeTicket, p, id, input),
  releaseTicket: (p, id) => ipcRenderer.invoke(CH.releaseTicket, p, id),
  addColumn: (p, kind, column) => ipcRenderer.invoke(CH.addColumn, p, kind, column),
  linkItems: (p, source, target, action) =>
    ipcRenderer.invoke(CH.linkItems, p, source, target, action),
  getLinks: (p, id) => ipcRenderer.invoke(CH.getLinks, p, id),
  getSettings: () => ipcRenderer.invoke(CH.getSettings),
  setTheme: (theme) => ipcRenderer.invoke(CH.setTheme, theme),
  setNotifications: (on) => ipcRenderer.invoke(CH.setNotifications, on),
  setPreferences: (patch) => ipcRenderer.invoke(CH.setPreferences, patch),
  setKanmerGitPreferences: (prefs) => ipcRenderer.invoke(CH.setKanmerGitPreferences, prefs),
  getKanmerGitStatus: (p) => ipcRenderer.invoke(CH.getKanmerGitStatus, p),
  syncKanmerNow: (p) => ipcRenderer.invoke(CH.syncKanmerNow, p),
  onGitStatus: (cb) => {
    const listener = (_e: unknown, status: Parameters<typeof cb>[0]) => cb(status);
    ipcRenderer.on(CH.gitStatus, listener);
    return () => ipcRenderer.removeListener(CH.gitStatus, listener);
  },
  setOpenTabs: (openTabs, activeTab) => ipcRenderer.invoke(CH.setOpenTabs, openTabs, activeTab),
  connectAgent: (p, target) => ipcRenderer.invoke(CH.connectAgent, p, target),
  disconnectAgent: (p, target) => ipcRenderer.invoke(CH.disconnectAgent, p, target),
  listProviders: () => ipcRenderer.invoke(CH.listProviders),
  getSkillsStatus: (p, target) => ipcRenderer.invoke(CH.getSkillsStatus, p, target),
  updateSkills: (p, target) => ipcRenderer.invoke(CH.updateSkills, p, target),
  dispatchAgent: (p, ticketId, target) => ipcRenderer.invoke(CH.dispatchAgent, p, ticketId, target),
  cancelDispatch: (dispatchId) => ipcRenderer.invoke(CH.cancelDispatch, dispatchId),
  listDispatches: (p) => ipcRenderer.invoke(CH.listDispatches, p),
  onDispatchStatus: (cb) => {
    const listener = (_e: unknown, status: DispatchStatus) => cb(status);
    ipcRenderer.on(CH.dispatchStatus, listener);
    return () => ipcRenderer.removeListener(CH.dispatchStatus, listener);
  },
  migrate: (p, dryRun) => ipcRenderer.invoke(CH.migrate, p, dryRun),
  backfillBoard: (p, dryRun) => ipcRenderer.invoke(CH.backfillBoard, p, dryRun),
  getFormat: (p) => ipcRenderer.invoke(CH.getFormat, p),
  getDoc: (p, id, doc) => ipcRenderer.invoke(CH.getDoc, p, id, doc),
  setDoc: (p, id, doc, content, opts) => ipcRenderer.invoke(CH.setDoc, p, id, doc, content, opts),
  getDocsInfo: (p, id) => ipcRenderer.invoke(CH.getDocsInfo, p, id),
  getDocTypes: (p, id) => ipcRenderer.invoke(CH.getDocTypes, p, id),
  getDocModel: (p) => ipcRenderer.invoke(CH.getDocModel, p),
  openRepoDoc: (p, rel) => ipcRenderer.invoke(CH.openRepoDoc, p, rel),
  getRepoDoc: (p, rel) => ipcRenderer.invoke(CH.getRepoDoc, p, rel),
  pickRepoDoc: (p) => ipcRenderer.invoke(CH.pickRepoDoc, p),
  getGateStatus: (p, id) => ipcRenderer.invoke(CH.getGateStatus, p, id),
  getActivity: (p, opts) => ipcRenderer.invoke(CH.getActivity, p, opts),
  onChange: (cb) => {
    const listener = (_e: unknown, payload: ChangePayload) => cb(payload);
    ipcRenderer.on(CH.changed, listener);
    return () => ipcRenderer.removeListener(CH.changed, listener);
  },
  onReveal: (cb) => {
    const listener = (_e: unknown, payload: RevealPayload) => cb(payload);
    ipcRenderer.on(CH.reveal, listener);
    return () => ipcRenderer.removeListener(CH.reveal, listener);
  },
  onMenu: (cb) => {
    const listener = (_e: unknown, cmd: MenuCommand) => cb(cmd);
    ipcRenderer.on(CH.menu, listener);
    return () => ipcRenderer.removeListener(CH.menu, listener);
  },
  onAgentChange: (cb) => {
    const listener = (_e: unknown, payload: AgentChangePayload) => cb(payload);
    ipcRenderer.on(CH.agentChange, listener);
    return () => ipcRenderer.removeListener(CH.agentChange, listener);
  },
  getUpdateState: () => ipcRenderer.invoke(CH.getUpdateState),
  installUpdate: () => ipcRenderer.invoke(CH.installUpdate),
  mcpSessions: () => ipcRenderer.invoke(CH.mcpSessions),
  onUpdateStatus: (cb) => {
    const listener = (_e: unknown, payload: UpdateStatusEvent) => cb(payload);
    ipcRenderer.on(CH.updateStatus, listener);
    return () => ipcRenderer.removeListener(CH.updateStatus, listener);
  },
};

contextBridge.exposeInMainWorld("kanmer", api);
