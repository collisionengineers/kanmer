import { useState } from "react";
import { ArchivedList, demoBoard, demoItems } from "@kanmer/ui";
import "./frame.module.css";

const archived = [
  ...demoItems.filter((i) => i.archived),
  { ...demoItems[9], id: "API-005", title: "Frontmatter parser: preserve unknown keys", archived: true },
  { ...demoItems[10], id: "TICK-088", title: "Spike: chokidar vs fs.watch on Windows", type: "research" as const, status: "done", archived: true },
];
const later = async () => {};

/** The Archived view: restore, or permanently delete behind a two-click confirm. Rows show id, title, type and last stage. */
export const Archived = () => {
  const [selected, setSelected] = useState<string | null>("API-005");
  return (
    <div style={{ padding: 8 }}>
      <ArchivedList items={archived} board={demoBoard} selectedId={selected} onSelect={setSelected} onRestore={later} onDelete={later} />
    </div>
  );
};
