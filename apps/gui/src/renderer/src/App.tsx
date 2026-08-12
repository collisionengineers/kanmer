import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardConfig, CreateItemInput, Item, ItemType } from "@kanmer/core";
import type { AppSettings } from "../../shared/ipc.js";
import { Board } from "./components/Board.js";
import { ItemList } from "./components/ItemList.js";
import { Editor } from "./components/Editor.js";
import { FilterBar, type Filters } from "./components/FilterBar.js";
import { Settings } from "./components/Settings.js";
import { Welcome } from "./components/Welcome.js";

type View = ItemType;

const VIEW_LABELS: Record<View, string> = {
  ticket: "Board",
  plan: "Plans",
  research: "Research",
};

const EMPTY_FILTERS: Filters = { showArchived: false };

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

  // Whether the editor holds unsaved edits — a ref so reporting dirtiness
  // doesn't re-render the app on every keystroke.
  const editorDirty = useRef(false);
  const [pendingNav, setPendingNav] = useState<{ id: string | null } | null>(null);

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
  const trySelect = useCallback(
    (id: string | null) => {
      setSelectedId((current) => {
        if (id !== current && editorDirty.current) {
          setPendingNav({ id });
          return current;
        }
        return id;
      });
    },
    [],
  );

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

  // Apply theme to the document whenever it changes.
  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme ?? "dark";
  }, [settings?.theme]);

  // Live-reload when the .kanmer folder changes on disk.
  useEffect(() => {
    if (!root) return;
    return window.kanmer.onChange(() => void refresh());
  }, [root, refresh]);

  const pickAndOpen = useCallback(async () => {
    try {
      const path = await window.kanmer.pickProject();
      if (path) await openProject(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [openProject]);

  const setTheme = useCallback(async (theme: "dark" | "light") => {
    setSettings(await window.kanmer.setTheme(theme));
  }, []);

  // Not optimistic: an invalid board must never render (or half-render and
  // then throw) — the modal shows the validation error instead.
  const saveBoard = useCallback(async (next: BoardConfig) => {
    setBoard(await window.kanmer.setBoard(next));
  }, []);

  const createItem = useCallback(
    async (input: CreateItemInput, opts: { select?: boolean } = {}) => {
      const created = await window.kanmer.createItem(input);
      await refresh();
      if (opts.select) setSelectedId(created.id);
      return created;
    },
    [refresh],
  );

  const knownIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const viewItems = useMemo(
    () => applyFilters(items.filter((i) => i.type === view), search, filters),
    [items, view, search, filters],
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

  const allViewItems = items.filter((i) => i.type === view);

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
              <span className="count">{items.filter((i) => i.type === v && !i.archived).length}</span>
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

      <FilterBar
        board={board}
        items={items.filter((i) => i.type === view)}
        search={search}
        onSearch={setSearch}
        filters={filters}
        onFilters={setFilters}
      />

      {error && <div className="banner error">{error}</div>}

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
              onQuickAdd={(input) => void createItem(input)}
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
          {allViewItems.length === 0 && (
            <div className="content-empty">
              <p>
                {view === "ticket"
                  ? "No tickets yet — add a card, or connect an agent in Settings."
                  : `No ${VIEW_LABELS[view].toLowerCase()} yet.`}
              </p>
            </div>
          )}
          {allViewItems.length > 0 && viewItems.length === 0 && (
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
            onDelete={async () => {
              await window.kanmer.deleteItem(selected.id);
              editorDirty.current = false;
              setSelectedId(null);
              await refresh();
            }}
          />
        )}
      </div>

      {pendingNav && (
        <div className="modal-backdrop" onClick={() => setPendingNav(null)}>
          <div className="modal confirm" onClick={(e) => e.stopPropagation()}>
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
          onSaveBoard={saveBoard}
          onSetTheme={setTheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function applyFilters(list: Item[], search: string, filters: Filters): Item[] {
  const q = search.trim().toLowerCase();
  return list.filter((item) => {
    if (!filters.showArchived && item.archived) return false;
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
