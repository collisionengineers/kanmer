import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BoardConfig,
  CreateItemInput,
  Item,
  MigrationReport,
  MovePosition,
} from "@kanmer/core";
import { blockedIds, columnCards, optimisticOrder } from "./lib/board.js";
import { ClientContext, makeClient, type ProjectClient } from "./lib/client.js";
import type { AppSettings, ChangePayload, Theme } from "../../shared/ipc.js";
import { Board } from "./components/Board.js";
import { TabStrip, type Tab } from "./components/TabStrip.js";
import { ArchivedList } from "./components/ArchivedList.js";
import { Editor } from "./components/Editor.js";
import { FilterBar, type Filters } from "./components/FilterBar.js";
import { Settings } from "./components/Settings.js";
import { Standup } from "./components/Standup.js";
import { ActivityPanel } from "./components/ActivityPanel.js";
import { CommandPalette, type PaletteCommand } from "./components/CommandPalette.js";
import { ConfirmModal } from "./components/ConfirmModal.js";
import { TicketCreate } from "./components/TicketCreate.js";
import { Welcome } from "./components/Welcome.js";

type View = "ticket" | "standup" | "archived";

const VIEW_LABELS: Record<View, string> = {
  ticket: "Board",
  standup: "Standup",
  archived: "Archived",
};

const EMPTY_FILTERS: Filters = {};

/** A project the user asked to open: pick one, or a known path. */
type OpenTarget = { kind: "pick" } | { kind: "path"; path: string };

/** The branch name the take modal offers by default. */
function defaultBranch(id: string): string {
  return `feat/${id.toLowerCase()}`;
}

interface Toast {
  seq: number;
  id: string | null;
  text: string;
}

/** Per-tab transient UI state, preserved across tab switches. */
interface SavedTabState {
  view: View;
  filters: Filters;
  search: string;
  selectedId: string | null;
}

