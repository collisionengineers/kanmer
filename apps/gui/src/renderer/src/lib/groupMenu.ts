import type { Group, Item } from "@kanmer/core";
import type { MenuItem } from "../components/ContextMenu.js";

/**
 * Append a group to ticket-owned membership without introducing duplicates.
 * The core store remains the authority that validates the group id.
 */
export function appendGroupMembership(
  groups: readonly string[] | undefined,
  groupId: string,
): string[] {
  const current = [...(groups ?? [])];
  return current.includes(groupId) ? current : [...current, groupId];
}

/**
 * Build the optimistic patch for a membership write. The timestamp prevents
 * a menu opened on an older ticket from overwriting a concurrent edit.
 */
export function groupMembershipPatch(
  item: Pick<Item, "groups" | "updated">,
  groupId: string,
): { groups: string[]; expectedUpdated: string } {
  return {
    groups: appendGroupMembership(item.groups, groupId),
    expectedUpdated: item.updated,
  };
}

/** Build the Add to group submenu from the active groups returned by core. */
export function groupMenuItems(
  groups: readonly Group[],
  currentMembership: readonly string[] | undefined,
  onSelect: (groupId: string) => void,
): MenuItem[] {
  if (groups.length === 0) {
    return [
      {
        id: "no-groups",
        label: "No active groups available",
        disabled: true,
        disabledReason: "Create a group with your connected agent first",
      },
    ];
  }

  const assigned = new Set(currentMembership ?? []);
  return groups.map((group) => {
    const alreadyAssigned = assigned.has(group.id);
    return {
      id: `group-${group.id}`,
      label: group.title ? `${group.id} — ${group.title}` : group.id,
      disabled: alreadyAssigned,
      disabledReason: alreadyAssigned ? "Ticket already belongs to this group" : undefined,
      onSelect: alreadyAssigned ? undefined : () => onSelect(group.id),
    };
  });
}
