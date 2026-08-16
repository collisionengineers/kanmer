import { useState } from "react";
import { ChipInput } from "@kanmer/ui";
import "./frame.module.css";

/** Labels on a ticket — the Editor's "Labels" field. */
export const Labels = () => {
  const [value, setValue] = useState(["concurrency", "core"]);
  return (
    <div className="field" style={{ maxWidth: 420 }}>
      <span>Labels</span>
      <ChipInput
        value={value}
        onChange={setValue}
        suggestions={[{ id: "perf" }, { id: "mcp" }, { id: "board" }, { id: "a11y" }]}
        placeholder="Add label…"
        ariaLabel="Labels"
      />
    </div>
  );
};

/** Linking items by id — suggestions carry the item title as a hint. */
export const LinksToItems = () => {
  const [value, setValue] = useState(["GUI-027"]);
  return (
    <div className="field" style={{ maxWidth: 420 }}>
      <span>Links</span>
      <ChipInput
        value={value}
        onChange={setValue}
        suggestions={[
          { id: "API-009", hint: "Item-level expectedUpdated conflict check" },
          { id: "GUI-028", hint: "Keyboard drag: Ctrl+←/→ moves a card one stage" },
        ]}
        placeholder="Link an item id…"
        ariaLabel="Links"
      />
    </div>
  );
};

/** Nothing chosen yet — the placeholder shows until the first chip. */
export const Empty = () => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div className="field" style={{ maxWidth: 420 }}>
      <span>Governing docs</span>
      <ChipInput value={value} onChange={setValue} placeholder="docs/prd/…" ariaLabel="Governing document paths" />
    </div>
  );
};