export function App(): JSX.Element {
  // `root` is the active project's id (its canonical root). `tabs` is every open
  // project; switching a tab swaps `root` and restores that tab's saved UI state.
  const [root, setRoot] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const savedStates = useRef<Map<string, SavedTabState>>(new Map());
  const client = useMemo(() => (root ? makeClient(root) : null), [root]);
  // A ref to the active client so stable useCallbacks bind to the current
  // project without re-creating on every switch.
  const clientRef = useRef<ProjectClient | null>(null);
  clientRef.current = client;
  const rootRef = useRef<string | null>(null);
  rootRef.current = root;
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<1 | 2>(2);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [view, setView] = useState<View>("ticket");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [dispatching, setDispatching] = useState<Set<string>>(() => new Set());
  const [changeSignal, setChangeSignal] = useState(0);
  const [migrateReport, setMigrateReport] = useState<MigrationReport | null>(null);
  const [migrating, setMigrating] = useState(false);

  // Whether the editor holds unsaved edits — a ref so reporting dirtiness
  // doesn't re-render the app on every keystroke.
  const editorDirty = useRef(false);
  const [pendingNav, setPendingNav] = useState<{ kind: "select"; id: string | null } | { kind: "close"; projectId: string } | null>(null);
  const [pendingProject, setPendingProject] = useState<OpenTarget | null>(null);
  const [pendingTake, setPendingTake] = useState<{ id: string; branch: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastSeq = useRef(0);
  const sessionHydrated = useRef(false);

  // Value refs so a tab switch can snapshot the outgoing tab's UI without
  // stale closures.
  const viewRef = useRef(view);
  viewRef.current = view;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const searchValRef = useRef(search);
  searchValRef.current = search;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const refresh = useCallback(async () => {
    try {
      // `format` is re-fetched here too: onDiskChange calls refresh()
      // specifically for version.json, so an external migration (an agent,
      // another window) clears the "old layout" banner by itself.
      const [b, list, f] = await Promise.all([
        clientRef.current!.getBoard(),
        clientRef.current!.listItems({ includeArchived: true }),
        clientRef.current!.getFormat(),
      ]);
      setBoard(b);
      setItems(list);
      setFormat(f);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const openProject = useCallback(async (path: string) => {
    setOpening(true);
    try {
      // Snapshot the outgoing tab's UI state before switching.
      const prev = rootRef.current;
      if (prev) {
        savedStates.current.set(prev, {
          view: viewRef.current,
          filters: filtersRef.current,
          search: searchValRef.current,
          selectedId: selectedRef.current,
        });
      }
      const res = await window.kanmer.openProject(path);
      setRoot(res.projectId);
      setBoard(res.board);
      setItems(res.items);
      setFormat(res.format);
      setError(null);
      // Add/refresh the tab and clear its unread now that it's active.
      setTabs((ts) => {
        const rest = ts.filter((t) => t.projectId !== res.projectId);
        return [...rest, { projectId: res.projectId, root: res.root, name: projectNameOf(res.root), unread: 0 }];
      });
      // Restore this tab's saved UI state (or defaults for a fresh tab).
      const saved = savedStates.current.get(res.projectId);
      setView(saved?.view ?? "ticket");
      setFilters(saved?.filters ?? EMPTY_FILTERS);
      setSearch(saved?.search ?? "");
      setSelectedId(saved?.selectedId ?? null);
      setSettings(await window.kanmer.getSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(false);
    }
  }, []);

  const performCloseTab = useCallback(
    (projectId: string) => {
      void window.kanmer.closeProject(projectId);
      savedStates.current.delete(projectId);
      setTabs((ts) => {
        const remaining = ts.filter((t) => t.projectId !== projectId);
        if (projectId === rootRef.current) {
          const next = remaining[remaining.length - 1];
          if (next) void openProject(next.projectId);
          else {
            setRoot(null);
            setBoard(null);
            setItems([]);
          }
        }
        return remaining;
      });
    },
    [openProject],
  );

  const closeTab = useCallback((projectId: string) => {
    if (projectId === rootRef.current && editorDirty.current) {
      setPendingNav((pending) => pending ?? { kind: "close", projectId });
      return;
    }
    performCloseTab(projectId);
  }, [performCloseTab]);

  /** Every deselection/navigation goes through here so edits can't be lost silently. */
  const trySelect = useCallback((id: string | null) => {
    setSelectedId((current) => {
      if (id !== current && editorDirty.current) {
        setPendingNav({ kind: "select", id });
        return current;
      }
      return id;
    });
  }, []);

  // Window close with unsaved edits gets the native "leave?" prompt.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editorDirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Load settings + apply theme, then restore the open-tab session.
  useEffect(() => {
    void (async () => {
      const s = await window.kanmer.getSettings();
      setSettings(s);
      let toOpen = s.openTabs;
      if (toOpen.length === 0 && !s.sessionInitialized) {
        const current = await window.kanmer.currentProject();
        toOpen = current ? [current] : [];
      }
      if (toOpen.length === 0) {
        sessionHydrated.current = true;
        return;
      }
      const active =
        s.activeTab && toOpen.includes(s.activeTab) ? s.activeTab : toOpen[toOpen.length - 1];
      // Open background tabs (their main context + watcher go live) without
      // activating them, so counts/unread update; then activate the last.
      for (const p of toOpen) {
        if (p === active) continue;
        try {
          const res = await window.kanmer.openProject(p);
          setTabs((ts) => [
            ...ts.filter((t) => t.projectId !== res.projectId),
            { projectId: res.projectId, root: res.root, name: projectNameOf(res.root), unread: 0 },
          ]);
        } catch {
          // skip an unopenable restored tab
        }
      }
      await openProject(active);
      sessionHydrated.current = true;
    })();
  }, [openProject]);

  // Persist the open-tab session so it restores next boot.
  useEffect(() => {
    if (!sessionHydrated.current) return;
    void window.kanmer.setOpenTabs(tabs.map((t) => t.projectId), root ?? "");
  }, [tabs, root]);

  // Apply theme to the document; "system" follows the OS live.
  useEffect(() => {
    const theme = settings?.theme ?? "dark";
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme;
    };
    apply();
    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings?.theme]);

  // The window title tracks the active project so the taskbar identifies it.
  useEffect(() => {
    document.title = root ? `${projectNameOf(root)} — Kanmer` : "Kanmer";
  }, [root]);

  /**
   * Scoped refresh: a change to one item file patches just that item
   * instead of re-fetching every body — O(1) per agent edit, not O(board).
   */
  const onDiskChange = useCallback(
    async (payload: ChangePayload) => {
      // Only the active tab's board is mounted; a background project's disk
      // change is ignored here (it refreshes when that tab is next focused).
      if (payload.projectId !== rootRef.current) return;
      setChangeSignal((n) => n + 1);
      const parts = payload.file.split(/[\\/]/);
      const base = parts[parts.length - 1] ?? "";
      if (base === "board.yml") {
        try {
          setBoard(await clientRef.current!.getBoard());
        } catch {
          await refresh();
        }
        return;
      }
      if (!base.endsWith(".md")) {
        if (base === "version.json") await refresh();
        return; // counters.json / activity.jsonl — nothing to re-render here
      }
      let id = base.slice(0, -3);
      // A doc file is areas/<area>/<ticketId>/<doc>.md — its parent folder is
      // the ticket id and differs from the file's own basename. A ticket file is
      // areas/<area>/<ticketId>/<ticketId>.md, where the two match. This is
      // doc-name agnostic (per-area configurable docs + scratch-*).
      const parent = parts[parts.length - 2];
      const isDoc = parent !== undefined && parent !== id;
      if (isDoc) id = parent;
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
        await refresh();
        return;
      }
      if (payload.event === "unlink" && !isDoc) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      }
      try {
        const item = await clientRef.current!.getItem(id);
        setItems((prev) => {
          if (!item) return prev.filter((i) => i.id !== id);
          const idx = prev.findIndex((i) => i.id === id);
          if (idx === -1) return [...prev, item];
          const next = [...prev];
          next[idx] = item;
          return next;
        });
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  useEffect(() => {
    if (!root) return;
    return window.kanmer.onChange((payload) => void onDiskChange(payload));
  }, [root, onDiskChange]);

  // Changes made by agents (never our own writes): bell counter + in-app
  // toast while focused (native toasts cover the unfocused case).
  useEffect(() => {
    return window.kanmer.onAgentChange(({ projectId, key, event }) => {
      if (projectId !== rootRef.current) {
        // Background project: bump that tab's unread dot; no toast.
        setTabs((ts) =>
          ts.map((t) => (t.projectId === projectId ? { ...t, unread: (t.unread ?? 0) + 1 } : t)),
        );
        return;
      }
      setUnread((n) => (activityOpen ? 0 : n + 1));
      if (!document.hasFocus()) return;
      const seq = ++toastSeq.current;
      const text =
        key === "board"
          ? "Agent changed the board configuration"
          : `Agent ${event === "add" ? "created" : event === "unlink" ? "deleted" : "updated"} ${key}`;
      setToasts((t) => [...t.slice(-2), { seq, id: key === "board" ? null : key, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.seq !== seq)), 4500);
    });
  }, [activityOpen]);

  // Toast clicks reveal the item they were about — focusing its project's tab.
  useEffect(() => {
    return window.kanmer.onReveal(({ projectId, id }) => {
      setView("ticket");
      if (projectId === rootRef.current) trySelect(id);
      else void openProject(projectId).then(() => trySelect(id));
    });
  }, [trySelect, openProject]);

  // Background-dispatch status: track running tickets for the card spinner
  // badge, and toast a line when one finishes.
  useEffect(() => {
    return window.kanmer.onDispatchStatus((s) => {
      setDispatching((prev) => {
        const next = new Set(prev);
        if (s.state === "running") next.add(s.ticketId);
        else next.delete(s.ticketId);
        return next;
      });
      if (s.state !== "running") {
        const seq = ++toastSeq.current;
        setToasts((t) => [
          ...t.slice(-2),
          { seq, id: s.ticketId, text: `Dispatch ${s.state}: ${s.ticketId} (${s.provider})` },
        ]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.seq !== seq)), 4500);
      }
    });
  }, []);

  const runOpen = useCallback(
    async (target: OpenTarget) => {
      try {
        const path = target.kind === "pick" ? await window.kanmer.pickProject() : target.path;
        if (path) await openProject(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [openProject],
  );

  /**
   * Opening another project replaces root/board/items outright, so
   * trySelect's pendingNav cannot defer it — it only re-targets selectedId.
   * The confirm runs BEFORE pickProject() opens the native dialog, so the
   * user is never asked twice.
   */
  const requestOpen = useCallback(
    (target: OpenTarget) => {
      if (editorDirty.current) setPendingProject(target);
      else void runOpen(target);
    },
    [runOpen],
  );

  const pickAndOpen = useCallback(() => requestOpen({ kind: "pick" }), [requestOpen]);

  // Application-menu commands.
  useEffect(() => {
    return window.kanmer.onMenu((cmd) => {
      if (cmd.type === "pick-project") requestOpen({ kind: "pick" });
      else requestOpen({ kind: "path", path: cmd.path });
    });
  }, [requestOpen]);

  const setTheme = useCallback(async (theme: Theme) => {
    setSettings(await window.kanmer.setTheme(theme));
  }, []);

  const setNotifications = useCallback(async (on: boolean) => {
    setSettings(await window.kanmer.setNotifications(on));
  }, []);

  // Not optimistic: an invalid board must never render (or half-render and
  // then throw) — the modal shows the validation error instead.
  const saveBoard = useCallback(async (next: BoardConfig) => {
    setBoard(await clientRef.current!.setBoard(next));
  }, []);

  const createItem = useCallback(
    async (input: CreateItemInput, opts: { select?: boolean } = {}) => {
      try {
        const created = await clientRef.current!.createItem(input);
        await refresh();
        if (opts.select) setSelectedId(created.id);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [refresh],
  );

  const announce = useCallback((text: string) => setAnnouncement(text), []);

  /**
   * Optimistic drag: the card lands instantly, at the position it was dropped
   * — the board sorts by order-then-id, so patching `order` as well as
   * `status` is what makes the drop land where the user aimed before the
   * write returns. The awaited write and the watcher then reconcile the real
   * fractional value; errors roll back via refresh.
   */
  const onMove = useCallback(
    async (id: string, to: { status: string; position?: MovePosition }) => {
      setItems((prev) => {
        const target = prev.find((i) => i.id === id);
        if (!target) return prev;
        const order =
          to.position === undefined
            ? target.order
            : optimisticOrder(columnCards(prev, to.status), to.position, id);
        return prev.map((i) => (i.id === id ? { ...i, status: to.status, order } : i));
      });
      try {
        await clientRef.current!.moveItem(id, to);
        setError(null);
      } catch (err) {
        // Roll back FIRST: refresh() clears `error` on success, so setting the
        // message before it would leave a rejected move (the proof gate, a
        // conflict) silently undone with nothing on screen.
        const message = err instanceof Error ? err.message : String(err);
        await refresh();
        setError(friendlyGateError(message));
      }
    },
    [refresh],
  );

  /** Keyboard equivalent of drag: move an item one stage left/right. */
  const moveRelative = useCallback(
    async (id: string, dir: -1 | 1) => {
      if (!board) return;
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const order = board.statuses.map((s) => s.id);
      const idx = order.indexOf(item.status);
      const target = order[idx + dir];
      if (idx === -1 || !target) return;
      await onMove(id, { status: target });
      announce(`${id} moved to ${board.statuses.find((s) => s.id === target)?.name ?? target}`);
    },
    [board, items, onMove, announce],
  );

  const onMoveRelative = useCallback(
    (id: string, dir: -1 | 1) => void moveRelative(id, dir),
    [moveRelative],
  );

  // Quick-added tickets default to docs_todo so the standard leave-backlog gate
  // doesn't strand them; the full dialog lets the user choose.
  const onQuickAdd = useCallback(
    (input: CreateItemInput) => void createItem({ docs_todo: true, ...input }),
    [createItem],
  );

  const releaseTicket = useCallback(
    async (id: string) => {
      try {
        await clientRef.current!.releaseTicket(id);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      await refresh();
    },
    [refresh],
  );

  /**
   * Take a ticket from the palette. takeTicket runs the proof gate when the
   * stage changes (store.ts), so it can be refused — surface it, never
   * swallow it.
   */
  const takeTicket = useCallback(
    async (id: string, branch: string) => {
      try {
        await clientRef.current!.takeTicket(id, { branch });
        setPendingTake(null);
        setError(null);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPendingTake(null);
      }
    },
    [refresh],
  );

  const onContext = useCallback(
    async (item: Item) => {
      if (!board) return;
      const action = await window.kanmer.showItemMenu({
        id: item.id,
        archived: item.archived,
        taken: Boolean(item.taken_at),
        currentStatus: item.status,
        statuses: board.statuses.map((s) => ({ id: s.id, name: s.name })),
      });
      if (!action) return;
      try {
        if (action.type === "open") trySelect(item.id);
        else if (action.type === "move") await onMove(item.id, { status: action.status });
        else if (action.type === "release") await clientRef.current!.releaseTicket(item.id);
        else if (action.type === "archive")
          await clientRef.current!.updateItem(item.id, { archived: true });
        else if (action.type === "unarchive")
          await clientRef.current!.updateItem(item.id, { archived: false });
        else if (action.type === "delete") {
          await clientRef.current!.deleteItem(item.id);
          setSelectedId((cur) => (cur === item.id ? null : cur));
        } else if (action.type === "dispatch") {
          await clientRef.current!.dispatchAgent(item.id, action.target);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      await refresh();
    },
    [board, trySelect, onMove, refresh],
  );

  const onCardContext = useCallback((item: Item) => void onContext(item), [onContext]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (activityOpen) setActivityOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else trySelect(null);
        return;
      }
      if (ctrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (ctrl && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (inField && !ctrl) return;
      if (ctrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setView("ticket");
        setCreateOpen(true);
      } else if ((ctrl && e.key.toLowerCase() === "f") || (!inField && e.key === "/")) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (ctrl && e.key >= "1" && e.key <= "3") {
        e.preventDefault();
        const views: View[] = ["ticket", "standup", "archived"];
        setView(views[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settingsOpen, paletteOpen, activityOpen, trySelect]);

  const knownIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const lastStage = board?.statuses[board.statuses.length - 1]?.id;
  // Card badge inputs: computed once here, read per card as booleans so
  // Card's memoization survives (a Set prop would re-render every card).
  const blocked = useMemo(() => blockedIds(items, lastStage), [items, lastStage]);
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const allViewItems = useMemo(
    () =>
      view === "archived"
        ? items.filter((i) => i.archived)
        : items.filter((i) => i.type === "ticket" && !i.archived),
    [items, view],
  );

  const viewItems = useMemo(
    () => applyFilters(allViewItems, search, view === "archived" ? EMPTY_FILTERS : filters),
    [allViewItems, search, filters, view],
  );

  const projectName = useMemo(() => projectNameOf(root), [root]);

  const paletteCommands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "new-ticket",
        label: "New ticket",
        run: () => {
          setView("ticket");
          setCreateOpen(true);
        },
      },
      // The three item verbs are contextual on the selection: with nothing
      // selected they do not appear, which is honest for a verb that needs a
      // subject. Substring scoring in the palette filters them.
      ...(selected && board
        ? board.statuses
            .filter((s) => s.id !== selected.status)
            .map((s) => ({
              id: `move-${s.id}`,
              label: `Move ${selected.id} → ${s.name}`,
              // No position: a palette move is a stage change, like the
              // context menu's "Move to".
              run: () => void onMove(selected.id, { status: s.id }),
            }))
        : []),
      ...(selected && !selected.taken_at
        ? [
            {
              id: "take",
              label: `Take ${selected.id}…`,
              run: () => setPendingTake({ id: selected.id, branch: defaultBranch(selected.id) }),
            },
          ]
        : []),
      ...(selected?.taken_at
        ? [
            {
              id: "release",
              label: `Release ${selected.id}`,
              run: () => void releaseTicket(selected.id),
            },
          ]
        : []),
      { id: "view-board", label: "Go to Board", run: () => setView("ticket") },
      { id: "view-standup", label: "Go to Standup", run: () => setView("standup") },
      { id: "view-archived", label: "Go to Archived", run: () => setView("archived") },
      { id: "activity", label: "Show activity", run: () => setActivityOpen(true) },
      { id: "settings", label: "Open Settings", run: () => setSettingsOpen(true) },
      { id: "theme-dark", label: "Theme: dark", run: () => void setTheme("dark") },
      { id: "theme-light", label: "Theme: light", run: () => void setTheme("light") },
      { id: "theme-system", label: "Theme: system", run: () => void setTheme("system") },
      { id: "open-project", label: "Open project…", run: () => void pickAndOpen() },
    ],
    [setTheme, pickAndOpen, selected, board, onMove, releaseTicket],
  );

  if (!root || !board) {
    return (
      <Welcome
        recentProjects={settings?.recentProjects ?? []}
        onPick={pickAndOpen}
        onOpen={openProject}
        error={error}
        opening={opening}
      />
    );
  }

  return (
    <ClientContext.Provider value={client}>
    <div className="app">
      <TabStrip
        tabs={tabs}
        activeId={root}
        dirty={editorDirty.current}
        onSelect={(pid) => requestOpen({ kind: "path", path: pid })}
        onClose={closeTab}
        onNew={pickAndOpen}
      />
      <header className="topbar">
        <div className="brand">Kanmer</div>
        <nav className="tabs">
          {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
            <button
              key={v}
              className={v === view ? "tab active" : "tab"}
              onClick={() => setView(v)}
            >
              {VIEW_LABELS[v]}
              {v !== "standup" && (
                <span className="count">
                  {v === "archived"
                    ? items.filter((i) => i.archived).length
                    : items.filter((i) => i.type === "ticket" && !i.archived).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button
          className="primary sm newbtn"
          onClick={() => setCreateOpen(true)}
          title="New ticket (Ctrl+N)"
        >
          + New
        </button>
        <button
          className="ghost bell"
          title="Activity"
          onClick={() => {
            setActivityOpen((o) => !o);
            setUnread(0);
          }}
        >
          🔔{unread > 0 && <span className="bell-dot" aria-label={`${unread} unread`} />}
        </button>
        <button className="ghost" onClick={() => setSettingsOpen(true)} title="Settings">
          ⚙ Settings
        </button>
        <button className="ghost" onClick={pickAndOpen} title={root}>
          {shortenPath(root)}
        </button>
      </header>

      {format === 1 && (
        <div className="banner warn">
          <span>
            This board uses the old layout — migrate to v2 to get ticket folders, documents and
            area-based ids.
          </span>
          <div className="conflict-actions">
            <button
              className="primary xs"
              onClick={() =>
                void clientRef.current!
                  .migrate(true)
                  .then(setMigrateReport)
                  // Without this, a dry run that refuses (colliding id
                  // prefixes) is an unhandled rejection with no modal and no
                  // message — the blockers below would never be seen.
                  .catch((err) => setError(err instanceof Error ? err.message : String(err)))
              }
            >
              Migrate to v2…
            </button>
          </div>
        </div>
      )}

      {view === "ticket" && (
        <FilterBar
          board={board}
          items={items.filter((i) => i.type === "ticket" && !i.archived)}
          search={search}
          onSearch={setSearch}
          filters={filters}
          onFilters={setFilters}
          searchRef={searchRef}
        />
      )}

      {error && <div className="banner error">{error}</div>}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <div className="main">
        <section className="content">
          {view === "ticket" ? (
            <Board
              board={board}
              items={viewItems}
              selectedId={selectedId}
              onSelect={trySelect}
              onMove={onMove}
              onMoveRelative={onMoveRelative}
              onQuickAdd={onQuickAdd}
              onContext={onCardContext}
              blocked={blocked}
              dispatching={dispatching}
            />
          ) : view === "standup" ? (
            <Standup
              board={board}
              items={items}
              projectName={projectName}
              changeSignal={changeSignal}
              onSelect={(id) => {
                setView("ticket");
                trySelect(id);
              }}
            />
          ) : (
            <ArchivedList
              items={viewItems}
              board={board}
              selectedId={selectedId}
              onSelect={trySelect}
              onRestore={async (id) => {
                await clientRef.current!.updateItem(id, { archived: false });
                await refresh();
              }}
              onDelete={async (id) => {
                await clientRef.current!.deleteItem(id);
                setSelectedId((cur) => (cur === id ? null : cur));
                await refresh();
              }}
            />
          )}
          {view !== "standup" && allViewItems.length === 0 && (
            <div className="content-empty">
              <p>
                {view === "ticket"
                  ? "No tickets yet — add a card, or connect an agent in Settings."
                  : "Nothing archived."}
              </p>
            </div>
          )}
          {view !== "standup" && allViewItems.length > 0 && viewItems.length === 0 && (
            <div className="content-empty">
              <p>No matches for the current filters.</p>
              <button
                className="ghost sm"
                onClick={() => {
                  setSearch("");
                  setFilters(EMPTY_FILTERS);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {selected && (
          <Editor
            key={selected.id}
            item={selected}
            board={board}
            items={items}
            knownIds={knownIds}
            changeSignal={changeSignal}
            onClose={() => trySelect(null)}
            onNavigate={trySelect}
            onDirtyChange={(d) => {
              editorDirty.current = d;
            }}
            onSave={async (patch) => {
              const saved = await clientRef.current!.updateItem(selected.id, patch);
              await refresh();
              return saved;
            }}
          />
        )}

        {activityOpen && (
          <ActivityPanel
            refreshSignal={changeSignal}
            onSelect={(id) => {
              setView("ticket");
              trySelect(id);
            }}
            onClose={() => setActivityOpen(false)}
          />
        )}
      </div>

      <div className="toast-stack">
        {toasts.map((t) => (
          <button
            key={t.seq}
            className="toast"
            onClick={() => {
              if (t.id) {
                setView("ticket");
                trySelect(t.id);
              }
              setToasts((list) => list.filter((x) => x.seq !== t.seq));
            }}
          >
            {t.text}
          </button>
        ))}
      </div>

      {pendingNav && (
        <ConfirmModal
          message={pendingNav.kind === "close" ? `Discard changes to ${selectedId} and close this project?` : `Discard changes to ${selectedId}?`}
          actionLabel="Discard"
          onCancel={() => setPendingNav(null)}
          onConfirm={() => {
            editorDirty.current = false;
            const pending = pendingNav;
            setPendingNav(null);
            if (pending.kind === "close") performCloseTab(pending.projectId);
            else setSelectedId(pending.id);
          }}
        />
      )}

      {pendingProject && (
        <ConfirmModal
          message={`Discard unsaved changes to ${selectedId} and open another project?`}
          actionLabel="Discard and open"
          onCancel={() => setPendingProject(null)}
          onConfirm={() => {
            editorDirty.current = false;
            const target = pendingProject;
            setPendingProject(null);
            void runOpen(target);
          }}
        />
      )}

      {pendingTake && (
        <div className="modal-backdrop" onClick={() => setPendingTake(null)}>
          <div className="modal confirm" role="dialog" onClick={(e) => e.stopPropagation()}>
            <p>Take {pendingTake.id} — which branch is the work on?</p>
            <label className="field">
              <span>Branch</span>
              <input
                autoFocus
                value={pendingTake.branch}
                onChange={(e) =>
                  setPendingTake((t) => (t ? { ...t, branch: e.target.value } : t))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pendingTake.branch.trim()) {
                    void takeTicket(pendingTake.id, pendingTake.branch.trim());
                  }
                }}
              />
            </label>
            <p className="hint">
              The assignee defaults to the store&apos;s actor (&quot;gui&quot;).
            </p>
            <div className="confirm-actions">
              <button className="ghost sm" onClick={() => setPendingTake(null)}>
                Cancel
              </button>
              <button
                className="primary sm"
                disabled={!pendingTake.branch.trim()}
                onClick={() => void takeTicket(pendingTake.id, pendingTake.branch.trim())}
              >
                Take
              </button>
            </div>
          </div>
        </div>
      )}

      {migrateReport && (
        <div className="modal-backdrop" onClick={() => !migrating && setMigrateReport(null)}>
          <div className="modal migrate" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Migrate to format 2</h2>
            </div>
            <div className="modal-body">
              {migrateReport.alreadyV2 ? (
                <p>This board is already format 2 — nothing to do.</p>
              ) : (
                <>
                  {migrateReport.blockers.length > 0 && (
                    <div className="banner error">
                      <div>
                        <strong>Migration is blocked.</strong>
                        <ul className="migrate-list">
                          {migrateReport.blockers.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  <p>
                    {migrateReport.ticketMoves.length} ticket(s) move into area folders,{" "}
                    {migrateReport.foldedDocs.length} plan/research document(s) fold into their
                    tickets, {migrateReport.convertedToTickets.length} orphan(s) become tickets.
                  </p>
                  {migrateReport.foldedDocs.length > 0 && (
                    <ul className="migrate-list">
                      {migrateReport.foldedDocs.map((f) => (
                        <li key={f.source}>
                          {f.source} → {f.intoTicket}/{f.doc}.md
                        </li>
                      ))}
                    </ul>
                  )}
                  {migrateReport.notes.length > 0 && (
                    <ul className="migrate-list notes">
                      {migrateReport.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div className="confirm-actions" style={{ padding: "0 16px 16px" }}>
              <button className="ghost sm" disabled={migrating} onClick={() => setMigrateReport(null)}>
                {migrateReport.alreadyV2 ? "Close" : "Not now"}
              </button>
              {!migrateReport.alreadyV2 && (
                <button
                  className="primary sm"
                  disabled={migrating || migrateReport.blockers.length > 0}
                  onClick={async () => {
                    setMigrating(true);
                    try {
                      await clientRef.current!.migrate(false);
                      setFormat(2);
                      setMigrateReport(null);
                      await refresh();
                    } catch (err) {
                      // The antidote to the destructive workaround: a failed
                      // migration is resumable, and deleting the legacy dirs
                      // is what actually loses tickets.
                      setError(
                        "The board may now be partially migrated — do not delete the legacy " +
                          "`tickets/`, `plans/` or `research/` folders; run Migrate again. " +
                          (err instanceof Error ? err.message : String(err)),
                      );
                    } finally {
                      setMigrating(false);
                    }
                  }}
                >
                  {migrating ? "Migrating…" : "Migrate now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {paletteOpen && (
        <CommandPalette
          items={items}
          commands={paletteCommands}
          onJump={(id) => {
            setView("ticket");
            trySelect(id);
          }}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      {settingsOpen && (
        <Settings
          board={board}
          items={items}
          theme={settings?.theme ?? "dark"}
          notifications={settings?.notifications ?? true}
          onSaveBoard={saveBoard}
          onSetTheme={setTheme}
          onSetNotifications={setNotifications}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {createOpen && (
        <TicketCreate
          board={board}
          items={items}
          onClose={() => setCreateOpen(false)}
          onCreate={async (input) => {
            const created = await createItem(input, { select: true });
            if (created) setCreateOpen(false);
            return created;
          }}
        />
      )}
    </div>
    </ClientContext.Provider>
  );
}

/**
 * Rewrite a core document-gate rejection into copy for a human: the raw error
 * tells an agent to call set_ticket_doc (an MCP tool the human can't invoke),
 * so point them at the ticket instead. Non-gate errors pass through untouched.
 */
function friendlyGateError(message: string): string {
  if (!message.includes("document gate(s) unmet")) return message;
  return message
    .replace(
      /Write the missing document\(s\)[\s\S]*$/,
      "Open the ticket to add the missing document(s) (or link a governing doc), then move it.",
    )
    .replace(/\.md is missing/g, " is missing");
}

function applyFilters(list: Item[], search: string, filters: Filters): Item[] {
  const q = search.trim().toLowerCase();
  return list.filter((item) => {
    if (filters.area !== undefined && item.area !== filters.area) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.assignee && item.assignee !== filters.assignee) return false;
    if (filters.label && !(item.labels ?? []).includes(filters.label)) return false;
    if (q) {
      const hay = [item.id, item.title, item.body, item.assignee, ...(item.labels ?? [])]
        .join("\n")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** The project's folder name — what the standup reports as the board name. */
function projectNameOf(p: string | null): string {
  const parts = (p ?? "").split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function shortenPath(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts.length <= 2 ? p : `…/${parts.slice(-2).join("/")}`;
}
