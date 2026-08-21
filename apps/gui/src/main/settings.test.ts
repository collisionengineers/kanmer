import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const userData = "C:\\Windows\\Temp\\kanmer-gui075-settings";
vi.mock("electron", () => ({ app: { getPath: () => "C:\\Windows\\Temp\\kanmer-gui075-settings" } }));

const { readSettings, setDispatchSettings, resolveDispatchSettings } = await import("./settings.js");

afterEach(async () => { await rm(userData, { recursive: true, force: true }); });

describe("dispatch settings", () => {
  it("normalizes known providers/tasks and resolves task precedence", async () => {
    const saved = await setDispatchSettings({
      providers: {
        claude: { defaultModel: "  sonnet  ", taskModels: { files: "haiku", stale: "ignored" } as never, promptSuffix: "  run lint  " },
      },
    });
    expect(saved.dispatch.providers).toEqual({ claude: { defaultModel: "sonnet", taskModels: { files: "haiku" }, promptSuffix: "run lint" } });
    expect(resolveDispatchSettings(saved.dispatch, "claude", "files")).toMatchObject({ model: "haiku", promptCustomized: true });
    expect(resolveDispatchSettings(saved.dispatch, "claude", "verify")).toMatchObject({ model: "sonnet" });
    expect(readSettings().dispatch).toEqual(saved.dispatch);
  });

  it("rejects invalid control characters and oversized values before writing", async () => {
    await expect(setDispatchSettings({ providers: { codex: { defaultModel: "bad\0model" } } })).rejects.toThrow(/invalid/);
    await expect(setDispatchSettings({ providers: { codex: { promptSuffix: "x".repeat(4001) } } })).rejects.toThrow(/invalid/);
  });
});
