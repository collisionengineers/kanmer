// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenAITunnelProjectView, OpenAITunnelStatus } from "../../../shared/openaiTunnel.js";
import { OpenAITunnelSection } from "./Settings.js";

const fingerprint = `kanmer-proj-v1:${"a".repeat(64)}`;
const status: OpenAITunnelStatus = { projectId: "/repo", fingerprint, profileName: "repo", state: "stopped", action: "idle", severity: "info", health: { executable: "ready", credential: "unknown", listener: "unknown", mcp: "unknown" }, restartRequired: false, lastSummary: null, lastError: null, lastDoctorAt: null, updatedAt: new Date().toISOString() };
const project: OpenAITunnelProjectView = { projectId: "/repo", identity: { fingerprint, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" }, profile: { profileName: "repo", tunnelId: "tunnel-1", executable: "tunnel-client", credentialEnv: "CONTROL_PLANE_API_KEY", healthAddress: "127.0.0.1:8765", enabled: true, autoStart: false, generation: "11111111-1111-1111-1111-111111111111", lastSummary: null, lastError: null, lastDoctorAt: null }, status };

describe("OpenAI tunnel settings surface", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("shows non-secret profile fields and sends lifecycle actions through the typed API", async () => {
    const api = {
      openAITunnelRegister: vi.fn(async () => project), openAITunnelOverview: vi.fn(async () => [project]), openAITunnelSaveProfile: vi.fn(async () => project), openAITunnelInitialize: vi.fn(async () => ({ ok: true, projectId: "/repo", fingerprint, checks: [], summary: "initialized", severity: "info" as const, generation: project.profile!.generation, at: new Date().toISOString() })), openAITunnelDoctor: vi.fn(), openAITunnelStart: vi.fn(async () => ({ ...status, state: "degraded" as const })), openAITunnelStop: vi.fn(), openAITunnelRestart: vi.fn(), onOpenAITunnelStatus: vi.fn(() => () => undefined),
    };
    (window as unknown as { kanmer: typeof api }).kanmer = api;
    render(<OpenAITunnelSection projectId="/repo" />);
    expect(await screen.findByDisplayValue("CONTROL_PLANE_API_KEY")).toBeTruthy();
    expect(screen.queryByDisplayValue(/do-not-log|secret|api-key-value/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Initialize" }));
    await waitFor(() => expect(api.openAITunnelInitialize).toHaveBeenCalledWith("/repo"));
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(api.openAITunnelSaveProfile).toHaveBeenCalledWith("/repo", expect.objectContaining({ credentialEnv: "CONTROL_PLANE_API_KEY" })));
  });
});
