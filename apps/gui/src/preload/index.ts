import { contextBridge, ipcRenderer } from "electron";
import {
  CH,
  type ChangePayload,
  type KanmerApi,
  type MenuCommand,
} from "../shared/ipc.js";

const api: KanmerApi = {
  pickProject: () => ipcRenderer.invoke(CH.pickProject),
  openProject: (root) => ipcRenderer.invoke(CH.openProject, root),
  currentProject: () => ipcRenderer.invoke(CH.currentProject),
  getBoard: () => ipcRenderer.invoke(CH.getBoard),
  setBoard: (board) => ipcRenderer.invoke(CH.setBoard, board),
  listItems: (filter) => ipcRenderer.invoke(CH.listItems, filter),
  getItem: (id) => ipcRenderer.invoke(CH.getItem, id),
  createItem: (input) => ipcRenderer.invoke(CH.createItem, input),
  updateItem: (id, patch) => ipcRenderer.invoke(CH.updateItem, id, patch),
  moveItem: (id, to) => ipcRenderer.invoke(CH.moveItem, id, to),
  deleteItem: (id) => ipcRenderer.invoke(CH.deleteItem, id),
  releaseTicket: (id) => ipcRenderer.invoke(CH.releaseTicket, id),
  addColumn: (kind, column) => ipcRenderer.invoke(CH.addColumn, kind, column),
  linkItems: (source, target, action) => ipcRenderer.invoke(CH.linkItems, source, target, action),
  getLinks: (id) => ipcRenderer.invoke(CH.getLinks, id),
  getSettings: () => ipcRenderer.invoke(CH.getSettings),
  setTheme: (theme) => ipcRenderer.invoke(CH.setTheme, theme),
  setNotifications: (on) => ipcRenderer.invoke(CH.setNotifications, on),
  connectAgent: (target) => ipcRenderer.invoke(CH.connectAgent, target),
  showItemMenu: (payload) => ipcRenderer.invoke(CH.showItemMenu, payload),
  onChange: (cb) => {
    const listener = (_e: unknown, payload: ChangePayload) => cb(payload);
    ipcRenderer.on(CH.changed, listener);
    return () => ipcRenderer.removeListener(CH.changed, listener);
  },
  onReveal: (cb) => {
    const listener = (_e: unknown, id: string) => cb(id);
    ipcRenderer.on(CH.reveal, listener);
    return () => ipcRenderer.removeListener(CH.reveal, listener);
  },
  onMenu: (cb) => {
    const listener = (_e: unknown, cmd: MenuCommand) => cb(cmd);
    ipcRenderer.on(CH.menu, listener);
    return () => ipcRenderer.removeListener(CH.menu, listener);
  },
};

contextBridge.exposeInMainWorld("kanmer", api);
