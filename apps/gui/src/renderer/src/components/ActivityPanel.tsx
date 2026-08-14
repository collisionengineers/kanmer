import { useEffect, useState } from "react";
import type { ActivityEntry } from "@kanmer/core";
import { useClient } from "../lib/client.js";

interface ActivityPanelProps {
  /** Bumped by App whenever the board changes, to re-fetch. */
  refreshSignal: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** Slide-over listing the activity log, newest first; click reveals the item. */
export function ActivityPanel({
  refreshSignal,
  onSelect,
  onClose,
}: ActivityPanelProps): JSX.Element {
  const client = useClient();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    void client.getActivity({ limit: 150 }).then((list) => setEntries(list.reverse()));
  }, [refreshSignal, client]);

  return (
    <aside className="activity-panel" role="dialog" aria-label="Activity">
      <div className="activity-head">
        <h3>Activity</h3>
        <div className="spacer" />
        <button className="ghost sm" onClick={onClose}>
          Close
        </button>
      </div>
      {entries.length === 0 && <p className="empty">No activity recorded yet.</p>}
      <ul className="activity-list">
        {entries.map((e, i) => (
          <li key={`${e.ts}-${i}`}>
            <button className="activity-row" onClick={() => onSelect(e.id)}>
              <span className="activity-desc">{describe(e)}</span>
              <span className="activity-meta">
                {e.actor} · {timeAgo(e.ts)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function describe(e: ActivityEntry): string {
  switch (e.op) {
    case "create":
      return `${e.id} created${e.to ? ` in ${String(e.to)}` : ""}`;
    case "delete":
      return `${e.id} deleted`;
    case "take":
      return `${e.id} taken${e.to ? ` on ${String(e.to)}` : ""}`;
    case "release":
      return `${e.id} released`;
    case "doc":
      return `${e.id} ${e.field}.md ${e.to === "append" ? "appended" : "written"}`;
    case "update":
      if (e.field === "status") return `${e.id} moved ${String(e.from)} → ${String(e.to)}`;
      if (e.field === "body") return `${e.id} body edited`;
      return `${e.id} ${e.field} changed`;
    default:
      return `${e.id} ${e.op}`;
  }
}

function timeAgo(ts: string): string {
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return ts;
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
