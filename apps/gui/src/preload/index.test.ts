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

describe("preload view-preferences bridge", () => {
  beforeEach(() => electron.ipcRenderer.invoke.mockClear());

  it("forwards the project id, and nothing else, when reading view preferences", async () => {
    // The renderer never sees the logical project_id — main resolves it. So
    // this call must carry exactly the same argument every other
    // project-scoped method carries, and no path or identity field.
    await electron.exposedApi()!.getViewPrefs("C:/repo");
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith(CH.getViewPrefs, "C:/repo");
  });

  it("forwards the whole preference value when writing", async () => {
    const prefs = { scope: "done", sidebarCollapsed: true, columnPages: { done: 3 } };
    await electron.exposedApi()!.setViewPrefs("C:/repo", prefs);
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith(CH.setViewPrefs, "C:/repo", prefs);
  });
});
