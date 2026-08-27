// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { defaultBoardConfig, type BoardConfig } from "@kanmer/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RegistryEndpointView, RegistryView } from "../../../shared/ipc.js";
import { Settings } from "./Settings.js";

const alpha: RegistryEndpointView = {
  name: "alpha", boardRoot: "C:/alpha/.worktrees/kanmer", repoRoot: "C:/alpha", boardBranch: "kanmer-board", policy: null, health: "ok", selected: true,
  project: { project_id: "11111111-1111-4111-8111-111111111111", board_id: "11111111-1111-4111-8111-111111111111", identity: "logical", origin: "generated", fingerprint: "kanmer-proj-v1:" + "a".repeat(64) },
  location: null, boardSync: null, format: 3, ticketCount: 1, controllers: [], workspaces: [], problems: [],
};
const beta: RegistryEndpointView = {
  ...alpha, name: "beta", boardRoot: "C:/beta/.worktrees/kanmer", repoRoot: "C:/beta", selected: false,
  project: { project_id: "22222222-2222-4222-8222-222222222222", board_id: "22222222-2222-4222-8222-222222222222", identity: "logical", origin: "generated", fingerprint: "kanmer-proj-v1:" + "b".repeat(64) },
};
const view: RegistryView = { registry: { path: "C:/Users/me/.kanmer/endpoints.json", source: "default", exists: true, error: null }, endpoints: [alpha, beta], selectedRegistered: true };

function install() {
  const api = {
    registryObserve: vi.fn(async () => view), registryAddProject: vi.fn(async () => view), registryRename: vi.fn(async () => view), registryRemove: vi.fn(async () => view), registrySetPolicy: vi.fn(async () => view),
    openProject: vi.fn(async () => { throw new Error("raw openProject must not be called from Settings"); }),
  };
  (window as unknown as { kanmer: typeof api }).kanmer = api;
  return api;
}

interface Spies { onSaveBoard: ReturnType<typeof vi.fn>; onOpenProject: ReturnType<typeof vi.fn> }

// Mirrors App.tsx: Settings is keyed by project root so a switch remounts it.
function settingsFor(projectId: string, board: BoardConfig, spies: Spies, keyed = true) {
  return (
    <Settings
      key={keyed ? projectId : "unkeyed"}
      projectId={projectId}
      board={board}
      items={[]}
      theme="dark"
      notifications
      preferences={{ cardDensity: "comfortable", confirmOnDelete: true, defaultPriority: "", defaultArea: "" }}
      onSaveBoard={spies.onSaveBoard as unknown as (next: BoardConfig) => Promise<void>}
      onSetTheme={vi.fn()}
      onSetNotifications={vi.fn()}
      onSetPreferences={vi.fn()}
      onClose={vi.fn()}
      onOpenProject={spies.onOpenProject as unknown as (root: string) => Promise<void>}
    />
  );
}

describe("Settings and the Projects tab (review F-013)", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("guards a modified board draft before opening another project, and a re-keyed Settings never saves it into that project", async () => {
    const api = install();
    const spies: Spies = { onSaveBoard: vi.fn(async () => undefined), onOpenProject: vi.fn(async () => undefined) };
    const boardA = defaultBoardConfig();
    const { rerender } = render(settingsFor("C:/alpha", boardA, spies));
    // Dirty the board draft for project A (rename its default area).
    fireEvent.change(screen.getByLabelText("Name of area pr-review"), { target: { value: "Renamed in A" } });
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    const betaCard = await screen.findByRole("article", { name: "Registry endpoint beta" });
    fireEvent.click(within(betaCard).getByRole("button", { name: "Open project" }));
    // The guard fires: nothing opens until the draft is discarded explicitly.
    const guard = await screen.findByRole("alertdialog", { name: "Discard board changes and open project" });
    expect(spies.onOpenProject).not.toHaveBeenCalled();
    fireEvent.click(within(guard).getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(spies.onOpenProject).not.toHaveBeenCalled();
    fireEvent.click(within(betaCard).getByRole("button", { name: "Open project" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Discard and open" }));
    await waitFor(() => expect(spies.onOpenProject).toHaveBeenCalledWith("C:/beta"));
    expect(api.openProject).not.toHaveBeenCalled();
    // The App switches to B and re-keys Settings: the draft is B's board, not A's edit.
    const boardB: BoardConfig = { ...defaultBoardConfig(), areas: [{ id: "gui", name: "GUI", prefix: "GUI", color: "#5b8cff" }] };
    rerender(settingsFor("C:/beta", boardB, spies));
    expect((screen.getByLabelText("Name of area gui") as HTMLInputElement).value).toBe("GUI");
    expect(screen.queryByLabelText("Name of area pr-review")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(spies.onSaveBoard).toHaveBeenCalledTimes(1));
    expect(spies.onSaveBoard).toHaveBeenCalledWith(boardB);
    for (const call of spies.onSaveBoard.mock.calls as unknown[][]) expect(JSON.stringify(call[0])).not.toContain("Renamed in A");
  });

  it("refuses to save a draft into a different project even when the caller did not re-key it", async () => {
    install();
    const spies: Spies = { onSaveBoard: vi.fn(async () => undefined), onOpenProject: vi.fn(async () => undefined) };
    const { rerender } = render(settingsFor("C:/alpha", defaultBoardConfig(), spies, false));
    fireEvent.change(screen.getByLabelText("Name of area pr-review"), { target: { value: "Renamed in A" } });
    rerender(settingsFor("C:/beta", defaultBoardConfig(), spies, false));
    expect((screen.getByLabelText("Name of area pr-review") as HTMLInputElement).value).toBe("Renamed in A");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/this draft belongs to another project/)).toBeTruthy();
    expect(spies.onSaveBoard).not.toHaveBeenCalled();
  });

  it("opens another project straight away when the board draft is clean", async () => {
    install();
    const spies: Spies = { onSaveBoard: vi.fn(async () => undefined), onOpenProject: vi.fn(async () => undefined) };
    render(settingsFor("C:/alpha", defaultBoardConfig(), spies));
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    const betaCard = await screen.findByRole("article", { name: "Registry endpoint beta" });
    fireEvent.click(within(betaCard).getByRole("button", { name: "Open project" }));
    await waitFor(() => expect(spies.onOpenProject).toHaveBeenCalledWith("C:/beta"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
