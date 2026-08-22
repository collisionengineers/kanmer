import { describe, expect, it } from "vitest";
import { withSyncLifecycles, type SyncLifecycleState } from "./syncLifecycle.js";

describe("withSyncLifecycles", () => {
  it("waits for an in-flight operation before starting the next one", async () => {
    const state: SyncLifecycleState = {};
    const events: string[] = [];
    let releaseFirst!: () => void;
    const first = withSyncLifecycles([state], async () => {
      events.push("first:start");
      await new Promise<void>((resolve) => { releaseFirst = resolve; });
      events.push("first:end");
    });
    await Promise.resolve();

    const second = withSyncLifecycles([state], async () => {
      events.push("second:start");
    });
    await Promise.resolve();
    expect(events).toEqual(["first:start"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("releases the lock when an operation fails", async () => {
    const state: SyncLifecycleState = {};
    await expect(withSyncLifecycles([state], async () => {
      throw new Error("rename failed");
    })).rejects.toThrow("rename failed");

    await expect(withSyncLifecycles([state], async () => "next")).resolves.toBe("next");
  });
});
