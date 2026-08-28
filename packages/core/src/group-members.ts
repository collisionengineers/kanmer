import { isCaptureItem } from "./profiles.js";
import { STAGE_IDS, type StageId } from "./stages.js";
import type { Group, GroupWithMembers } from "./groups.js";

/**
 * Members are listed; progress is counted. Since FRD-032 those are no longer
 * the same set: a quick capture belongs to its group and stays visible in it,
 * but it is an observation nobody has decided to deliver, so counting it would
 * hold the group permanently below 100% and make group progress — a readiness
 * metric — report a debt that does not exist.
 */
export function deriveMembers(group: Group, items: { id: string; title: string; status: string; archived: boolean; groups?: string[]; profile?: string }[], lastStage: string): GroupWithMembers {
  const members = items.filter((i) => (i.groups ?? []).includes(group.id)).map((i) => ({ id: i.id, title: i.title, status: i.status, archived: i.archived, profile: i.profile })).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const progress: Record<string, number> = {};
  for (const stage of STAGE_IDS) progress[stage] = 0;
  const counted = members.filter((member) => !member.archived && !isCaptureItem(member));
  for (const member of counted) if (member.status in progress) progress[member.status]++;
  return { ...group, members, progress, total: counted.length, complete: progress[lastStage as StageId] ?? 0 };
}
