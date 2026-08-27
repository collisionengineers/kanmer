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
  workspaces: [{ ticket: "GUI-144", stage: "implementing", branch: "gui-144-project-registry", worktree: ".worktrees/gui-144", controller: "claude-code", assignee: "claude-code", claim: "live", takenAt: "2026-08-27T20:21:15.896Z", expiresAt: "2026-08-27T20:51:15.896Z", lease: { id: "lease-1", revision: 3, phase: "implementing", provider: "claude-code", workspace: ".worktrees/gui-144", heartbeatAt: "2026-08-27T20:30:00.000Z", controllerRun: null, workerRun: null, heartbeatStale: false } }],
  problems: [],
};
const beta: RegistryEndpointView = {
  ...alpha,
  name: "beta",
  boardRoot: "C:/beta",
  repoRoot: "C:/beta",
  policy: null,
  health: "unassigned",
  selected: false,
  project: null,
  location: null,
  boardSync: null,
  format: 3,
  ticketCount: 0,
  controllers: [],
  workspaces: [],
  problems: ["board has no logical project identity"],
};
// A stale registry pointer: no board at the recorded path (F-015).
const gamma: RegistryEndpointView = {
  ...beta,
  name: "gamma",
  boardRoot: "C:/gamma",
  repoRoot: "C:/gamma",
  health: "missing-board",
  format: null,
  ticketCount: null,
  problems: ["no .kanmer board at C:/gamma"],
};
const view: RegistryView = { registry: { path: "C:/Users/me/.kanmer/endpoints.json", source: "default", exists: true, error: null }, endpoints: [alpha, beta, gamma], selectedRegistered: true };

function install(overrides: Partial<Record<string, unknown>> = {}) {
  const api = {
    registryObserve: vi.fn(async () => view),
    registryAddProject: vi.fn(async () => view),
    registryRename: vi.fn(async () => view),
    registryRemove: vi.fn(async () => view),
    registrySetPolicy: vi.fn(async () => view),
    // The section must never reach for the raw bridge to open a project: only
    // the App-level callback updates tabs and board state (review F-002).
    openProject: vi.fn(async () => { throw new Error("raw openProject must not be called from the registry section"); }),
    ...overrides,
  };
  (window as unknown as { kanmer: typeof api }).kanmer = api;
  return api;
}

function renderSection(projectId = "C:/alpha", onOpenProject = vi.fn(async (_root: string) => undefined)) {
  const utils = render(<ProjectRegistrySection projectId={projectId} onOpenProject={onOpenProject} />);
  return { ...utils, onOpenProject };
}

