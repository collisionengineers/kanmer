/**
 * @kanmer/ui — the Kanmer design system.
 *
 * Every component below IS the GUI's component (apps/gui/src/renderer/src),
 * re-exported unchanged; the stylesheet is the GUI's styles.css. The only
 * code that lives in this package is `demo.tsx`: an in-memory ProjectClient
 * and a `KanmerProvider` so the client-backed screens (Board, Editor,
 * Settings, Standup, ActivityPanel, TicketCreate) render outside Electron.
 */
import "../../../apps/gui/src/renderer/src/styles.css";

// ── Components (real, unchanged) ─────────────────────────────────────────
export { ActivityPanel } from "../../../apps/gui/src/renderer/src/components/ActivityPanel.js";
export { ArchivedList } from "../../../apps/gui/src/renderer/src/components/ArchivedList.js";
export { Board } from "../../../apps/gui/src/renderer/src/components/Board.js";
export { Manual } from "../../../apps/gui/src/renderer/src/components/Manual.js";
export { BacklogTable } from "../../../apps/gui/src/renderer/src/components/BacklogTable.js";
export type { BacklogTableProps } from "../../../apps/gui/src/renderer/src/components/BacklogTable.js";
export { ChipInput } from "../../../apps/gui/src/renderer/src/components/ChipInput.js";
export { CommandPalette } from "../../../apps/gui/src/renderer/src/components/CommandPalette.js";
export type { PaletteCommand } from "../../../apps/gui/src/renderer/src/components/CommandPalette.js";
export { ConfirmModal } from "../../../apps/gui/src/renderer/src/components/ConfirmModal.js";
export { Editor } from "../../../apps/gui/src/renderer/src/components/Editor.js";
export { FilterBar } from "../../../apps/gui/src/renderer/src/components/FilterBar.js";
export type { Filters } from "../../../apps/gui/src/renderer/src/components/FilterBar.js";
export { QuickAdd } from "../../../apps/gui/src/renderer/src/components/QuickAdd.js";
export { Settings } from "../../../apps/gui/src/renderer/src/components/Settings.js";
export { Standup } from "../../../apps/gui/src/renderer/src/components/Standup.js";
export { TabStrip } from "../../../apps/gui/src/renderer/src/components/TabStrip.js";
export type { Tab } from "../../../apps/gui/src/renderer/src/components/TabStrip.js";
export { TicketCreate } from "../../../apps/gui/src/renderer/src/components/TicketCreate.js";
export { Welcome } from "../../../apps/gui/src/renderer/src/components/Welcome.js";

// ── Client context (the one the components read) ─────────────────────────
export { ClientContext, useClient } from "../../../apps/gui/src/renderer/src/lib/client.js";
export type { ProjectClient } from "../../../apps/gui/src/renderer/src/lib/client.js";

// ── Pure helpers the components are built on ─────────────────────────────
export {
  blockedIds,
  columnCards,
  columnColor,
  columnName,
  distinct,
  positionForDrop,
} from "../../../apps/gui/src/renderer/src/lib/board.js";
export { renderMarkdown } from "../../../apps/gui/src/renderer/src/lib/markdown.js";
export { buildStandup, standupMarkdown } from "../../../apps/gui/src/renderer/src/lib/standup.js";

// ── Shared types the props reference ─────────────────────────────────────
export type {
  Theme,
  CardDensity,
  UiPreferences,
  ConnectTarget,
  DispatchStatus,
} from "../../../apps/gui/src/shared/ipc.js";
export type {
  ActivityEntry,
  BoardColumn,
  BoardConfig,
  CreateItemInput,
  Item,
  ItemFilter,
  ItemWarning,
  LinkGraph,
  MovePosition,
  UpdateItemPatch,
} from "@kanmer/core";

// ── Demo data + provider (this package's only own code) ──────────────────
export {
  KanmerProvider,
  createDemoClient,
  demoBoard,
  demoItems,
  demoActivity,
} from "./demo.js";
export type { KanmerProviderProps } from "./demo.js";
