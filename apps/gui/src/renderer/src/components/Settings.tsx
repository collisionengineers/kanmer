import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardColumn, BoardConfig, ColumnKind, Item } from "@kanmer/core";
import type { ConnectResult, ConnectTarget, Theme } from "../../../shared/ipc.js";

interface SettingsProps {
  board: BoardConfig;
  items: Item[];
  theme: Theme;
  notifications: boolean;
  onSaveBoard: (next: BoardConfig) => Promise<void>;
  onSetTheme: (theme: Theme) => void;
  onSetNotifications: (on: boolean) => void;
  onClose: () => void;
}

const DEFAULT_COLOR = "#5b8cff";

export function Settings({
  board,
  items,
  theme,
  notifications,
  onSaveBoard,
  onSetTheme,
  onSetNotifications,
  onClose,
}: SettingsProps): JSX.Element {
  const [draft, setDraft] = useState<BoardConfig>(() => structuredClone(board));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Usage counts so deleting an in-use column shows a soft warning.
  const usage = useMemo(() => countUsage(items), [items]);

  const modified = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(board),
    [draft, board],
  );

  const setColumns = (kind: ColumnKind, cols: BoardColumn[]) =>
    setDraft((d) => ({ ...d, [pluralKey(kind)]: cols }));

  const save = async () => {
    const problems = validateDraft(draft);
    if (problems.length > 0) {
      setError(problems.join(" · "));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveBoard(draft);
      onClose();
    } catch (err) {
      // e.g. a zod/prefix-uniqueness rejection from core — keep the modal
      // open so nothing invalid ever lands (or half-lands) on screen.
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (modified) setConfirmDiscard(true);
    else onClose();
  };

  // Focus trap: focus the dialog on open, cycle Tab inside it, restore after.
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    if (!modal) return;
    const focusables = () =>
      [...modal.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]")].filter(
        (el) => !el.hasAttribute("disabled"),
      );
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    modal.addEventListener("keydown", onKey);
    return () => {
      modal.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={requestClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Settings</h2>
          <div className="spacer" />
          <button className="ghost sm" onClick={requestClose}>
            Cancel
          </button>
          <button className="primary sm" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}
        {confirmDiscard && (
          <div className="banner warn">
            <span>Discard your board changes?</span>
            <div className="conflict-actions">
              <button className="ghost xs" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </button>
              <button className="danger xs" onClick={onClose}>
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="modal-body">
          <div className="settings-grid">
            <ColumnEditor
              title="Stages (board columns)"
              kind="status"
              columns={draft.statuses}
              usage={usage.status}
              onChange={(c) => setColumns("status", c)}
            />
            <ColumnEditor
              title="Areas (colour-grouped)"
              kind="area"
              columns={draft.areas}
              usage={usage.area}
              onChange={(c) => setColumns("area", c)}
            />
            <ColumnEditor
              title="Priorities"
              kind="priority"
              columns={draft.priorities}
              usage={usage.priority}
              onChange={(c) => setColumns("priority", c)}
            />
          </div>

          <div className="settings-section">
            <h3>ID prefixes</h3>
            <p className="hint">Applies to newly created items only; existing ids are unchanged.</p>
            <div className="field-row">
              {(["ticket", "plan", "research"] as const).map((t) => (
                <label key={t} className="field">
                  <span>{t}</span>
                  <input
                    value={draft.idPrefixes[t]}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        idPrefixes: { ...d.idPrefixes, [t]: e.target.value },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3>Theme</h3>
            <div className="theme-toggle">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  className={t === theme ? "tab active" : "tab"}
                  onClick={() => onSetTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3>Notifications</h3>
            <label className="check">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => onSetNotifications(e.target.checked)}
              />
              Toast when an agent changes the board while the window is unfocused
            </label>
          </div>

          <ConnectSection />
        </div>
      </div>
    </div>
  );
}

/** One-click register the MCP server with codex / Claude Code for this project. */
function ConnectSection(): JSX.Element {
  const [busy, setBusy] = useState<ConnectTarget | null>(null);
  const [result, setResult] = useState<(ConnectResult & { target: ConnectTarget }) | null>(null);

  const connect = async (target: ConnectTarget) => {
    setBusy(target);
    try {
      setResult({ ...(await window.kanmer.connectAgent(target)), target });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="settings-section">
      <h3>Connect an AI agent</h3>
      <p className="hint">
        Registers this project's Kanmer board with the agent's MCP client. Runs its
        <code> mcp add</code> command for you — no Node install needed.
      </p>
      <div className="theme-toggle">
        <button className="ghost" disabled={busy !== null} onClick={() => void connect("codex")}>
          {busy === "codex" ? "Connecting…" : "Connect codex"}
        </button>
        <button className="ghost" disabled={busy !== null} onClick={() => void connect("claude")}>
          {busy === "claude" ? "Connecting…" : "Connect Claude Code"}
        </button>
      </div>

      {result && (
        <div className={result.ok ? "connect-result ok" : "connect-result err"}>
          <div className="connect-status">
            {result.ok
              ? `✓ Registered with ${result.target}. Restart the agent to pick it up.`
              : `Couldn't run ${result.target}'s CLI. Run this command yourself:`}
          </div>
          <div className="connect-cmd">
            <code>{result.command}</code>
            <button
              className="ghost xs"
              onClick={() => void navigator.clipboard.writeText(result.command)}
            >
              Copy
            </button>
          </div>
          {!result.ok && <div className="connect-out">{result.output}</div>}
        </div>
      )}
    </div>
  );
}

function ColumnEditor({
  title,
  kind,
  columns,
  usage,
  onChange,
}: {
  title: string;
  kind: ColumnKind;
  columns: BoardColumn[];
  usage: Record<string, number>;
  onChange: (cols: BoardColumn[]) => void;
}): JSX.Element {
  const [newName, setNewName] = useState("");

  const update = (i: number, patch: Partial<BoardColumn>) =>
    onChange(columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= columns.length) return;
    const next = [...columns];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(columns.filter((_, idx) => idx !== i));
  const add = () => {
    const name = newName.trim();
    if (!name) return;
    const id = uniqueId(slug(name), columns);
    onChange([...columns, { id, name, color: DEFAULT_COLOR }]);
    setNewName("");
  };

  return (
    <div className="col-editor">
      <h3>{title}</h3>
      {columns.map((c, i) => (
        <div key={c.id} className="col-row">
          <input
            type="color"
            value={c.color ?? DEFAULT_COLOR}
            onChange={(e) => update(i, { color: e.target.value })}
            title="Colour"
            aria-label={`Colour for ${c.name}`}
          />
          <input
            className="col-name"
            value={c.name}
            onChange={(e) => update(i, { name: e.target.value })}
            aria-label={`Name of ${kind} ${c.id}`}
          />
          <span className="col-id" title="id (stable)">
            {c.id}
            {usage[c.id] ? <span className="usage"> ·{usage[c.id]}</span> : null}
          </span>
          <button
            className="ghost xs"
            onClick={() => move(i, -1)}
            disabled={i === 0}
            aria-label={`Move ${c.name} up`}
          >
            ↑
          </button>
          <button
            className="ghost xs"
            onClick={() => move(i, 1)}
            disabled={i === columns.length - 1}
            aria-label={`Move ${c.name} down`}
          >
            ↓
          </button>
          <button
            className="ghost xs"
            onClick={() => remove(i)}
            title={usage[c.id] ? `${usage[c.id]} item(s) still use this` : "Delete"}
            aria-label={`Delete ${kind} ${c.name}`}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="col-add">
        <input
          placeholder={`Add ${kind}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="ghost xs" onClick={add}>
          + Add
        </button>
      </div>
    </div>
  );
}

function pluralKey(kind: ColumnKind): keyof BoardConfig {
  return kind === "status" ? "statuses" : kind === "area" ? "areas" : "priorities";
}

/** Mirror of core's write-side checks, so problems surface inline pre-save. */
function validateDraft(draft: BoardConfig): string[] {
  const problems: string[] = [];
  if (draft.statuses.length === 0) problems.push("The board needs at least one stage.");
  for (const [label, cols] of [
    ["stage", draft.statuses],
    ["area", draft.areas],
    ["priority", draft.priorities],
  ] as const) {
    if (cols.some((c) => !c.name.trim())) problems.push(`Every ${label} needs a name.`);
  }
  if (draft.priorities.length === 0) problems.push("The board needs at least one priority.");
  for (const [t, p] of Object.entries(draft.idPrefixes)) {
    if (!p.trim()) problems.push(`The ${t} id prefix can't be empty.`);
  }
  // Area id prefixes (explicit or derived) must be unique and distinct from
  // the type prefixes — they share one id space.
  const seen = new Map<string, string>(
    Object.entries(draft.idPrefixes).map(([t, p]) => [p, `the ${t} prefix`]),
  );
  for (const area of draft.areas) {
    const derived = area.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const prefix = area.prefix ?? (derived.length >= 2 ? derived.slice(0, 6) : `${derived}XX`.slice(0, 2));
    const holder = seen.get(prefix);
    if (holder) {
      problems.push(`Area "${area.name}" would use id prefix "${prefix}", already used by ${holder}.`);
    } else {
      seen.set(prefix, `area "${area.name}"`);
    }
  }
  return problems;
}

function countUsage(items: Item[]) {
  const acc = {
    status: {} as Record<string, number>,
    area: {} as Record<string, number>,
    priority: {} as Record<string, number>,
  };
  for (const i of items) {
    if (i.status) acc.status[i.status] = (acc.status[i.status] ?? 0) + 1;
    if (i.area) acc.area[i.area] = (acc.area[i.area] ?? 0) + 1;
    if (i.priority) acc.priority[i.priority] = (acc.priority[i.priority] ?? 0) + 1;
  }
  return acc;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueId(base: string, columns: BoardColumn[]): string {
  const taken = new Set(columns.map((c) => c.id));
  if (!taken.has(base) && base) return base;
  let n = 2;
  const root = base || "col";
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
