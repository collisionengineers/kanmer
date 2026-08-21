import { STAGE_IDS, type StageId } from "./stages.js";
import type { Group, GroupWithMembers } from "./groups.js";

export function deriveMembers(group: Group, items: { id: string; title: string; status: string; archived: boolean; groups?: string[] }[], lastStage: string): GroupWithMembers {
  const members = items.filter((i) => (i.groups ?? []).includes(group.id)).map((i) => ({ id: i.id, title: i.title, status: i.status, archived: i.archived })).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const progress: Record<string, number> = {};
  for (const stage of STAGE_IDS) progress[stage] = 0;
  const live = members.filter((member) => !member.archived);
  for (const member of live) if (member.status in progress) progress[member.status]++;
  return { ...group, members, progress, total: live.length, complete: progress[lastStage as StageId] ?? 0 };
}
