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

function documentClient(paths: string[], overrides: Partial<ProjectClient> = {}): ProjectClient {
  return clientFor({
    getDocsInfo: vi.fn().mockResolvedValue({
      docs: paths.length ? { research: true } : {},
      counts: paths.length ? { research: paths.length } : {},
      documentPaths: paths,
      checklist: null,
      references: [],
      scratch: [],
    }),
    getDocTypes: vi.fn().mockResolvedValue([{ id: "research", name: "Research" }]),
    getDoc: vi.fn().mockImplementation((_id: string, doc: string) =>
      Promise.resolve({ content: `content for ${doc}`, version: `version-${doc}` }),
    ),
    ...overrides,
  });
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

    await screen.findByRole("button", { name: /Scratch/ });
    expect(screen.getByText("Shared context — EPIC-009")).toBeTruthy();
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

describe("Editor document path inventory", () => {
  it("shows and opens a named-only research document through its exact path", async () => {
    const client = documentClient(["research/portable-connect-integration.md"]);
    renderEditor(client);
    fireEvent.click(await screen.findByRole("button", { name: /Research/ }));
    await waitFor(() => expect(client.getDoc).toHaveBeenCalledWith("GUI-096", "research/portable-connect-integration.md"));
    expect(screen.getByRole("button", { name: "research/portable-connect-integration.md" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("portable-connect-integration.md")).toBeTruthy();
  });

  it("lists nested duplicate basenames and prefers the conventional index", async () => {
    const paths = ["research/a/notes.md", "research/b/notes.md", "research/research.md"];
    const client = documentClient(paths);
    renderEditor(client);
    fireEvent.click(await screen.findByRole("button", { name: /Research/ }));
    await waitFor(() => expect(client.getDoc).toHaveBeenCalledWith("GUI-096", "research/research.md"));
    for (const path of paths) expect(screen.getByRole("button", { name: path })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "research/a/notes.md" }));
    await waitFor(() => expect(client.getDoc).toHaveBeenCalledWith("GUI-096", "research/a/notes.md"));
  });

  it("passes an exact named path through save and protects dirty path switches", async () => {
    const paths = ["research/a/notes.md", "research/b/notes.md"];
    const client = documentClient(paths);
    renderEditor(client);
    fireEvent.click(await screen.findByRole("button", { name: /Research/ }));
    fireEvent.click(await screen.findByRole("button", { name: "research/a/notes.md" }));
    await waitFor(() => expect(screen.getByText("content for research/a/notes.md")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(document.querySelector("textarea")!, { target: { value: "edited" } });
    fireEvent.click(screen.getByRole("button", { name: "research/b/notes.md" }));
    expect(screen.getByText(/Discard changes to GUI-096 research\/a\/notes\.md/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(client.getDoc).toHaveBeenCalledWith("GUI-096", "research/b/notes.md"));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(document.querySelector("textarea")!, { target: { value: "saved" } });
    fireEvent.click(screen.getByRole("button", { name: "Save research/b/notes.md" }));
    await waitFor(() => expect(client.setDoc).toHaveBeenCalledWith(
      "GUI-096", "research/b/notes.md", "saved", { expectedVersion: "version-research/b/notes.md" },
    ));
  });

  it("keeps the conventional index path available for an empty type", async () => {
    const client = documentClient([], {
      getDoc: vi.fn().mockResolvedValue({ content: null, version: null }),
    });
    renderEditor(client);
    fireEvent.click(await screen.findByRole("button", { name: /Research/ }));
    await waitFor(() => expect(client.getDoc).toHaveBeenCalledWith("GUI-096", "research/research.md"));
    expect(screen.getByText("No research/research.md yet.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create research/research.md" }));
    expect(screen.getByRole("button", { name: "Save research/research.md" })).toBeTruthy();
  });

  it("retains the selected path when the live inventory gains another document", async () => {
    const responses = [
      { docs: { research: true }, counts: { research: 2 }, documentPaths: ["research/a.md", "research/research.md"], checklist: null, references: [], scratch: [] },
      { docs: { research: true }, counts: { research: 3 }, documentPaths: ["research/a.md", "research/b.md", "research/research.md"], checklist: null, references: [], scratch: [] },
    ];
    let latest = responses[0];
    const client = documentClient(responses[0].documentPaths, {
      getDocsInfo: vi.fn().mockImplementation(() => {
        latest = responses.shift() ?? latest;
        return Promise.resolve(latest);
      }),
    });
    const view = renderEditor(client);
    fireEvent.click(await screen.findByRole("button", { name: /Research/ }));
    fireEvent.click(await screen.findByRole("button", { name: "research/a.md" }));
    await waitFor(() => expect(client.getDoc).toHaveBeenCalledWith("GUI-096", "research/a.md"));
    view.rerender(
      <ClientContext.Provider value={client}>
        <Editor item={item} board={board} items={[item]} knownIds={new Set([item.id])} changeSignal={1} onClose={vi.fn()} onNavigate={vi.fn()} onSave={vi.fn()} />
      </ClientContext.Provider>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "research/b.md" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "research/a.md" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Editor reference files", () => {
  it("renders attachments and routes add, open, and confirmed remove actions", async () => {
    const pickReferences = vi.fn().mockResolvedValue(["C:/incoming/mockup.png"]);
    const addReference = vi.fn().mockResolvedValue({ name: "mockup-2.png" });
    const openReference = vi.fn().mockResolvedValue(undefined);
    const removeReference = vi.fn().mockResolvedValue(undefined);
    const client = clientFor({
      getDocsInfo: vi.fn().mockResolvedValue({
        docs: { plan: true }, counts: { plan: 1 }, documentPaths: [], checklist: null,
        references: [{ name: "mockup.png", path: "C:/project/reference/mockup.png" }], scratch: [],
      }),
      pickReferences, addReference, openReference, removeReference,
    });
    renderEditor(client);

    fireEvent.click(await screen.findByRole("button", { name: "mockup.png" }));
    expect(openReference).toHaveBeenCalledWith("GUI-096", "mockup.png");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText(/Delete mockup\.png\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(removeReference).toHaveBeenCalledWith("GUI-096", "mockup.png"));

    fireEvent.click(screen.getByRole("button", { name: "Add files…" }));
    await waitFor(() => expect(pickReferences).toHaveBeenCalled());
    expect(addReference).toHaveBeenCalledWith("GUI-096", "C:/incoming/mockup.png");
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

  it("switches its starting surface when the user explicitly changes mode", async () => {
    renderEditor(clientFor());
    fireEvent.change(await screen.findByLabelText("Editor mode"), { target: { value: "execution" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Plan/ }).className).toContain("active"));
  });
});
