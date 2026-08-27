// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RegistryEndpointView, RegistryView } from "../../../shared/ipc.js";
import { ProjectRegistrySection } from "./ProjectRegistry.js";

const alpha: RegistryEndpointView = {
  name: "alpha",
  boardRoot: "C:/alpha/.worktrees/kanmer",
  repoRoot: "C:/alpha",
  boardBranch: "kanmer-board",
  policy: "main-only",
  health: "ok",
  selected: true,
  project: { project_id: "11111111-1111-4111-8111-111111111111", board_id: "11111111-1111-4111-8111-111111111111", identity: "logical", origin: "generated", fingerprint: "kanmer-proj-v1:" + "a".repeat(64) },
  location: { repoPath: "c:/alpha", boardPath: "c:/alpha/.worktrees/kanmer", machine: "host", boardBranch: "kanmer-board", remoteOrigin: "https://example.test/alpha.git", fingerprint: "kanmer-loc-v1:" + "1".repeat(64) },
  boardSync: { remote: true, ahead: 2, behind: 0, localSha: "a", remoteSha: "b" },
  format: 3,
  ticketCount: 12,
  controllers: [{ controller: "claude-code", tickets: ["GUI-144"] }],
  workspaces: [{ ticket: "GUI-144", stage: "implementing", branch: "gui-144-project-registry", worktree: ".worktrees/gui-144", controller: "claude-code", assignee: "claude-code", claim: "live", takenAt: "2026-08-27T20:21:15.896Z", expiresAt: "2026-08-27T20:51:15.896Z", lease: { id: "lease-1", revision: 3, phase: "implementing", provider: "claude-code", workspace: ".worktrees/gui-144", heartbeatAt: "2026-08-27T20:30:00.000Z", controllerRun: null, workerRun: null } }],
  problems: [],
};
const beta: RegistryEndpointView = {
  ...alpha,
  name: "beta",
  boardRoot: "C:/beta",
  repoRoot: "C:/beta",
  policy: null,
  health: "missing-board",
  selected: false,
  project: null,
  location: null,
  boardSync: null,
  format: null,
  ticketCount: null,
  controllers: [],
  workspaces: [],
  problems: ["no .kanmer board at C:/beta"],
};
const view: RegistryView = { registry: { path: "C:/Users/me/.kanmer/endpoints.json", source: "default", exists: true, error: null }, endpoints: [alpha, beta], selectedRegistered: true };

function install(overrides: Partial<Record<string, unknown>> = {}) {
  const api = {
    registryObserve: vi.fn(async () => view),
    registryAddProject: vi.fn(async () => view),
    registryRename: vi.fn(async () => view),
    registryRemove: vi.fn(async () => view),
    registrySetPolicy: vi.fn(async () => view),
    openProject: vi.fn(async () => undefined),
    ...overrides,
  };
  (window as unknown as { kanmer: typeof api }).kanmer = api;
  return api;
}

