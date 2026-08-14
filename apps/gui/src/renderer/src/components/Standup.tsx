import { useEffect, useMemo, useState } from "react";
import type { ActivityEntry, BoardConfig, Item, ItemWarning } from "@kanmer/core";
import { buildStandup, standupMarkdown, RECENT_DONE_MS } from "../lib/standup.js";
import { useClient } from "../lib/client.js";

interface StandupProps {
  board: BoardConfig;
  items: Item[];
  /** The open project's folder name — the report's `### Board: <name>`. */
  projectName: string;
  /** Bumped on every on-disk change; keys the activity/warnings fetch. */
  changeSignal: number;
  onSelect: (id: string) => void;
}

/**
 * The human's standup. Every rule lives in lib/standup.ts (tested, DOM-free);
 * this component only fetches the two things `items` doesn't carry and renders
 * the resulting report — so the human's standup and the `kanmer-standup`
 * skill's output are the same report, which is the whole point of the view.
 */
export function Standup({
  board,
  items,
  projectName,
  changeSignal,
  onSelect,
}: StandupProps): JSX.Element {
  const client = useClient();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [warnings, setWarnings] = useState<ItemWarning[]>([]);
  const [copied, setCopied] = useState(false);

  // One fetch covers both windows: buildStandup slices the 24h set out of the
  // same 7-day array. Keyed on changeSignal, not `items` — the old effect
  // refetched on every item patch.
  useEffect(() => {
    const since = new Date(Date.now() - RECENT_DONE_MS).toISOString();
    void Promise.all([
      client.getActivity({ since }),
      client.listItemsWithWarnings({ includeArchived: true }),
    ]).then(([a, w]) => {
      setActivity(a);
      setWarnings(w.warnings);
    });
  }, [changeSignal, client]);

  const report = useMemo(
    () =>
      buildStandup({
        boardName: projectName,
        board,
        items,
        warnings,
        activity,
        now: Date.now(),
      }),
    [projectName, board, items, warnings, activity],
  );

  const markdown = useMemo(() => standupMarkdown(report), [report]);

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
      {report.sections.length === 0 && (
        <p className="empty">Nothing to report — the board is quiet.</p>
      )}
      {report.sections.map((section) => (
        <div key={section.title} className="standup-section">
          <h3>{section.title}</h3>
          {section.groups.map((group, gi) => (
            <div key={group.label ?? `__flat__${gi}`}>
              {group.label !== null && <h4 className="standup-group">{group.label}</h4>}
              <ul>
                {group.lines.map((line, li) => (
                  <li key={`${line.id ?? "warn"}:${li}`}>
                    {line.id === null ? (
                      line.text
                    ) : (
                      <>
                        <button className="linklike" onClick={() => onSelect(line.id as string)}>
                          {line.id}
                        </button>{" "}
                        {line.text.slice(line.id.length + 1)}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
