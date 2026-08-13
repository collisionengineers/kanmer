import { useMemo, useRef, useState } from "react";

interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Suggestion pool (existing labels, known item ids…). */
  suggestions?: { id: string; hint?: string }[];
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Chips with ✕ plus a free-text input: Enter or comma commits, Backspace on
 * an empty input removes the last chip, suggestions filter as you type.
 */
export function ChipInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  ariaLabel,
}: ChipInputProps): JSX.Element {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    return suggestions
      .filter((s) => !value.includes(s.id))
      .filter((s) => !q || s.id.toLowerCase().includes(q) || s.hint?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [text, suggestions, value]);

  const commit = (raw: string) => {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText("");
    setActiveIdx(0);
  };

  return (
    <div className="chip-input" onClick={() => inputRef.current?.focus()}>
      {value.map((v) => (
        <span key={v} className="chip">
          {v}
          <button
            className="chip-x"
            aria-label={`Remove ${v}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((x) => x !== v));
            }}
          >
            ✕
          </button>
        </span>
      ))}
      <div className="chip-entry">
        <input
          ref={inputRef}
          value={text}
          placeholder={value.length === 0 ? placeholder : undefined}
          aria-label={ariaLabel}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActiveIdx(0);
            if (e.target.value.endsWith(",")) commit(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && matches.length > 0 && text.trim()) commit(matches[activeIdx]?.id ?? text);
              else commit(text);
            } else if (e.key === "Backspace" && !text && value.length > 0) {
              onChange(value.slice(0, -1));
            } else if (e.key === "ArrowDown" && matches.length > 0) {
              e.preventDefault();
              setActiveIdx((i) => (i + 1) % matches.length);
            } else if (e.key === "ArrowUp" && matches.length > 0) {
              e.preventDefault();
              setActiveIdx((i) => (i - 1 + matches.length) % matches.length);
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        />
        {open && text.trim() && matches.length > 0 && (
          <ul className="autocomplete">
            {matches.map((s, i) => (
              <li
                key={s.id}
                className={i === activeIdx ? "active" : ""}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(s.id);
                }}
              >
                <span className="ac-id">{s.id}</span>
                {s.hint && <span className="ac-title">{s.hint}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
