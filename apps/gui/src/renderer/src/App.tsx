import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BoardConfig,
  CreateItemInput,
  Item,
  MigrationReport,
  MovePosition,
} from "@kanmer/core";
import { blockedIds, columnCards, optimisticOrder } from "./lib/board.js";
import type { AppSettings, ChangePayload, Theme } from "../../shared/ipc.js";
import { Board } from "./components/Board.js";
import { ArchivedList } from "./components/ArchivedList.js";
import { Editor } from "./components/Editor.js";
import { FilterBar, type Filters } from "./components/FilterBar.js";
import { Settings } from "./components/Settings.js";
import { Standup } from "./components/Standup.js";
import { ActivityPanel } from "./components/ActivityPanel.js";
import { CommandPalette, type PaletteCommand } from "./components/CommandPalette.js";
import { ConfirmModal } from "./components/ConfirmModal.js";
import { Welcome } from "./components/Welcome.js";

type View = "ticket" | "standup" | "archived";

const VIEW_LABELS: Record<View, string> = {
  ticket: "Board",
  standup: "Standup",
  archived: "Archived",
};

const EMPTY_FILTERS: Filters = {};
const DOC_NAMES = new Set(["research", "impact", "plan", "checklist", "proof"]);

/** A project the user asked to open: pick one, or a known path. */
type OpenTarget = { kind: "pick" } | { kind: "path"; path: string };

interface Toast {
  seq: number;
  id: string | null;
  text: string;
}

export function App(): JSX.Element {
  const [root, setRoot] = useState<string | null>(null);
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
  const [quickAddSignal, setQuickAddSignal] = useState(0);
  const [changeSignal, setChangeSignal] = useState(0);
  const [migrateReport, setMigrateReport] = useState<MigrationReport | null>(null);
  const [migrating, setMigrating] = useState(false);

  // Whether the editor holds unsaved edits — a ref so reporting dirtiness
  // doesn't re-render the app on every keystroke.
  const editorDirty = useRef(false);
  const [pendingNav, setPendingNav] = useState<{ id: string | null } | null>(null);
  const [pendingProject, setPendingProject] = useState<OpenTarget | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastSeq = useRef(0);

  const refresh = useCallback(async () => {
    try {
      // `format` is re-fetched here too: onDiskChange calls refresh()
      // specifically for version.json, so an external migration (an agent,
      // another window) clears the "old layout" banner by itself.
      const [b, list, f] = await Promise.all([
        window.kanmer.getBoard(),
        window.kanmer.listItems({ includeArchived: true }),
        window.kanmer.getFormat(),
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
      const res = await window.kanmer.openProject(path);
      setRoot(res.root);
      setBoard(res.board);
      setItems(res.items);
      setFormat(res.format);
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

  /**
   * Scoped refresh: a change to one item file patches just that item
   * instead of re-fetching every body — O(1) per agent edit, not O(board).
   */
  const onDiskChange = useCallback(
    async (payload: ChangePayload) => {
      setChangeSignal((n) => n + 1);
      const parts = payload.file.split(/[\\/]/);
      const base = parts[parts.length - 1] ?? "";
      if (base === "board.yml") {
        try {
          setBoard(await window.kanmer.getBoard());
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
      const isDoc = DOC_NAMES.has(id);
      if (isDoc) id = parts[parts.length - 2] ?? id;
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
        await refresh();
        return;
      }
      if (payload.event === "unlink" && !isDoc) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      }
      try {
        const item = await window.kanmer.getItem(id);
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
    if (!root) return;
    return window.kanmer.onAgentChange(({ key, event }) => {
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
  }, [root, activityOpen]);

  // Toast clicks reveal the item they were about.
  useEffect(() => {
    return window.kanmer.onReveal((id) => {
      setView("ticket");
      trySelect(id);
    });
  }, [trySelect]);

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
        await window.kanmer.moveItem(id, to);
        setError(null);
      } catch (err) {
        // Roll back FIRST: refresh() clears `error` on success, so setting the
        // message before it would leave a rejected move (the proof gate, a
        // conflict) silently undone with nothing on screen.
        const message = err instanceof Error ? err.message : String(err);
        await refresh();
        setError(message);
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

  const onQuickAdd = useCallback((input: CreateItemInput) => void createItem(input), [createItem]);

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
        else if (action.type === "release") await window.kanmer.releaseTicket(item.id);
        else if (action.type === "archive")
          await window.kanmer.updateItem(item.id, { archived: true });
        else if (action.type === "unarchive")
          await window.kanmer.updateItem(item.id, { archived: false });
        else if (action.type === "delete") {
          await window.kanmer.deleteItem(item.id);
          setSelectedId((cur) => (cur === item.id ? null : cur));
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
        setQuickAddSignal((n) => n + 1);
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
  // Re-derived when the board changes rather than on a timer: a date that is
  // one render stale cannot mislabel anything a user is looking at.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [changeSignal]);
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

  const paletteCommands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "new-ticket",
        label: "New ticket",
        run: () => {
          setView("ticket");
          setQuickAddSignal((n) => n + 1);
        },
      },
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
    [setTheme, pickAndOpen],
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
                void window.kanmer
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
              today={today}
              quickAddSignal={quickAddSignal}
            />
          ) : view === "standup" ? (
            <Standup
              board={board}
              items={items}
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
                await window.kanmer.updateItem(id, { archived: false });
                await refresh();
              }}
              onDelete={async (id) => {
                await window.kanmer.deleteItem(id);
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
              const saved = await window.kanmer.updateItem(selected.id, patch);
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
          message={`Discard changes to ${selectedId}?`}
          actionLabel="Discard"
          onCancel={() => setPendingNav(null)}
          onConfirm={() => {
            editorDirty.current = false;
            setSelectedId(pendingNav.id);
            setPendingNav(null);
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
                      await window.kanmer.migrate(false);
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
