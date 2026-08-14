export type KanmerPathChange = { key: string; kind: "board" | "item" | "document" };

/** Classify either supported Kanmer storage layout without depending on doc names. */
export function classifyKanmerPath(file: string): KanmerPathChange | null {
  const parts = file.split(/[\\/]/).filter(Boolean);
  const base = parts.at(-1) ?? "";
  if (base === "board.yml" && parts.at(-2) === "data") return { key: "board", kind: "board" };
  if (!base.endsWith(".md")) return null;
  const name = base.slice(0, -3);
  const areas = parts.lastIndexOf("areas");
  if (areas >= 0 && parts.length === areas + 4) {
    const ticket = parts[areas + 2];
    return { key: ticket, kind: name === ticket ? "item" : "document" };
  }
  const legacy = parts.at(-2);
  if (legacy === "tickets" || legacy === "plans" || legacy === "research") {
    return { key: name, kind: "item" };
  }
  return null;
}
