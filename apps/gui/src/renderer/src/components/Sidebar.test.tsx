// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { BoardConfig, Item } from "@kanmer/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar.js";
import { SCOPES, scopeCounts, type Scope } from "../lib/scopes.js";

// Vitest globals are off in this workspace, so RTL's auto-cleanup never runs;
// without this every render stacks another rail into the same document.
afterEach(cleanup);

const board = {
  areas: [
    { id: "gui", name: "GUI", color: "#5b8cff" },
    { id: "core", name: "Core", color: "#9fe870" },
  ],
  priorities: [],
} as unknown as BoardConfig;

function ticket(id: string, status: string, extra: Partial<Item> = {}): Item {
  return {
    id,
    type: "ticket",
    title: id,
    status,
    area: "gui",
    labels: [],
    groups: [],
    archived: false,
    ...extra,
  } as unknown as Item;
}

const items: Item[] = [
  ticket("A-1", "backlog"),
  ticket("A-2", "backlog"),
  ticket("A-3", "implementing"),
  ticket("A-4", "review"),
  ticket("A-5", "done"),
  ticket("A-6", "done", { archived: true }),
];

function renderSidebar(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const props = {
    board,
    projectName: "kanmer",
    counts: scopeCounts(items),
    scope: "active" as Scope,
    onScope: vi.fn(),
    area: undefined as string | undefined,
    onArea: vi.fn(),
    standupActive: false,
    onStandup: vi.fn(),
    collapsed: false,
    onCollapsedChange: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<Sidebar {...props} />) };
}

describe("Sidebar counts", () => {
  it("shows every scope with its unfiltered count", () => {
    renderSidebar();
    const counts = scopeCounts(items);
    for (const spec of SCOPES) {
      const button = screen.getByRole("button", { name: new RegExp(`^${spec.label}`) });
      expect(within(button).getByText(String(counts[spec.id]))).toBeTruthy();
    }
  });

  it("counts archived records in Archived and nowhere else", () => {
    renderSidebar();
    const archived = screen.getByRole("button", { name: /^Archived/ });
    expect(within(archived).getByText("1")).toBeTruthy();
    const all = screen.getByRole("button", { name: /^All tickets/ });
    expect(within(all).getByText("5")).toBeTruthy();
  });

  it("shows a zero rather than hiding an empty scope", () => {
    // An empty scope that vanishes is a scope the user cannot discover.
    renderSidebar({ counts: scopeCounts([]) });
    for (const spec of SCOPES) {
      const button = screen.getByRole("button", { name: new RegExp(`^${spec.label}`) });
      expect(within(button).getByText("0")).toBeTruthy();
    }
  });
});

describe("Sidebar current-item semantics", () => {
  it("marks exactly one scope as the current page", () => {
    renderSidebar({ scope: "done" });
    const current = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "page");
    // The active scope, plus "All areas" (no area filter is also a selection).
    expect(current.map((b) => b.textContent?.replace(/\d+$/, "").trim())).toEqual([
      "Completed",
      "All areas",
    ]);
  });

  it("moves aria-current off every scope while Standup is showing", () => {
    renderSidebar({ scope: "active", standupActive: true });
    expect(screen.getByRole("button", { name: /^Active work/ }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("button", { name: "Standup" }).getAttribute("aria-current")).toBe("page");
  });

  it("marks the selected area, and treats no-area as its own selection", () => {
    renderSidebar({ area: "" });
    expect(screen.getByRole("button", { name: "No area" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "All areas" }).getAttribute("aria-current")).toBeNull();
  });
});

describe("Sidebar structure", () => {
  it("is a labelled nav of two labelled lists", () => {
    renderSidebar();
    const nav = screen.getByRole("navigation", { name: "Board navigation" });
    expect(within(nav).getByRole("list", { name: "Workspace" })).toBeTruthy();
    expect(within(nav).getByRole("list", { name: "Areas" })).toBeTruthy();
  });

  it("lists each board area by its human name with a colour dot", () => {
    const { container } = renderSidebar();
    expect(screen.getByRole("button", { name: "GUI" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Core" })).toBeTruthy();
    // Colour is decoration; it is hidden from assistive technology and is never
    // the only cue for which area is selected.
    for (const dot of container.querySelectorAll(".nav-dot")) {
      expect(dot.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("keeps every glyph out of the accessibility tree", () => {
    const { container } = renderSidebar();
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

describe("Sidebar keyboard and pointer operation", () => {
  it("selects a scope from the keyboard", () => {
    const { props } = renderSidebar();
    const button = screen.getByRole("button", { name: /^Backlog/ });
    button.focus();
    expect(document.activeElement).toBe(button);
    // A <button> in a list is already reachable by Tab and activated by
    // Enter/Space; jsdom dispatches that as a click.
    fireEvent.click(button);
    expect(props.onScope).toHaveBeenCalledWith("backlog");
  });

  it("has no control that a pointer can reach but a keyboard cannot", () => {
    const { container } = renderSidebar();
    const interactive = container.querySelectorAll("button, a, [role='button']");
    expect(interactive.length).toBeGreaterThan(0);
    for (const el of interactive) {
      expect(el.tagName).toBe("BUTTON");
      expect(el.getAttribute("tabindex")).not.toBe("-1");
    }
  });

  it("sets and clears the area filter through the same callback the FilterBar uses", () => {
    const { props } = renderSidebar({ area: "gui" });
    fireEvent.click(screen.getByRole("button", { name: "Core" }));
    expect(props.onArea).toHaveBeenCalledWith("core");
    fireEvent.click(screen.getByRole("button", { name: "All areas" }));
    expect(props.onArea).toHaveBeenCalledWith(undefined);
  });

  it("reaches Standup", () => {
    const { props } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Standup" }));
    expect(props.onStandup).toHaveBeenCalled();
  });
});

describe("Sidebar collapse", () => {
  it("reports its state on the toggle and asks the caller to change it", () => {
    const { props } = renderSidebar();
    const toggle = screen.getByRole("button", { name: "Collapse navigation" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(props.onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("keeps every entry reachable, and named, while collapsed", () => {
    // Collapsing is a width change, not a feature removal: the labels stay in
    // the DOM (CSS hides them visually) so the accessible names survive.
    renderSidebar({ collapsed: true });
    expect(screen.getByRole("button", { name: "Expand navigation" })).toBeTruthy();
    for (const spec of SCOPES) {
      expect(screen.getByRole("button", { name: new RegExp(`^${spec.label}`) })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Standup" })).toBeTruthy();
  });
});
