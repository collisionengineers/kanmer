import { describe, expect, it } from "vitest";
import { clearClipboardIfUnchanged } from "./Settings.js";

describe("remote token clipboard cleanup", () => {
  it("clears only when the user has not replaced the copied value", async () => {
    let value = "token";
    const clipboard = { readText: async () => value, writeText: async (next: string) => { value = next; } };
    expect(await clearClipboardIfUnchanged(clipboard, "token")).toBe(true);
    expect(value).toBe("");
    value = "a newer user value";
    expect(await clearClipboardIfUnchanged(clipboard, "token")).toBe(false);
    expect(value).toBe("a newer user value");
  });
});

