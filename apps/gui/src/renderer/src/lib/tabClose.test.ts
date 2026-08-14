import { describe, expect, it } from "vitest";
import { tabCloseDecision } from "./tabClose.js";
describe("tabCloseDecision", () => { it("prompts only for the active dirty tab", () => {
  expect(tabCloseDecision("a", "a", true)).toBe("confirm");
  expect(tabCloseDecision("a", "a", false)).toBe("close");
  expect(tabCloseDecision("b", "a", true)).toBe("close");
}); });
