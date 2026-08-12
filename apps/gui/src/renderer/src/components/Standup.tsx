import { useEffect, useMemo, useState } from "react";
import type { ActivityEntry, BoardConfig, Item } from "@kanmer/core";

interface StandupProps {
  board: BoardConfig;
  items: Item[];
  onSelect: (id: string) => void;
}

interface Line {
  id: string;
  text: string;
}

interface Section {
  title: string;
  lines: Line[];
}

const RECENT_MS = 48 * 60 * 60 * 1000;

/** Same live-blocker rule as core: blocker not archived, not in the last stage. */
function blockedIds(items: Item[], lastStage: string | undefined): Set<string> {
  const ids = new Set(items.map((i) => i.id));
  const blocked = new Set<string>();
  for (const item of items) {
    if (item.archived || item.status === lastStage) continue;
    for (const t of item.blocks ?? []) if (ids.has(t)) blocked.add(t);
  }
  return blocked;
}

/**
 * The human's standup, derived from the same facts the kanmer-standup skill
 * uses: stage roles by position (first = up next, last = recently done,
 * review-like = in review, the rest = in flight) plus the activity log.
 */
export function Standup({ board, items, onSelect }: StandupProps): JSX.Element {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const since = new Date(Date.now() - RECENT_MS).toISOString();
    void window.kanmer.getActivity({ since }).then(setActivity);
  }, [items]);

  const sections = useMemo(
    () => buildSections(board, items, activity),
    [board, items, activity],
  );

  const markdown = useMemo(
    () =>
      sections
        .filter((s) => s.lines.length > 0)
        .map((s) => `**${s.title}**\n${s.lines.map((l) => `- ${l.text}`).join("\n")}`)
        .join("\n\n"),
    [sections],
  );

  return (
    <div className="standup">
      <div className="standup-head">
        <h2>Standup</h2>
        <button
          className="ghost sm"
          onClick={() => {
            void navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied ✓" : "Copy as Markdown"}
        </button>
      </div>
      {sections.every((s) => s.lines.length === 0) && (
        <p className="empty">Nothing to report — the board is quiet.</p>
      )}
      {sections
        .filter((s) => s.lines.length > 0)
        .map((s) => (
          <div key={s.title} className="standup-section">
            <h3>{s.title}</h3>
            <ul>
              {s.lines.map((l) => (
                <li key={`${s.title}:${l.id}`}>
                  <button className="linklike" onClick={() => onSelect(l.id)}>
                    {l.id}
                  </button>{" "}
                  {l.text.slice(l.id.length + 1)}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function buildSections(
  board: BoardConfig,
  items: Item[],
  activity: ActivityEntry[],
): Section[] {
  const active = items.filter((i) => !i.archived && i.type === "ticket");
  const stages = board.statuses.map((s) => s.id);
  const first = stages[0];
  const last = stages[stages.length - 1];
  const reviewLike = board.statuses.find(
    (s) => /review|approval/i.test(s.id) || /review|approval/i.test(s.name),
  )?.id;
  const working = new Set(stages.slice(1, -1).filter((s) => s !== reviewLike));
  const blocked = blockedIds(active, last);
  const today = new Date().toISOString().slice(0, 10);
  const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const stageName = (id: string) => board.statuses.find((s) => s.id === id)?.name ?? id;

  const describe = (i: Item, extra = "") => {
    const bits = [stageName(i.status)];
    if (i.area) bits.push(i.area);
    if (i.priority) bits.push(i.priority);
    const stale = i.updated < staleCutoff ? " — *stale*" : "";
    return `${i.id} ${i.title || "Untitled"} (${bits.join(", ")})${extra}${stale}`;
  };

  const doneRecently = new Set(
    activity
      .filter((e) => e.op === "update" && e.field === "status" && e.to === last)
      .map((e) => e.id),
  );

  return [
    {
      title: "In flight",
      lines: active
        .filter((i) => working.has(i.status))
        .map((i) =>
          lineOf(
            describe(
              i,
              i.taken_at ? ` — taken on ${i.branch ?? "?"}${i.worktree ? ` (${i.worktree})` : ""}` : "",
            ),
            i.id,
          ),
        ),
    },
    {
      title: "In review",
      lines: active
        .filter((i) => i.status === reviewLike)
        .map((i) => lineOf(describe(i, i.assignee ? ` — waiting on ${i.assignee}` : " — unassigned"), i.id)),
    },
    {
      title: "Up next",
      lines: active
        .filter((i) => i.status === first)
        .slice(0, 5)
        .map((i) => lineOf(describe(i), i.id)),
    },
    {
      title: "Recently done",
      lines: active
        .filter((i) => i.status === last && (doneRecently.has(i.id) || recent(i.updated)))
        .map((i) => lineOf(`${i.id} ${i.title || "Untitled"}`, i.id)),
    },
    {
      title: "Blocked",
      lines: active.filter((i) => blocked.has(i.id)).map((i) => lineOf(describe(i), i.id)),
    },
    {
      title: "Overdue",
      lines: active
        .filter((i) => i.due !== undefined && i.due < today && i.status !== last)
        .map((i) => lineOf(`${describe(i)} — due ${i.due}`, i.id)),
    },
  ];
}

function lineOf(text: string, id: string): Line {
  return { id, text };
}

function recent(updated: string): boolean {
  const t = new Date(updated).getTime();
  return Number.isFinite(t) && Date.now() - t < RECENT_MS;
}
