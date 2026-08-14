import { describe, expect, it } from "vitest";
import { restoredActiveTab, restoreTabs } from "./session.js";
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
