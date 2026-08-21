// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteProjectView, RemoteStatus } from "../../../shared/remote.js";
import { RemoteSection } from "./Settings.js";

const status: RemoteStatus = {
  projectId: "/repo", fingerprint: "kanmer-proj-v1:" + "a".repeat(64), provider: "cloudflared", state: "stopped", action: "idle", severity: "info",
  health: { board: "ready", listener: "not-run", authentication: "not-run", sessions: "not-run", tunnel: "not-run", remote: "not-run" },
  local: "stopped", tunnel: "stopped", public: "not-run", endpoint: null, authRequired: true, tokenId: null, generation: null,
  configGeneration: "generation-1", runtimeGeneration: null, lastSummary: null, lastRepair: null, lastDoctorAt: null, diagnostics: [], lastError: null, updatedAt: new Date().toISOString(),
};
const project: RemoteProjectView = {
  projectId: "/repo", identity: { fingerprint: status.fingerprint, boardRoot: "/repo/.worktrees/kanmer", repoRoot: "/repo", format: 3, boardSource: "file" },
  config: { provider: "cloudflared", executable: "cloudflared", tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", credentialsFile: "/credentials.json", hostname: "mcp.example.com", enabled: true, autoStart: false, secretConfigured: false }, status,
};
const secondProject: RemoteProjectView = { ...project, projectId: "/other", identity: { ...project.identity, fingerprint: "kanmer-proj-v1:" + "b".repeat(64) }, status: { ...status, projectId: "/other", fingerprint: "kanmer-proj-v1:" + "b".repeat(64), state: "missing", lastError: "REMOTE_PROJECT_NOT_OPEN" } };

describe("remote access surface", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("renders the masked one-time dialog and complete project card actions", async () => {
    const remoteCreateSecret = vi.fn(async () => ({ deliveryId: "delivery", expiresAt: new Date(Date.now() + 60_000).toISOString(), token: "A".repeat(43) }));
    const remoteOverview = vi.fn(async () => [project, secondProject]);
    const api = {
      remoteRegister: vi.fn(async () => project), remoteOverview, remoteCreateSecret, remoteCopySecret: vi.fn(async () => true), remoteConsumeSecret: vi.fn(async () => true),
      remoteSaveConfig: vi.fn(async () => project), remoteStart: vi.fn(), remoteStop: vi.fn(), remoteDoctor: vi.fn(), remoteReconcile: vi.fn(async () => project), remoteRemove: vi.fn(), openProject: vi.fn(async () => undefined), onRemoteStatus: vi.fn(() => () => undefined),
    };
    (window as unknown as { kanmer: typeof api }).kanmer = api;
    render(<RemoteSection projectId="/repo" />);
    expect(await screen.findByRole("article", { name: "Remote access project /repo" })).toBeTruthy();
    expect(screen.getByText(/Selected project actions are below/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open project" }));
    await waitFor(() => expect(api.openProject).toHaveBeenCalledWith("/other"));
    await waitFor(() => expect((screen.getByRole("button", { name: "Create token" }) as HTMLButtonElement).disabled).toBe(false));
    await waitFor(() => expect((screen.getByRole("button", { name: "Create token" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));
    await waitFor(() => expect(remoteCreateSecret).toHaveBeenCalledWith("/repo", false, "generation-1"));
    const dialog = await screen.findByRole("dialog", { name: "One-time bearer token" });
    expect(dialog.getAttribute("aria-describedby")).toBe("remote-token-description");
    expect(dialog.querySelector("[aria-label='Masked one-time token']")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reveal one-time token" }));
    expect(dialog.querySelector("[aria-label='Revealed one-time token']")).toBeTruthy();
  });
});
