import { describe, expect, it } from "vitest";
import { restoreBackgroundTabs, restoredActiveTab, restoreTabs } from "./session.js";
const settings = (openTabs: string[], sessionInitialized: boolean) => ({ openTabs, activeTab: "", sessionInitialized }) as Parameters<typeof restoreTabs>[0];
describe("restoreTabs", () => {
  it("uses legacy only before an empty session is initialized", () => {
    expect(restoreTabs(settings([], false), "legacy")).toEqual(["legacy"]);
    expect(restoreTabs(settings([], true), "legacy")).toEqual([]);
  });
  it("preserves tabs and falls back from an invalid active tab", () => {
    expect(restoreTabs(settings(["one", "two"], true), "legacy")).toEqual(["one", "two"]);
    expect(restoredActiveTab(["one", "two"], "gone")).toBe("two");
  });
});

describe("restoreBackgroundTabs", () => {
  it("reports a failed restore and continues opening later tabs", async () => {
    const opened: string[] = [];
    const failures: Array<{ path: string; error: unknown }> = [];

    await restoreBackgroundTabs(
      ["missing-project", "healthy-project", "active-project"],
      "active-project",
      async (path) => {
        if (path === "missing-project") throw new Error("project is unavailable");
        return path;
      },
      (project) => opened.push(project),
      (path, error) => failures.push({ path, error }),
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ path: "missing-project" });
    expect(failures[0].error).toEqual(new Error("project is unavailable"));
    expect(opened).toEqual(["healthy-project"]);
  });
});
