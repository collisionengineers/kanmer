import { useState } from "react";

interface QuickAddProps {
  onAdd: (title: string) => void;
  label?: string;
  placeholder?: string;
}

/** A "+" affordance that expands into an inline title input (Enter to add). */
export function QuickAdd({ onAdd, label = "Add", placeholder = "Title…" }: QuickAddProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const commit = () => {
    const t = title.trim();
    if (t) onAdd(t);
    setTitle("");
  };

  if (!open) {
    return (
      <button className="quickadd-btn" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }

  return (
    <input
      className="quickadd-input"
      autoFocus
      value={title}
      placeholder={placeholder}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setTitle("");
          setOpen(false);
        }
      }}
      onBlur={() => {
        commit();
        setOpen(false);
      }}
    />
  );
}
