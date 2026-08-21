import { describe, expect, it } from "vitest";
import { clearClipboardIfUnchanged } from "../../../shared/remote.js";

describe("remote token clipboard cleanup", () => {
  it("clears only when the user has not replaced the copied value", () => {
    let value = "token";
    const clipboard = { readText: () => value, writeText: (next: string) => { value = next; } };
    expect(clearClipboardIfUnchanged(clipboard, "token")).toBe(true);
    expect(value).toBe("");
    value = "a newer user value";
    expect(clearClipboardIfUnchanged(clipboard, "token")).toBe(false);
    expect(value).toBe("a newer user value");
  });
});
