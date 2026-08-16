import { describe, expect, it } from "vitest";
import { restartWarning, updateSurface } from "./update.js";
import type { McpSessions, UpdatePhase, UpdateStatusEvent } from "../../../shared/ipc.js";

function ev(status: UpdatePhase, source: "auto" | "manual" = "auto"): UpdateStatusEvent {
  return { status, source };
}

const NO_SESSIONS: McpSessions = { count: 0, projects: [], pids: [], unknown: false };

describe("updateSurface", () => {
  it("shows nothing before anything has happened", () => {
    expect(updateSurface(null, false)).toEqual({ kind: "none" });
  });

  it("shows nothing while idle, checking, or disabled", () => {
    expect(updateSurface(ev({ phase: "idle" }), false)).toEqual({ kind: "none" });
    expect(updateSurface(ev({ phase: "checking" }), false)).toEqual({ kind: "none" });
    expect(updateSurface(ev({ phase: "disabled" }), false)).toEqual({ kind: "none" });
  });

  it("toasts while an update is available", () => {
    expect(updateSurface(ev({ phase: "available", version: "0.2.0" }), false)).toEqual({
      kind: "toast",
      text: "Kanmer 0.2.0 is downloading…",
    });
  });

  it("toasts while downloading", () => {
    const surface = updateSurface(
      ev({ phase: "downloading", version: "0.2.0", percent: 40 }),
      false,
    );
    expect(surface).toEqual({ kind: "toast", text: "Kanmer 0.2.0 is downloading…" });
  });

  it("banners a downloaded update", () => {
    expect(updateSurface(ev({ phase: "downloaded", version: "0.2.0" }), false)).toEqual({
      kind: "banner",
      version: "0.2.0",
    });
  });

  it("hides the banner once dismissed for the session", () => {
    expect(updateSurface(ev({ phase: "downloaded", version: "0.2.0" }), true)).toEqual({
      kind: "none",
    });
  });

  it("confirms up-to-date only for a manual check", () => {
    expect(updateSurface(ev({ phase: "none", version: "0.1.0" }, "manual"), false)).toEqual({
      kind: "toast",
      text: "Kanmer 0.1.0 is up to date.",
    });
  });

  it("stays silent when an auto check finds nothing", () => {
    expect(updateSurface(ev({ phase: "none", version: "0.1.0" }, "auto"), false)).toEqual({
      kind: "none",
    });
  });

  it("reports a manual check failure", () => {
    expect(updateSurface(ev({ phase: "error", message: "net down" }, "manual"), false)).toEqual({
      kind: "toast",
      text: "Update check failed: net down",
    });
  });

  it("stays silent when an auto check fails — a laptop going offline is not news", () => {
    expect(updateSurface(ev({ phase: "error", message: "net down" }, "auto"), false)).toEqual({
      kind: "none",
    });
  });
});

describe("restartWarning", () => {
  it("returns null when there is nothing to lose", () => {
    expect(restartWarning(null, NO_SESSIONS)).toBeNull();
  });

  it("names the dirty item", () => {
    expect(restartWarning("API-001", NO_SESSIONS)).toBe(
      "Restarting to update will discard unsaved changes to API-001. Continue?",
    );
  });

  it("names the session count and the projects", () => {
    const sessions: McpSessions = {
      count: 2,
      projects: ["C:\\code\\a", "C:\\code\\b"],
      pids: [111, 222],
      unknown: false,
    };
    expect(restartWarning(null, sessions)).toBe(
      "Restarting to update will close 2 agent MCP session(s) (C:\\code\\a, C:\\code\\b). Continue?",
    );
  });

  it("composes both facts into one sentence, so the user is asked once", () => {
    const sessions: McpSessions = {
      count: 1,
      projects: ["C:\\code\\a"],
      pids: [111],
      unknown: false,
    };
    expect(restartWarning("API-001", sessions)).toBe(
      "Restarting to update will discard unsaved changes to API-001 and " +
        "close 1 agent MCP session(s) (C:\\code\\a). Continue?",
    );
  });

  it("falls back to generic wording when the probe failed", () => {
    const sessions: McpSessions = { count: 0, projects: [], pids: [], unknown: true };
    expect(restartWarning(null, sessions)).toBe(
      "Restarting to update will close any agent MCP sessions running from this install. Continue?",
    );
  });
});
