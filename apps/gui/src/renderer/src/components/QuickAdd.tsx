import { useEffect, useState } from "react";

interface QuickAddProps {
  onAdd: (title: string) => void;
  label?: string;
  placeholder?: string;
  /** When this number changes, the input opens (keyboard shortcut hook). */
  autoOpenSignal?: number;
}

/** A "+" affordance that expands into an inline title input (Enter to add). */
export function QuickAdd({
  onAdd,
  label = "Add",
  placeholder = "Title…",
  autoOpenSignal,
}: QuickAddProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (autoOpenSignal !== undefined && autoOpenSignal > 0) setOpen(true);
  }, [autoOpenSignal]);

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
        // Blur never creates: Enter commits, Escape cancels. Typed text keeps
        // the input open so an accidental click elsewhere loses nothing.
        if (!title.trim()) setOpen(false);
      }}
    />
  );
}
