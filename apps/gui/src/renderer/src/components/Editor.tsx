import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardColumn, BoardConfig, Item, LinkGraph, UpdateItemPatch } from "@kanmer/core";
import { renderMarkdown } from "../lib/markdown.js";

interface EditorProps {
  item: Item;
  board: BoardConfig;
  items: Item[];
  knownIds: Set<string>;
  onClose: () => void;
  onNavigate: (id: string) => void;
  /** Saves a diff patch; resolves with the item as written to disk. */
  onSave: (patch: UpdateItemPatch) => Promise<Item>;
  /** Reports dirty-state changes so App can guard against losing edits. */
  onDirtyChange?: (dirty: boolean) => void;
}

/** The editable fields, as flat strings (lists joined for the inputs). */
interface Snapshot {
  title: string;
  status: string;
  area: string;
  priority: string;
  assignee: string;
  labels: string;
  links: string;
  body: string;
  /** The `updated` stamp this snapshot came from — the conflict reference. */
  updated: string;
}

const FIELD_KEYS = [
  "title",
  "status",
  "area",
  "priority",
  "assignee",
  "labels",
  "links",
  "body",
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

function snapOf(item: Item): Snapshot {
  return {
    title: item.title,
    status: item.status,
    area: item.area,
    priority: item.priority,
    assignee: item.assignee,
    labels: (item.labels ?? []).join(", "),
    links: (item.links ?? []).join(", "),
    body: item.body,
    updated: item.updated,
  };
}

/** Ensure the item's current value is selectable even if not in board config. */
function withCurrent(options: BoardColumn[], current: string): BoardColumn[] {
  return !current || options.some((o) => o.id === current)
    ? options
    : [...options, { id: current, name: current }];
}

export function Editor(props: EditorProps): JSX.Element {
  const { item, board, items, knownIds, onClose, onNavigate, onSave, onDirtyChange } = props;

  const [form, setForm] = useState<Snapshot>(() => snapOf(item));
  // The item as last read/written: saves diff against this, never against
  // the live prop — so a concurrent agent edit to a field the user never
  // touched is left alone instead of being clobbered.
  const baseline = useRef<Snapshot>(snapOf(item));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [graph, setGraph] = useState<LinkGraph | null>(null);
  const [conflict, setConflict] = useState<{ fields: FieldKey[]; theirs: Partial<Snapshot> } | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  // Wiki-link autocomplete state.
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [suggest, setSuggest] = useState<{ from: number; caret: number; query: string } | null>(
    null,
  );
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    void window.kanmer.getLinks(item.id).then(setGraph);
  }, [item.id, item.updated]);

  const dirtyKeys = useMemo(
    () => FIELD_KEYS.filter((k) => form[k] !== baseline.current[k]),
    [form],
  );
  const dirty = dirtyKeys.length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  // On unmount the editor's edits are gone either way — report clean.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // The latest form values, readable from effects without re-running them.
  const formRef = useRef(form);
  formRef.current = form;

  // Live re-sync: the item changed on disk while the editor is open (agent
  // edit, second window…). Untouched fields silently adopt the new values;
  // a field the user is editing that ALSO changed on disk raises the
  // conflict banner instead of anyone's version being silently dropped.
  useEffect(() => {
    if (item.updated === baseline.current.updated) return;
    const incoming = snapOf(item);
    const prev = formRef.current;
    const touched = FIELD_KEYS.filter((k) => prev[k] !== baseline.current[k]);
    const conflicts = touched.filter(
      (k) => incoming[k] !== baseline.current[k] && incoming[k] !== prev[k],
    );
    const next: Snapshot = { ...incoming };
    for (const k of touched) next[k] = prev[k];
    baseline.current = incoming;
    setForm(next);
    if (conflicts.length > 0) {
      setConflict({
        fields: conflicts,
        theirs: Object.fromEntries(conflicts.map((k) => [k, incoming[k]])),
      });
    }
  }, [item]);

  const statusOpts = withCurrent(board.statuses, item.status);
  const priorityOpts = withCurrent(board.priorities, item.priority);
  const areaOpts = withCurrent(board.areas, item.area);

  /** Build the diff patch: only fields where local ≠ baseline. */
  const buildPatch = (keys: FieldKey[]): UpdateItemPatch => {
    const patch: UpdateItemPatch = {};
    for (const k of keys) {
      if (k === "labels") patch.labels = splitList(form.labels);
      else if (k === "links") patch.links = splitList(form.links);
      else patch[k] = form[k];
    }
    return patch;
  };

  const save = async () => {
    const keys = FIELD_KEYS.filter((k) => form[k] !== baseline.current[k]);
    if (keys.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Close the watcher-debounce race: check the file just before writing.
      const fresh = await window.kanmer.getItem(item.id);
      if (fresh && fresh.updated !== baseline.current.updated) {
        const incoming = snapOf(fresh);
        const conflicts = keys.filter(
          (k) => incoming[k] !== baseline.current[k] && incoming[k] !== form[k],
        );
        setForm((prev) => {
          const next: Snapshot = { ...incoming };
          for (const k of keys) next[k] = prev[k];
          return next;
        });
        baseline.current = incoming;
        if (conflicts.length > 0) {
          setConflict({
            fields: conflicts,
            theirs: Object.fromEntries(conflicts.map((k) => [k, incoming[k]])),
          });
          return; // don't save over a live conflict — the user decides first
        }
      }
      const saved = await onSave({
        ...buildPatch(keys),
        expectedUpdated: baseline.current.updated,
      });
      const snap = snapOf(saved);
      baseline.current = snap;
      setForm(snap);
      setConflict(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const set = (k: FieldKey, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Ctrl+S saves from anywhere in the editor.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onPreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "A") {
      const href = target.getAttribute("href") ?? "";
      if (href.startsWith("kanmer:")) {
        e.preventDefault();
        onNavigate(href.slice("kanmer:".length));
      }
    }
  };

  // --- wiki autocomplete ---------------------------------------------------
  const suggestions = useMemo(() => {
    if (!suggest) return [];
    const q = suggest.query.toLowerCase();
    return items
      .filter((i) => i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [suggest, items]);

  const recomputeSuggest = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = /\[\[([^\]\n]*)$/.exec(before);
    if (m) {
      setSuggest({ from: m.index, caret, query: m[1] });
      setActiveIdx(0);
    } else {
      setSuggest(null);
    }
  };

  const insertSuggestion = (chosen: Item) => {
    if (!suggest) return;
    const next =
      form.body.slice(0, suggest.from) + `[[${chosen.id}]]` + form.body.slice(suggest.caret);
    set("body", next);
    setSuggest(null);
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el) {
        const pos = suggest.from + `[[${chosen.id}]]`.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggest || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      e.stopPropagation(); // just close the popup, not the editor
      setSuggest(null);
    }
  };

  return (
    <aside className="editor">
      <div className="editor-head">
        <span className="editor-id">{item.id}</span>
        {item.archived && <span className="chip subtle archived-tag">archived</span>}
        <div className="spacer" />
        <button
          className="ghost sm"
          title={item.archived ? undefined : "Hides from the board; restore from the Archived view"}
          onClick={() => void onSave({ archived: !item.archived })}
        >
          {item.archived ? "Unarchive" : "Archive"}
        </button>
        <button className="ghost sm" onClick={onClose}>
          Close
        </button>
      </div>

      {conflict && (
        <div className="banner warn conflict-banner">
          <span>
            Changed on disk while editing ({conflict.fields.join(", ")}) — keep your version or
            take the one from disk?
          </span>
          <div className="conflict-actions">
            <button className="ghost xs" onClick={() => setConflict(null)}>
              Keep mine
            </button>
            <button
              className="ghost xs"
              onClick={() => {
                setForm((f) => ({ ...f, ...conflict.theirs }));
                setConflict(null);
              }}
            >
              Take theirs
            </button>
          </div>
        </div>
      )}
      {saveError && <div className="banner error">{saveError}</div>}

      <label className="field">
        <span>Title</span>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} />
      </label>

      <label className="field">
        <span>Stage</span>
        <select value={form.status} onChange={(e) => set("status", e.target.value)}>
          {statusOpts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span>Area</span>
          <select value={form.area} onChange={(e) => set("area", e.target.value)}>
            <option value="">— none —</option>
            {areaOpts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {priorityOpts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Assignee</span>
        <input value={form.assignee} onChange={(e) => set("assignee", e.target.value)} />
      </label>

      <label className="field">
        <span>Labels (comma-separated)</span>
        <input value={form.labels} onChange={(e) => set("labels", e.target.value)} />
      </label>

      <label className="field">
        <span>Links (comma-separated ids)</span>
        <input value={form.links} onChange={(e) => set("links", e.target.value)} />
      </label>

      <div className="field">
        <div className="body-head">
          <span>Body</span>
          <button className="ghost xs" onClick={() => setPreview((p) => !p)}>
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div
            className="preview markdown"
            onClick={onPreviewClick}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body, knownIds) }}
          />
        ) : (
          <div className="body-wrap">
            <textarea
              ref={bodyRef}
              className="body"
              value={form.body}
              spellCheck={false}
              onChange={(e) => {
                set("body", e.target.value);
                recomputeSuggest(e.target.value, e.target.selectionStart ?? 0);
              }}
              onKeyDown={onBodyKeyDown}
              onClick={(e) => recomputeSuggest(form.body, e.currentTarget.selectionStart ?? 0)}
              placeholder="Markdown… reference other items with [[TICK-001]]"
            />
            {suggest && suggestions.length > 0 && (
              <ul className="autocomplete">
                {suggestions.map((s, i) => (
                  <li
                    key={s.id}
                    className={i === activeIdx ? "active" : ""}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertSuggestion(s);
                    }}
                  >
                    <span className="ac-id">{s.id}</span>
                    <span className="ac-title">{s.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {graph && (graph.links.length > 0 || graph.backlinks.length > 0) && (
        <div className="links-panel">
          {graph.links.length > 0 && (
            <div className="links-group">
              <span className="links-title">Links to</span>
              {graph.links.map((id) => (
                <button key={id} className="chip link" onClick={() => onNavigate(id)}>
                  {id}
                </button>
              ))}
            </div>
          )}
          {graph.backlinks.length > 0 && (
            <div className="links-group">
              <span className="links-title">Linked from</span>
              {graph.backlinks.map((id) => (
                <button key={id} className="chip link" onClick={() => onNavigate(id)}>
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="editor-foot">
        <button className="primary" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>
    </aside>
  );
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
