import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KanmerApi } from "../shared/ipc.js";
import { CH } from "../shared/ipc.js";

const electron = vi.hoisted(() => {
  let api: KanmerApi | undefined;
  return {
    contextBridge: {
      exposeInMainWorld: vi.fn((_name: string, value: KanmerApi) => { api = value; }),
    },
    ipcRenderer: {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    },
    exposedApi: () => api,
  };
});

vi.mock("electron", () => ({
  contextBridge: electron.contextBridge,
  ipcRenderer: electron.ipcRenderer,
}));

await import("./index.js");

describe("preload remote access bridge", () => {
  beforeEach(() => electron.ipcRenderer.invoke.mockClear());

  it("forwards the observed config generation when creating a bearer", async () => {
    const api = electron.exposedApi();
    expect(api).toBeDefined();

    await api!.remoteCreateSecret("C:/repo", false, "generation-1");

    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith(
      CH.remoteCreateSecret,
      "C:/repo",
      false,
      "generation-1",
    );
  });
});
