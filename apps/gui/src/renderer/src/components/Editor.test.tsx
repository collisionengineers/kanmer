// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BoardConfig, Item } from "@kanmer/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientContext, type ProjectClient } from "../lib/client.js";
import { Editor, startingTabForMode } from "./Editor.js";

const board = { areas: [], priorities: [] } as unknown as BoardConfig;
const item = {
  id: "GUI-096",
  type: "ticket",
  title: "Scratch",
  status: "implementing",
  area: "gui",
  assignee: "",
  body: "Body",
  created: "2026-08-20T00:00:00.000Z",
  updated: "2026-08-20T00:00:00.000Z",
  groups: ["EPIC-009"],
} as Item;

function clientFor(overrides: Partial<ProjectClient> = {}): ProjectClient {
  return {
    projectId: "project",
    getLinks: vi.fn().mockResolvedValue({ links: [], backlinks: [], blocks: [], blockedBy: [] }),
    getDocsInfo: vi.fn().mockResolvedValue({
      docs: { plan: true }, counts: { plan: 1 }, documentPaths: [], checklist: null,
      references: [], scratch: ["notes", "review"],
    }),
    getDocTypes: vi.fn().mockResolvedValue([{ id: "plan", name: "Plan" }]),
    getGates: vi.fn().mockResolvedValue(null),
    getGroupDoc: vi.fn().mockResolvedValue("# Shared\n\n[[GUI-096]]"),
    getDoc: vi.fn().mockResolvedValue({ content: "draft\n", version: "v1" }),
    setDoc: vi.fn().mockResolvedValue({ version: "v2" }),
    getItem: vi.fn().mockResolvedValue(item),
    ...overrides,
  } as unknown as ProjectClient;
}

function renderEditor(client: ProjectClient, selected = item) {
  return render(
    <ClientContext.Provider value={client}>
      <Editor item={selected} board={board} items={[selected]} knownIds={new Set([selected.id])} changeSignal={0} onClose={vi.fn()} onNavigate={vi.fn()} onSave={vi.fn()} />
    </ClientContext.Provider>,
  );
}

afterEach(cleanup);

describe("Editor scratch and group context", () => {
  it("keeps Scratch outside pipeline docs, prefers review, and reads it through getDoc", async () => {
    const client = clientFor();
    renderEditor(client);

    await screen.findByText("Shared context — EPIC-009");
    expect(screen.getByRole("button", { name: /Scratch/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Plan/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Scratch/ }));
    await waitFor(() => expect(client.getDoc).toHaveBeenCalledWith("GUI-096", "scratch/review"));
  });

  it("refuses unsafe or whitespace-padded scratch slugs before reading or writing", async () => {
    const client = clientFor();
    renderEditor(client);
    fireEvent.click(await screen.findByRole("button", { name: /Scratch/ }));
    await screen.findByText("Scratch notes");
    fireEvent.change(screen.getByRole("textbox", { name: "New scratch note name" }), { target: { value: "../escape" } });
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(screen.getByText("Use a lowercase kebab-case note name.")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "New scratch note name" }), { target: { value: " note " } });
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(screen.getByText("Use a lowercase kebab-case note name.")).toBeTruthy();
    expect(client.getDoc).not.toHaveBeenCalledWith("GUI-096", "scratch/note");
    expect(client.setDoc).not.toHaveBeenCalled();
  });

  it("saves a scratch edit with its version and refreshes document info", async () => {
    const client = clientFor();
    renderEditor(client);
    fireEvent.click(await screen.findByRole("button", { name: /Scratch/ }));
    await screen.findByText("draft");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(document.querySelector("textarea")!, { target: { value: "updated" } });
    fireEvent.click(screen.getByRole("button", { name: /Save scratch\/review/ }));
    await waitFor(() => expect(client.setDoc).toHaveBeenCalledWith(
      "GUI-096", "scratch/review", "updated", { expectedVersion: "v1" },
    ));
    expect(client.getDocsInfo).toHaveBeenCalledTimes(2);
  });

  it("shows an explicit missing first-group context state", async () => {
    const client = clientFor({ getGroupDoc: vi.fn().mockResolvedValue(null) });
    renderEditor(client);
    expect(await screen.findByText(/No context.md is available for EPIC-009/)).toBeTruthy();
  });
});

describe("Editor modes", () => {
  it.each([
    ["approval", "ticket"],
    ["execution", "plan"],
    ["review", "scratch"],
    ["evidence", "proof"],
  ] as const)("maps %s to %s", (mode, tab) => {
    expect(startingTabForMode(mode)).toBe(tab);
  });

  it("keeps secondary tabs enabled and uses a mode control", async () => {
    renderEditor(clientFor());
    expect((await screen.findByLabelText("Editor mode") as HTMLSelectElement).value).toBe("approval");
    const scratch = screen.getByRole("button", { name: /Scratch/ });
    expect((scratch as HTMLButtonElement).disabled).toBe(false);
    expect(scratch.className).toContain("mode-secondary");
  });
});
