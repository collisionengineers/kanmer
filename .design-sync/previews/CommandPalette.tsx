import { CommandPalette, demoItems } from "@kanmer/ui";
import type { PaletteCommand } from "@kanmer/ui";
import "./frame.module.css";

const commands: PaletteCommand[] = [
  { id: "new-ticket", label: "New ticket…", run: () => {} },
  { id: "toggle-view", label: "Toggle board / list view", run: () => {} },
  { id: "standup", label: "Open standup", run: () => {} },
  { id: "activity", label: "Show activity", run: () => {} },
  { id: "settings", label: "Settings…", run: () => {} },
  { id: "theme", label: "Toggle theme", run: () => {} },
];

/** Ctrl+K with no query yet: the verb list. Typing filters items by id/title first, then verbs. */
export const Verbs = () => (
  <div style={{ height: 400 }}>
    <CommandPalette items={demoItems} commands={commands} onJump={() => {}} onClose={() => {}} />
  </div>
);
