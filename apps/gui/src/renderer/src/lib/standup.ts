import type { ActivityEntry, BoardConfig, Item, ItemWarning } from "@kanmer/core";
import { blockedIds } from "./board.js";

/**
 * The human's standup as data, so it can be rendered as JSX *and* copied as
 * Markdown from one derivation — and unit-tested without a DOM.
 *
 * The shape is the `kanmer-standup` skill's (SKILL.md:50-81), because the
 * whole point of the view is that the human's standup and the agent's match.
 * Every input is explicit, including `now`: nothing here reads the clock.
 */

/** One bullet. `id` is null for lines that aren't about an item (file warnings). */
export interface StandupLine {
  id: string | null;
  text: string;
}

/** A run of lines under an optional label (null = render flat). */
export interface StandupGroup {
  label: string | null;
  lines: StandupLine[];
}

export interface StandupSection {
  title: string;
  groups: StandupGroup[];
}

export interface StandupReport {
  boardName: string;
  sections: StandupSection[];
}

/** "Recently done" window — SKILL.md:63 says the last 7 days, not 48 hours. */
export const RECENT_DONE_MS = 7 * 24 * 60 * 60 * 1000;
/** "What happened since yesterday" window. */
export const SINCE_YESTERDAY_MS = 24 * 60 * 60 * 1000;
/** Past this without an update an item is marked *stale* (SKILL.md:55). */
export const STALE_MS = 7 * 24 * 60 * 60 * 1000;
/** Taken longer than this with no activity since is a flag (SKILL.md:79). */
export const TAKEN_STALE_MS = 3 * 24 * 60 * 60 * 1000;

export interface StandupInput {
  boardName: string;
  board: BoardConfig;
  items: Item[];
  warnings: ItemWarning[];
  activity: ActivityEntry[];
  /** Injected clock — never Date.now() inside. */
  now: number;
  /**
   * Optional checklist progress per id, rendered as `n/m` on In-flight lines.
   * Not fetched by the view: it would be one IPC call per ticket, the same
   * N+1 the skill's "name the blockers" line is skipped for.
   */
  checklists?: Record<string, { checked: number; total: number }>;
}

/** Group by a key, only when more than one distinct key is present. */
function groupBy(
  lines: { line: StandupLine; key: string }[],
  labelOf: (key: string) => string,
  lastKey?: string,
): StandupGroup[] {
  const keys = [...new Set(lines.map((l) => l.key))];
  if (keys.length <= 1) return lines.length ? [{ label: null, lines: lines.map((l) => l.line) }] : [];
  // A designated key ("unassigned") always sorts last; the rest alphabetically.
  keys.sort((a, b) => {
    if (a === lastKey) return 1;
    if (b === lastKey) return -1;
    return a.localeCompare(b);
  });
  return keys.map((k) => ({
    label: labelOf(k),
    lines: lines.filter((l) => l.key === k).map((l) => l.line),
  }));
}

function flat(lines: StandupLine[]): StandupGroup[] {
  return lines.length ? [{ label: null, lines }] : [];
}

