import type { KanmerApi } from "../shared/ipc.js";

declare global {
  interface Window {
    kanmer: KanmerApi;
  }
}

export {};
