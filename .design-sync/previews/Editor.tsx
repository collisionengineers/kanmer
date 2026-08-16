import { Editor, demoBoard, demoItems } from "@kanmer/ui";
import "./frame.module.css";

const knownIds = new Set(demoItems.map((i) => i.id));
const noop = () => {};
const save = async () => demoItems[0];
const byId = (id: string) => demoItems.find((i) => i.id === id)!;

/** A taken ticket mid-implementation: doc tabs with a 2/4 checklist, "taken on branch" note, commits + blocks in the links panel, deployment select. */
export const TakenTicket = () => (
  <div style={{ height: 720 }}>
    <Editor
      item={byId("API-009")}
      board={demoBoard}
      items={demoItems}
      knownIds={knownIds}
      changeSignal={0}
      onClose={noop}
      onNavigate={noop}
      onSave={save}
    />
  </div>
);

/** A backlog ticket with only the basics filled in — the common case. */
export const PlainTicket = () => (
  <div style={{ height: 720 }}>
    <Editor
      item={byId("GUI-031")}
      board={demoBoard}
      items={demoItems}
      knownIds={knownIds}
      changeSignal={0}
      onClose={noop}
      onNavigate={noop}
      onSave={save}
    />
  </div>
);

/** An archived ticket: the "archived" tag and an Unarchive action in the head. */
export const ArchivedTicket = () => (
  <div style={{ height: 720 }}>
    <Editor
      item={byId("TICK-090")}
      board={demoBoard}
      items={demoItems}
      knownIds={knownIds}
      changeSignal={0}
      onClose={noop}
      onNavigate={noop}
      onSave={save}
    />
  </div>
);
