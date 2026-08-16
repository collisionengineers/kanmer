import { QuickAdd } from "@kanmer/ui";
import "./frame.module.css";

/** Collapsed: the "+ card" affordance at the bottom of every board column. */
export const Collapsed = () => (
  <div style={{ width: 240 }}>
    <QuickAdd label="card" onAdd={() => {}} />
  </div>
);

/** Open: `autoOpenSignal` (bumped by the keyboard shortcut) expands it into the inline title input. */
export const Open = () => (
  <div style={{ width: 240 }}>
    <QuickAdd label="card" placeholder="Title…" autoOpenSignal={1} onAdd={() => {}} />
  </div>
);

/** Custom label + placeholder — the per-area variant inside an area sub-header. */
export const AreaVariant = () => (
  <div style={{ width: 240 }}>
    <QuickAdd label="ticket in API" placeholder="New in API…" onAdd={() => {}} />
  </div>
);