describe("project registry surface", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("shows two projects with distinct health and only the selected one is mutable", async () => {
    const api = install();
    const { onOpenProject } = renderSection();
    const alphaCard = await screen.findByRole("article", { name: "Registry endpoint alpha" });
    const betaCard = screen.getByRole("article", { name: "Registry endpoint beta" });
    expect(api.registryObserve).toHaveBeenCalledWith("C:/alpha");
    expect(within(alphaCard).getByLabelText("Health ok").textContent).toBe("Healthy");
    const gammaCard = screen.getByRole("article", { name: "Registry endpoint gamma" });
    expect(within(betaCard).getByLabelText("Health unassigned").textContent).toBe("No identity yet");
    expect(within(gammaCard).getByLabelText("Health missing-board").textContent).toBe("Board missing");
    expect(within(alphaCard).getByLabelText("Selected project")).toBeTruthy();
    expect(within(betaCard).queryByLabelText("Selected project")).toBeNull();
    expect(within(alphaCard).getByText(/11111111-1111-4111-8111-111111111111/)).toBeTruthy();
    expect(within(alphaCard).getByText(/ahead 2 · behind 0/)).toBeTruthy();
    expect(within(alphaCard).getByText(/Active controllers: claude-code \(GUI-144\)/)).toBeTruthy();
    expect(within(alphaCard).getByText(/lease lease-1 r3 · implementing/)).toBeTruthy();
    expect(within(gammaCard).getByText("no .kanmer board at C:/gamma")).toBeTruthy();
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
    await waitFor(() => expect(onOpenProject).toHaveBeenCalledWith("C:/beta"));
    expect(api.openProject).not.toHaveBeenCalled();
    expect(screen.queryByText(/raw openProject/)).toBeNull();
    expect(api.registryRename).not.toHaveBeenCalled();
    expect(api.registryRemove).not.toHaveBeenCalled();
    expect(api.registrySetPolicy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Add this project to the registry")).toBeNull();
  });

  it("refuses to open an endpoint whose board was not observed, so a stale pointer never becomes a fresh board (F-015)", async () => {
    const stale: RegistryEndpointView = { ...gamma, name: "stale-invalid", health: "invalid", problems: ["boardRoot must be a non-empty string"] };
    const failed: RegistryEndpointView = { ...gamma, name: "stale-error", health: "error", problems: ["EACCES"] };
    install({ registryObserve: vi.fn(async () => ({ ...view, endpoints: [alpha, beta, gamma, stale, failed] })) });
    const { onOpenProject } = renderSection();
    await screen.findByRole("article", { name: "Registry endpoint alpha" });
    for (const name of ["gamma", "stale-invalid", "stale-error"]) {
      const card = screen.getByRole("article", { name: `Registry endpoint ${name}` });
      const open = within(card).getByRole("button", { name: "Open project" }) as HTMLButtonElement;
      expect(open.disabled).toBe(true);
      expect(within(card).getByLabelText(`Open refused for ${name}`)).toBeTruthy();
      fireEvent.click(open);
    }
    const betaCard = screen.getByRole("article", { name: "Registry endpoint beta" });
    expect((within(betaCard).getByRole("button", { name: "Open project" }) as HTMLButtonElement).disabled).toBe(false);
    expect(within(betaCard).queryByLabelText("Open refused for beta")).toBeNull();
    expect(onOpenProject).not.toHaveBeenCalled();
  });

  it("renames, saves policy and removes the selected endpoint through the registry api", async () => {
    const api = install();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderSection();
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
    renderSection();
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
    renderSection();
    expect(await screen.findByText("registry is not valid JSON")).toBeTruthy();
    expect(screen.getByText(/KANMER_ENDPOINT_REGISTRY/)).toBeTruthy();
    expect(screen.queryByLabelText("Add this project to the registry")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add this project" })).toBeNull();
  });

  it("opening another project goes through the App and the section follows the new selection", async () => {
    // After the App switches tabs it re-renders Settings with the new
    // projectId; the section must reload for that project and show it as
    // selected — proof that "Open project" is the selection path.
    const betaSelected: RegistryView = { ...view, endpoints: [{ ...alpha, selected: false }, { ...beta, selected: true }] };
    const api = install({ registryObserve: vi.fn(async (projectId: string) => (projectId === "C:/beta" ? betaSelected : view)) });
    const onOpenProject = vi.fn(async (_root: string) => undefined);
    const { rerender } = render(<ProjectRegistrySection projectId="C:/alpha" onOpenProject={onOpenProject} />);
    const betaCard = await screen.findByRole("article", { name: "Registry endpoint beta" });
    fireEvent.click(within(betaCard).getByRole("button", { name: "Open project" }));
    await waitFor(() => expect(onOpenProject).toHaveBeenCalledWith("C:/beta"));
    rerender(<ProjectRegistrySection projectId="C:/beta" onOpenProject={onOpenProject} />);
    await waitFor(() => expect(api.registryObserve).toHaveBeenCalledWith("C:/beta"));
    const betaNow = await screen.findByRole("article", { name: "Registry endpoint beta" });
    await waitFor(() => expect(within(betaNow).getByLabelText("Selected project")).toBeTruthy());
    expect(within(betaNow).getByRole("button", { name: "Remove from registry" })).toBeTruthy();
    const alphaNow = screen.getByRole("article", { name: "Registry endpoint alpha" });
    expect(within(alphaNow).queryByRole("button", { name: "Rename" })).toBeNull();
    expect(within(alphaNow).getByRole("button", { name: "Open project" })).toBeTruthy();
    expect(api.openProject).not.toHaveBeenCalled();
  });

  it("surfaces main's refusal when a mutation is aimed at a non-selected endpoint", async () => {
    const api = install({ registryRename: vi.fn(async () => { throw new Error('REGISTRY_NOT_SELECTED: "alpha" is not the selected project ("beta")'); }) });
    renderSection();
    const alphaCard = await screen.findByRole("article", { name: "Registry endpoint alpha" });
    fireEvent.change(within(alphaCard).getByLabelText("Rename endpoint"), { target: { value: "alpha-2" } });
    fireEvent.click(within(alphaCard).getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(api.registryRename).toHaveBeenCalledWith("C:/alpha", "alpha", "alpha-2"));
    expect(await screen.findByText(/REGISTRY_NOT_SELECTED/)).toBeTruthy();
  });
});
