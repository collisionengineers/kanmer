import { describe, expect, it } from "vitest";
import { dispatchProviderById } from "./dispatch-providers.js";
import { composeDispatchPrompt, DISPATCH_TASKS, takeTicketPromptText } from "./prompts.js";

describe("dispatch provider SSOT", () => {
  it("keeps every default argv byte-for-byte compatible", () => {
    expect(dispatchProviderById("codex")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R" })).toEqual(["exec", "P"]);
    expect(dispatchProviderById("claude")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R" })).toEqual(["-p", "P"]);
    expect(dispatchProviderById("opencode")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R" })).toEqual(["run", "P"]);
    expect(dispatchProviderById("grok")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R" })).toEqual(["-p", "P", "--cwd", "R"]);
    expect(dispatchProviderById("antigravity")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R" })).toEqual(["--add-dir", "R", "-p", "P"]);
  });

  it("adds measured model flags without changing prompt ordering", () => {
    expect(dispatchProviderById("codex")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R", model: "m" })).toEqual(["exec", "--model", "m", "P"]);
    expect(dispatchProviderById("claude")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R", model: "m" })).toEqual(["-p", "P", "--model", "m"]);
    expect(dispatchProviderById("opencode")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R", model: "m" })).toEqual(["run", "--model", "m", "P"]);
    expect(dispatchProviderById("grok")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R", model: "m" })).toEqual(["-p", "P", "--model", "m", "--cwd", "R"]);
    expect(dispatchProviderById("antigravity")?.buildDispatchArgs({ prompt: "P", sourceRoot: "R", model: "m" })).toEqual(["--add-dir", "R", "-p", "P"]);
  });

  it("keeps Antigravity binding exact for hostile Windows roots", () => {
    const root = String.raw`C:\\Users\\Me\\Projects\\Kanmer & Tools\\日本語`;
    expect(dispatchProviderById("antigravity")?.buildDispatchArgs({ prompt: "P & Q", sourceRoot: root })).toEqual([
      "--add-dir",
      root,
      "-p",
      "P & Q",
    ]);
    expect(dispatchProviderById("antigravity")?.modelOption).toBeUndefined();
  });

  it("preserves the built-in prompt when suffix is empty and appends otherwise", () => {
    const builtIn = takeTicketPromptText("TICK-001");
    expect(composeDispatchPrompt(builtIn, "")).toBe(builtIn);
    expect(composeDispatchPrompt(builtIn, "  run lint  ")).toBe(`${builtIn}\n\nAdditional operator instructions for this provider:\nrun lint`);
    for (const task of DISPATCH_TASKS) {
      const prompt = task.prompt("TICK-001");
      expect(composeDispatchPrompt(prompt, "\nkeep internal newline\n")).toContain(prompt);
      expect(() => composeDispatchPrompt(prompt, "x".repeat(4001))).toThrow(/at most/);
      expect(() => composeDispatchPrompt(prompt, "bad\0suffix")).toThrow(/control/);
    }
  });
});
