// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BoardConfig, Item } from "@kanmer/core";
import type { DocModel } from "../../../shared/ipc.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientContext, type ProjectClient } from "../lib/client.js";
import { TicketCreate } from "./TicketCreate.js";

const board = { areas: [], deployment: { environments: ["staging"] } } as unknown as BoardConfig;
const model: DocModel = {
  repoDocs: {},
  docTypes: ["research", "files", "plan", "checklist", "post-implementation-report", "proof"],
  gateExemptFolders: ["reference", "scratch", "assets"],
  boundaries: ["leave-backlog", "leave-preparing", "enter-review", "enter-done"],
  profiles: {},
  defaultProfile: "fix",
  proofTypes: ["visual", "test-output", "command-log"],
};

const created: Item = {
  id: "GUI-108",
  type: "ticket",
  title: "Created",
  status: "backlog",
  area: "",
  assignee: "",
  labels: [],
  links: [],
  archived: false,
  body: "",
  created: "2026-08-22T00:00:00.000Z",
  updated: "2026-08-22T00:00:00.000Z",
};

function clientFor(): ProjectClient {
  return {
    projectId: "project",
    getDocModel: vi.fn().mockResolvedValue(model),
    pickRepoDoc: vi.fn().mockResolvedValue(null),
  } as unknown as ProjectClient;
}

function renderCreate(client: ProjectClient, onCreate = vi.fn().mockResolvedValue(created)) {
  render(
    <ClientContext.Provider value={client}>
      <TicketCreate board={board} items={[]} onClose={vi.fn()} onCreate={onCreate} />
    </ClientContext.Provider>,
  );
  return onCreate;
}

afterEach(cleanup);

describe("TicketCreate custom requirements", () => {
  it("renders the custom editor and sends the core-shaped map", async () => {
    const onCreate = renderCreate(clientFor());
    fireEvent.change(screen.getByPlaceholderText("What needs doing?"), { target: { value: "Custom ticket" } });
    fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "custom" } });
    const requirement = await screen.findByLabelText("Requirements for leave-preparing");
    fireEvent.change(requirement, { target: { value: "plan, proof:visual@staging" } });
    fireEvent.click(screen.getByRole("button", { name: "Create ticket" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      profile: "custom",
      requires: { "leave-preparing": ["plan", "proof:visual@staging"] },
    })));
  });

  it("rejects an unknown requirement before IPC", async () => {
    const onCreate = renderCreate(clientFor());
    fireEvent.change(screen.getByPlaceholderText("What needs doing?"), { target: { value: "Invalid" } });
    fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "custom" } });
    const requirement = await screen.findByLabelText("Requirements for leave-preparing");
    fireEvent.change(requirement, { target: { value: "not-a-doc" } });
    expect(screen.getByText(/unknown document type/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Create ticket" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("keeps the existing non-custom form without an inline requires payload", async () => {
    const onCreate = renderCreate(clientFor());
    fireEvent.change(screen.getByPlaceholderText("What needs doing?"), { target: { value: "Fix" } });
    fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "fix" } });
    expect(screen.queryByRole("group", { name: "Custom profile requirements" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create ticket" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.not.objectContaining({ requires: expect.anything() })));
  });
});
