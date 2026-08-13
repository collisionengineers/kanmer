import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "@kanmer/core";

export interface PaletteCommand {
  id: string;
  label: string;
  run: () => void;
}

interface CommandPaletteProps {
  items: Item[];
  commands: PaletteCommand[];
  onJump: (id: string) => void;
  onClose: () => void;
}

/** Ctrl+K overlay: jump to an item or run a verb. Plain substring scoring. */
export function CommandPalette({
  items,
  commands,
  onJump,
  onClose,
}: CommandPaletteProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const verbs = commands
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .map((c) => ({ kind: "verb" as const, key: c.id, label: c.label, run: c.run }));
    const jumps = items
      .filter((i) => !i.archived)
      .filter((i) => q && (i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q)))
      .slice(0, 10)
      .map((i) => ({
        kind: "item" as const,
        key: i.id,
        label: `${i.id} — ${i.title || "Untitled"}`,
        run: () => onJump(i.id),
      }));
    // With no query show the verbs; with one, items first (jump is the hot path).
    return q ? [...jumps, ...verbs].slice(0, 14) : verbs;
  }, [query, items, commands, onJump]);

  const execute = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    onClose();
    r.run();
  };

  return (
    <div className="modal-backdrop palette-backdrop" onClick={onClose}>
      <div className="palette" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          placeholder="Jump to an item or run a command…"
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => (results.length ? (i + 1) % results.length : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              execute(activeIdx);
            }
          }}
        />
        <ul className="palette-list">
          {results.map((r, i) => (
            <li
              key={`${r.kind}:${r.key}`}
              className={i === activeIdx ? "active" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                execute(i);
              }}
            >
              <span className="palette-kind">{r.kind === "item" ? "↪" : "▸"}</span>
              {r.label}
            </li>
          ))}
          {results.length === 0 && <li className="palette-none">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
