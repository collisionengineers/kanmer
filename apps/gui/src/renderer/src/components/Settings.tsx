import { useMemo, useState } from "react";
import type { BoardColumn, BoardConfig, ColumnKind, Item } from "@kanmer/core";
import type { ConnectResult, ConnectTarget } from "../../../shared/ipc.js";

interface SettingsProps {
  board: BoardConfig;
  items: Item[];
  theme: "dark" | "light";
  onSaveBoard: (next: BoardConfig) => Promise<void>;
  onSetTheme: (theme: "dark" | "light") => void;
  onClose: () => void;
}

const DEFAULT_COLOR = "#5b8cff";

export function Settings({
  board,
  items,
  theme,
  onSaveBoard,
  onSetTheme,
  onClose,
}: SettingsProps): JSX.Element {
  const [draft, setDraft] = useState<BoardConfig>(() => structuredClone(board));
  const [saving, setSaving] = useState(false);

  // Usage counts so deleting an in-use column shows a soft warning.
  const usage = useMemo(() => countUsage(items), [items]);

  const setColumns = (kind: ColumnKind, cols: BoardColumn[]) =>
    setDraft((d) => ({ ...d, [pluralKey(kind)]: cols }));

  const save = async () => {
    setSaving(true);
    try {
      await onSaveBoard(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <div className="spacer" />
          <button className="ghost sm" onClick={onClose}>
            Cancel
          </button>
          <button className="primary sm" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-grid">
            <ColumnEditor
              title="Phases (swimlanes)"
              kind="phase"
              columns={draft.phases}
              usage={usage.phase}
              onChange={(c) => setColumns("phase", c)}
            />
            <ColumnEditor
              title="Statuses (columns)"
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
              {(["dark", "light"] as const).map((t) => (
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
          />
          <input
            className="col-name"
            value={c.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <span className="col-id" title="id (stable)">
            {c.id}
            {usage[c.id] ? <span className="usage"> ·{usage[c.id]}</span> : null}
          </span>
          <button className="ghost xs" onClick={() => move(i, -1)} disabled={i === 0}>
            ↑
          </button>
          <button className="ghost xs" onClick={() => move(i, 1)} disabled={i === columns.length - 1}>
            ↓
          </button>
          <button
            className="ghost xs"
            onClick={() => remove(i)}
            title={usage[c.id] ? `${usage[c.id]} item(s) still use this` : "Delete"}
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
  return kind === "phase"
    ? "phases"
    : kind === "status"
      ? "statuses"
      : kind === "area"
        ? "areas"
        : "priorities";
}

function countUsage(items: Item[]) {
  const acc = {
    phase: {} as Record<string, number>,
    status: {} as Record<string, number>,
    area: {} as Record<string, number>,
    priority: {} as Record<string, number>,
  };
  for (const i of items) {
    if (i.phase) acc.phase[i.phase] = (acc.phase[i.phase] ?? 0) + 1;
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
