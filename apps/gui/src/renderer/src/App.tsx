import { useCallback, useEffect, useMemo, useState } from "react";
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
    const res = await window.kanmer.openProject(path);
    setRoot(res.root);
    setBoard(res.board);
    setItems(res.items);
    setSelectedId(null);
    setSettings(await window.kanmer.getSettings());
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
    const path = await window.kanmer.pickProject();
    if (path) await openProject(path);
  }, [openProject]);

  const setTheme = useCallback(async (theme: "dark" | "light") => {
    setSettings(await window.kanmer.setTheme(theme));
  }, []);

  const saveBoard = useCallback(async (next: BoardConfig) => {
    setBoard(next); // optimistic; the watcher refresh confirms
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
              onSelect={setSelectedId}
              onMove={async (id, to) => {
                await window.kanmer.moveItem(id, to);
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
              onSelect={setSelectedId}
              onQuickAdd={(title) => void createItem({ type: view, title })}
            />
          )}
        </section>

        {selected && (
          <Editor
            key={selected.id}
            item={selected}
            board={board}
            items={items}
            knownIds={knownIds}
            onClose={() => setSelectedId(null)}
            onNavigate={setSelectedId}
            onSave={async (patch) => {
              await window.kanmer.updateItem(selected.id, patch);
              await refresh();
            }}
            onDelete={async () => {
              await window.kanmer.deleteItem(selected.id);
              setSelectedId(null);
              await refresh();
            }}
          />
        )}
      </div>

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
