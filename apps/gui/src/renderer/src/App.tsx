import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardConfig, CreateItemInput, Item, ItemType } from "@kanmer/core";
import type { AppSettings, Theme } from "../../shared/ipc.js";
import { Board } from "./components/Board.js";
import { ItemList } from "./components/ItemList.js";
import { ArchivedList } from "./components/ArchivedList.js";
import { Editor } from "./components/Editor.js";
import { FilterBar, type Filters } from "./components/FilterBar.js";
import { Settings } from "./components/Settings.js";
import { Welcome } from "./components/Welcome.js";

type View = ItemType | "archived";

const VIEW_LABELS: Record<View, string> = {
  ticket: "Board",
  plan: "Plans",
  research: "Research",
  archived: "Archived",
};

const EMPTY_FILTERS: Filters = {};

export function App(): JSX.Element {
  const [root, setRoot] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [view, setView] = useState<View>("ticket");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [quickAddSignal, setQuickAddSignal] = useState(0);

  // Whether the editor holds unsaved edits — a ref so reporting dirtiness
  // doesn't re-render the app on every keystroke.
  const editorDirty = useRef(false);
  const [pendingNav, setPendingNav] = useState<{ id: string | null } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [b, list] = await Promise.all([
        window.kanmer.getBoard(),
        window.kanmer.listItems({ includeArchived: true }),
      ]);
      setBoard(b);
      setItems(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const openProject = useCallback(async (path: string) => {
    setOpening(true);
    try {
      const res = await window.kanmer.openProject(path);
      setRoot(res.root);
      setBoard(res.board);
      setItems(res.items);
      setSelectedId(null);
      setSettings(await window.kanmer.getSettings());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(false);
    }
  }, []);

  /** Every deselection/navigation goes through here so edits can't be lost silently. */
  const trySelect = useCallback((id: string | null) => {
    setSelectedId((current) => {
      if (id !== current && editorDirty.current) {
        setPendingNav({ id });
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

  // Load settings + apply theme, then restore any already-open project.
  useEffect(() => {
    void (async () => {
      const s = await window.kanmer.getSettings();
      setSettings(s);
      const current = await window.kanmer.currentProject();
      if (current) await openProject(current);
    })();
  }, [openProject]);

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

  // Live-reload when the .kanmer folder changes on disk.
  useEffect(() => {
    if (!root) return;
    return window.kanmer.onChange(() => void refresh());
  }, [root, refresh]);

  // Toast clicks reveal the item they were about.
  useEffect(() => {
    return window.kanmer.onReveal((id) => {
      setView("ticket");
      trySelect(id);
    });
  }, [trySelect]);

  const pickAndOpen = useCallback(async () => {
    try {
      const path = await window.kanmer.pickProject();
      if (path) await openProject(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [openProject]);

  // Application-menu commands.
  useEffect(() => {
    return window.kanmer.onMenu((cmd) => {
      if (cmd.type === "pick-project") void pickAndOpen();
      else void openProject(cmd.path);
    });
  }, [pickAndOpen, openProject]);

  const setTheme = useCallback(async (theme: Theme) => {
    setSettings(await window.kanmer.setTheme(theme));
  }, []);

  const setNotifications = useCallback(async (on: boolean) => {
    setSettings(await window.kanmer.setNotifications(on));
  }, []);

  // Not optimistic: an invalid board must never render (or half-render and
  // then throw) — the modal shows the validation error instead.
  const saveBoard = useCallback(async (next: BoardConfig) => {
    setBoard(await window.kanmer.setBoard(next));
  }, []);

  const createItem = useCallback(
    async (input: CreateItemInput, opts: { select?: boolean } = {}) => {
      try {
        const created = await window.kanmer.createItem(input);
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

  const announce = useCallback((text: string) => {
    setAnnouncement(text);
  }, []);

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
      try {
        await window.kanmer.moveItem(id, { status: target });
        announce(
          `${id} moved to ${board.statuses.find((s) => s.id === target)?.name ?? target}`,
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      await refresh();
    },
    [board, items, refresh, announce],
  );

  // Global keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        if (settingsOpen) setSettingsOpen(false);
        else trySelect(null);
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
        setQuickAddSignal((n) => n + 1);
      } else if ((ctrl && e.key.toLowerCase() === "f") || (!inField && e.key === "/")) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (ctrl && e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        const views: View[] = ["ticket", "plan", "research", "archived"];
        setView(views[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settingsOpen, trySelect]);

  const knownIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const allViewItemsMemo = useMemo(
    () =>
      view === "archived"
        ? items.filter((i) => i.archived)
        : items.filter((i) => i.type === view && !i.archived),
    [items, view],
  );

  const viewItems = useMemo(
    () => applyFilters(allViewItemsMemo, search, view === "archived" ? EMPTY_FILTERS : filters),
    [allViewItemsMemo, search, filters, view],
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
    <div className="app">
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
              <span className="count">
                {v === "archived"
                  ? items.filter((i) => i.archived).length
                  : items.filter((i) => i.type === v && !i.archived).length}
              </span>
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="ghost" onClick={() => setSettingsOpen(true)} title="Settings">
          ⚙ Settings
        </button>
        <button className="ghost" onClick={pickAndOpen} title={root}>
          {shortenPath(root)}
        </button>
      </header>

      {view !== "archived" && (
        <FilterBar
          board={board}
          items={items.filter((i) => i.type === view && !i.archived)}
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
              onMove={async (id, to) => {
                try {
                  await window.kanmer.moveItem(id, to);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
                await refresh();
              }}
              onMoveRelative={(id, dir) => void moveRelative(id, dir)}
              onQuickAdd={(input) => void createItem(input)}
              onContext={async (item) => {
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
                  else if (action.type === "move") {
                    await window.kanmer.moveItem(item.id, { status: action.status });
                    announce(`${item.id} moved`);
                  } else if (action.type === "release") {
                    await window.kanmer.releaseTicket(item.id);
                  } else if (action.type === "archive") {
                    await window.kanmer.updateItem(item.id, { archived: true });
                  } else if (action.type === "unarchive") {
                    await window.kanmer.updateItem(item.id, { archived: false });
                  } else if (action.type === "delete") {
                    await window.kanmer.deleteItem(item.id);
                    if (selectedId === item.id) setSelectedId(null);
                  }
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
                await refresh();
              }}
              quickAddSignal={quickAddSignal}
            />
          ) : view === "archived" ? (
            <ArchivedList
              items={viewItems}
              board={board}
              selectedId={selectedId}
              onSelect={trySelect}
              onRestore={async (id) => {
                await window.kanmer.updateItem(id, { archived: false });
                await refresh();
              }}
              onDelete={async (id) => {
                await window.kanmer.deleteItem(id);
                if (selectedId === id) setSelectedId(null);
                await refresh();
              }}
            />
          ) : (
            <ItemList
              view={view}
              items={viewItems}
              board={board}
              selectedId={selectedId}
              onSelect={trySelect}
              onQuickAdd={(title) => void createItem({ type: view, title })}
            />
          )}
          {allViewItemsMemo.length === 0 && (
            <div className="content-empty">
              <p>
                {view === "ticket"
                  ? "No tickets yet — add a card, or connect an agent in Settings."
                  : view === "archived"
                    ? "Nothing archived."
                    : `No ${VIEW_LABELS[view].toLowerCase()} yet.`}
              </p>
            </div>
          )}
          {allViewItemsMemo.length > 0 && viewItems.length === 0 && (
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
            onClose={() => trySelect(null)}
            onNavigate={trySelect}
            onDirtyChange={(d) => {
              editorDirty.current = d;
            }}
            onSave={async (patch) => {
              const saved = await window.kanmer.updateItem(selected.id, patch);
              await refresh();
              return saved;
            }}
          />
        )}
      </div>

      {pendingNav && (
        <div className="modal-backdrop" onClick={() => setPendingNav(null)}>
          <div className="modal confirm" role="alertdialog" onClick={(e) => e.stopPropagation()}>
            <p>Discard changes to {selectedId}?</p>
            <div className="confirm-actions">
              <button className="ghost sm" onClick={() => setPendingNav(null)}>
                Keep editing
              </button>
              <button
                className="danger sm"
                onClick={() => {
                  editorDirty.current = false;
                  setSelectedId(pendingNav.id);
                  setPendingNav(null);
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
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

function shortenPath(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts.length <= 2 ? p : `…/${parts.slice(-2).join("/")}`;
}