/** Build the skill's eight sections, in the skill's order. */
export function buildStandup(input: StandupInput): StandupReport {
  const { boardName, board, items, warnings, activity, now, checklists } = input;
  const active = items.filter((i) => !i.archived && i.type === "ticket");
  const stages = board.statuses.map((s) => s.id);
  const onBoard = new Set(stages);
  const first = stages[0];
  const last = stages[stages.length - 1];
  const reviewLike = board.statuses.find(
    (s) => /review|approval/i.test(s.id) || /review|approval/i.test(s.name),
  )?.id;
  const working = new Set(stages.slice(1, -1).filter((s) => s !== reviewLike));
  const blocked = blockedIds(active, last);
  const staleCutoff = new Date(now - STALE_MS).toISOString();
  const stageName = (id: string): string =>
    board.statuses.find((s) => s.id === id)?.name ?? id;

  const describe = (i: Item, extra = ""): string => {
    const bits = [stageName(i.status)];
    if (i.area) bits.push(i.area);
    if (i.priority) bits.push(i.priority);
    const stale = i.updated < staleCutoff ? " — *stale*" : "";
    return `${i.id} ${i.title || "Untitled"} (${bits.join(", ")})${extra}${stale}`;
  };
  const line = (i: Item, extra = ""): StandupLine => ({ id: i.id, text: describe(i, extra) });
  const assigneeKey = (i: Item): string => i.assignee || "unassigned";

  // --- In flight -----------------------------------------------------------
  const inFlight = active
    .filter((i) => working.has(i.status))
    .map((i) => {
      const bits: string[] = [];
      if (i.taken_at) bits.push(` — ⛏ ${i.branch ?? "taken"}${i.worktree ? ` (${i.worktree})` : ""}`);
      const cl = checklists?.[i.id];
      if (cl && cl.total > 0) bits.push(` — ${cl.checked}/${cl.total}`);
      return { line: line(i, bits.join("")), key: assigneeKey(i) };
    });

  // --- In review -----------------------------------------------------------
  const inReview = active
    .filter((i) => reviewLike !== undefined && i.status === reviewLike)
    .map((i) => ({
      line: line(i, i.assignee ? ` — waiting on ${i.assignee}` : " — unassigned"),
      key: assigneeKey(i),
    }));

  // --- Recently done -------------------------------------------------------
  // Prefer the activity log over `updated`: a doc write bumps `updated`
  // without the ticket having reached the final stage in that window.
  const doneCutoff = new Date(now - RECENT_DONE_MS).toISOString();
  const doneActors = new Map<string, string>();
  for (const e of activity) {
    if (e.op === "update" && e.field === "status" && e.to === last && e.ts > doneCutoff) {
      doneActors.set(e.id, e.actor);
    }
  }
  const recentlyDone = active
    .filter((i) => i.status === last && (doneActors.has(i.id) || i.updated > doneCutoff))
    .map((i) => {
      const actor = doneActors.get(i.id);
      const by = actor !== undefined && actor !== "gui" ? ` (${actor})` : "";
      return { id: i.id, text: `${i.id} ${i.title || "Untitled"}${by}` };
    });

  // --- What happened since yesterday --------------------------------------
  const sinceCutoff = new Date(now - SINCE_YESTERDAY_MS).toISOString();
  const collapsed = new Map<string, { entry: ActivityEntry; text: string }>();
  for (const e of activity) {
    if (e.ts <= sinceCutoff) continue;
    const text = describeActivity(e, stageName);
    if (text === null) continue;
    // One line per (id, op[, field]) — the last one wins.
    collapsed.set(`${e.id}|${e.op}|${e.field ?? ""}`, { entry: e, text });
  }
  const happened = [...collapsed.values()].map((c) => ({
    line: { id: c.entry.id, text: c.text },
    key: c.entry.actor,
  }));

  // --- Flags ---------------------------------------------------------------
  const flags: StandupLine[] = [];
  for (const w of warnings) flags.push({ id: null, text: `${w.file}: ${w.message}` });
  const lastActivityBy = new Map<string, string>();
  for (const e of activity) lastActivityBy.set(e.id, e.ts);
  for (const i of active) {
    if (!onBoard.has(i.status)) {
      flags.push({ id: i.id, text: `${i.id} is in "${i.status}", which is not a stage on this board` });
    }
    if (i.updated < staleCutoff) {
      flags.push({ id: i.id, text: `${i.id} has not changed since ${i.updated.slice(0, 10)}` });
    }
    if (!i.area) flags.push({ id: i.id, text: `${i.id} has no area` });
    if (i.taken_at !== undefined && new Date(i.taken_at).getTime() < now - TAKEN_STALE_MS) {
      const since = lastActivityBy.get(i.id);
      if (since === undefined || since <= i.taken_at) {
        flags.push({
          id: i.id,
          text: `${i.id} has been taken since ${i.taken_at.slice(0, 10)} with no activity since`,
        });
      }
    }
  }

  const sections: StandupSection[] = [
    { title: "In flight", groups: groupBy(inFlight, (k) => k, "unassigned") },
    { title: "In review", groups: groupBy(inReview, (k) => k, "unassigned") },
    {
      title: "Up next",
      groups: flat(
        active
          .filter((i) => i.status === first)
          .slice(0, 5)
          .map((i) => line(i)),
      ),
    },
    { title: "Recently done", groups: flat(recentlyDone) },
    { title: "Blocked", groups: flat(active.filter((i) => blocked.has(i.id)).map((i) => line(i))) },
    { title: "What happened since yesterday", groups: groupBy(happened, (k) => k) },
    { title: "Flags", groups: flat(flags) },
  ];

  return {
    boardName,
    // Empty sections and empty groups are dropped (SKILL.md:47-48).
    sections: sections
      .map((s) => ({ ...s, groups: s.groups.filter((g) => g.lines.length > 0) }))
      .filter((s) => s.groups.length > 0),
  };
}

/** One activity entry as a report line, or null when it isn't notable. */
function describeActivity(e: ActivityEntry, stageName: (id: string) => string): string | null {
  switch (e.op) {
    case "create":
      return `${e.id} created`;
    case "update":
      if (e.field !== "status") return null; // title/order/label churn is noise
      return `${e.id} moved ${stageName(String(e.from ?? "?"))} → ${stageName(String(e.to ?? "?"))}`;
    case "take":
      return `${e.id} taken${e.to ? ` on ${String(e.to)}` : ""}`;
    case "release":
      return `${e.id} released`;
    case "doc":
      return `${e.id} ${e.field ?? "doc"}.md written`;
    case "delete":
      return `${e.id} deleted`;
    default:
      return null;
  }
}

/** The report as the Markdown the skill emits (SKILL.md:50-81). */
export function standupMarkdown(report: StandupReport): string {
  const out: string[] = [`### Board: ${report.boardName}`];
  for (const section of report.sections) {
    const body: string[] = [`**${section.title}**`];
    for (const group of section.groups) {
      if (group.label !== null) body.push(`_${group.label}_`);
      for (const l of group.lines) body.push(`- ${l.text}`);
    }
    out.push(body.join("\n"));
  }
  return out.join("\n\n");
}