describe("project registry surface", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("shows two projects with distinct health and only the selected one is mutable", async () => {
    const api = install();
    render(<ProjectRegistrySection projectId="C:/alpha" />);
    const alphaCard = await screen.findByRole("article", { name: "Registry endpoint alpha" });
    const betaCard = screen.getByRole("article", { name: "Registry endpoint beta" });
    expect(api.registryObserve).toHaveBeenCalledWith("C:/alpha");
    expect(within(alphaCard).getByLabelText("Health ok").textContent).toBe("Healthy");
    expect(within(betaCard).getByLabelText("Health missing-board").textContent).toBe("Board missing");
    expect(within(alphaCard).getByLabelText("Selected project")).toBeTruthy();
    expect(within(betaCard).queryByLabelText("Selected project")).toBeNull();
    expect(within(alphaCard).getByText(/11111111-1111-4111-8111-111111111111/)).toBeTruthy();
    expect(within(alphaCard).getByText(/ahead 2 · behind 0/)).toBeTruthy();
    expect(within(alphaCard).getByText(/Active controllers: claude-code \(GUI-144\)/)).toBeTruthy();
    expect(within(alphaCard).getByText(/lease lease-1 r3 · implementing/)).toBeTruthy();
    expect(within(betaCard).getByText("no .kanmer board at C:/beta")).toBeTruthy();
    // The selected project owns every registry control; the other project can only be opened.
    expect(within(alphaCard).getByRole("button", { name: "Rename" })).toBeTruthy();
    expect(within(alphaCard).getByRole("button", { name: "Save policy" })).toBeTruthy();
    expect(within(alphaCard).getByRole("button", { name: "Remove from registry" })).toBeTruthy();
    expect(within(alphaCard).queryByRole("button", { name: "Open project" })).toBeNull();
    expect(within(betaCard).queryByRole("button", { name: "Rename" })).toBeNull();
    expect(within(betaCard).queryByRole("button", { name: "Save policy" })).toBeNull();
    expect(within(betaCard).queryByRole("button", { name: "Remove from registry" })).toBeNull();
    expect(within(betaCard).queryByLabelText("Rename endpoint")).toBeNull();
    expect(within(betaCard).getByText(/Observation only/)).toBeTruthy();
    fireEvent.click(within(betaCard).getByRole("button", { name: "Open project" }));
    await waitFor(() => expect(api.openProject).toHaveBeenCalledWith("C:/beta"));
    expect(api.registryRename).not.toHaveBeenCalled();
    expect(api.registryRemove).not.toHaveBeenCalled();
    expect(api.registrySetPolicy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Add this project to the registry")).toBeNull();
  });

  it("renames, saves policy and removes the selected endpoint through the registry api", async () => {
    const api = install();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProjectRegistrySection projectId="C:/alpha" />);
    const alphaCard = await screen.findByRole("article", { name: "Registry endpoint alpha" });
    fireEvent.change(within(alphaCard).getByLabelText("Rename endpoint"), { target: { value: "alpha-2" } });
    fireEvent.click(within(alphaCard).getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(api.registryRename).toHaveBeenCalledWith("C:/alpha", "alpha", "alpha-2"));
    fireEvent.change(within(alphaCard).getByLabelText("Endpoint policy"), { target: { value: "dev-to-main" } });
    fireEvent.click(within(alphaCard).getByRole("button", { name: "Save policy" }));
    await waitFor(() => expect(api.registrySetPolicy).toHaveBeenCalledWith("C:/alpha", "alpha", "dev-to-main"));
    fireEvent.click(within(alphaCard).getByRole("button", { name: "Remove from registry" }));
    await waitFor(() => expect(api.registryRemove).toHaveBeenCalledWith("C:/alpha", "alpha"));
    expect(api.openProject).not.toHaveBeenCalled();
  });

  it("offers to add the selected project by name only when it is not registered", async () => {
    const unregistered: RegistryView = { ...view, endpoints: [{ ...beta, selected: false }], selectedRegistered: false };
    const api = install({ registryObserve: vi.fn(async () => unregistered) });
    render(<ProjectRegistrySection projectId="C:/alpha" />);
    const form = await screen.findByLabelText("Add this project to the registry");
    const add = within(form).getByRole("button", { name: "Add this project" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(within(form).getByLabelText("New endpoint name"), { target: { value: "Bad Name" } });
    expect(add.disabled).toBe(true);
    expect(within(form).getByText(/Names are lowercase/)).toBeTruthy();
    fireEvent.change(within(form).getByLabelText("New endpoint name"), { target: { value: "alpha" } });
    fireEvent.change(within(form).getByLabelText("New endpoint policy"), { target: { value: "main-only" } });
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    await waitFor(() => expect(api.registryAddProject).toHaveBeenCalledWith("C:/alpha", "alpha", "main-only"));
    // The renderer never hands a path to the registry: the project is named by its open tab.
    for (const call of api.registryAddProject.mock.calls as unknown[][]) expect(call.slice(1)).toEqual(["alpha", "main-only"]);
  });

  it("surfaces a malformed registry file and observation errors without controls", async () => {
    const broken: RegistryView = { registry: { path: "C:/x/endpoints.json", source: "env", exists: true, error: "registry is not valid JSON" }, endpoints: [], selectedRegistered: false };
    install({ registryObserve: vi.fn(async () => broken) });
    render(<ProjectRegistrySection projectId="C:/alpha" />);
    expect(await screen.findByText("registry is not valid JSON")).toBeTruthy();
    expect(screen.getByText(/KANMER_ENDPOINT_REGISTRY/)).toBeTruthy();
    expect(screen.queryByLabelText("Add this project to the registry")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add this project" })).toBeNull();
  });
});
