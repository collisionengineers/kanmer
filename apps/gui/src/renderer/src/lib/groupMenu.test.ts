import { describe, expect, it, vi } from "vitest";
import type { Group } from "@kanmer/core";
import { appendGroupMembership, groupMembershipPatch, groupMenuItems } from "./groupMenu.js";

const group = (id: string, title: string): Group => ({
  id,
  kind: id.startsWith("HZN-") ? "horizon" : "epic",
  title,
  archived: false,
  created: "",
  updated: "",
  body: "",
});

describe("group menu", () => {
  it("appends a new group while preserving existing memberships", () => {
    expect(appendGroupMembership(["EPIC-001", "HZN-001"], "EPIC-002")).toEqual([
      "EPIC-001",
      "HZN-001",
      "EPIC-002",
    ]);
  });

  it("does not duplicate an existing membership", () => {
    expect(appendGroupMembership(["EPIC-001"], "EPIC-001")).toEqual(["EPIC-001"]);
    expect(appendGroupMembership(undefined, "EPIC-001")).toEqual(["EPIC-001"]);
  });

  it("binds the membership patch to the latest ticket revision", () => {
    expect(groupMembershipPatch({ groups: ["EPIC-001"], updated: "v1" }, "HZN-001")).toEqual({
      groups: ["EPIC-001", "HZN-001"],
      expectedUpdated: "v1",
    });
  });

  it("labels groups and disables groups already on the ticket", () => {
    const onSelect = vi.fn();
    const items = groupMenuItems(
      [group("EPIC-001", "Checkout"), group("HZN-001", "Now")],
      ["EPIC-001"],
      onSelect,
    );

    expect(items.map((item) => item.label)).toEqual(["EPIC-001 — Checkout", "HZN-001 — Now"]);
    expect(items[0].disabled).toBe(true);
    expect(items[1].disabled).toBe(false);
    items[1].onSelect?.();
    expect(onSelect).toHaveBeenCalledWith("HZN-001");
  });

  it("shows a disabled explanation when no active groups exist", () => {
    const items = groupMenuItems([], [], vi.fn());
    expect(items).toEqual([
      expect.objectContaining({
        id: "no-groups",
        label: "No active groups available",
        disabled: true,
      }),
    ]);
  });
});
