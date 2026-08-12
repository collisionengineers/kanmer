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
  onSave: (patch: UpdateItemPatch) => Promise<void>;
  onDelete: () => Promise<void>;
}

/** Ensure the item's current value is selectable even if not in board config. */
function withCurrent(options: BoardColumn[], current: string): BoardColumn[] {
  return !current || options.some((o) => o.id === current)
    ? options
    : [...options, { id: current, name: current }];
}

export function Editor(props: EditorProps): JSX.Element {
  const { item, board, items, knownIds, onClose, onNavigate, onSave, onDelete } = props;

  const [title, setTitle] = useState(item.title);
  const [status, setStatus] = useState(item.status);
  const [area, setArea] = useState(item.area);
  const [priority, setPriority] = useState(item.priority);
  const [assignee, setAssignee] = useState(item.assignee);
  const [labels, setLabels] = useState(item.labels.join(", "));
  const [links, setLinks] = useState(item.links.join(", "));
  const [body, setBody] = useState(item.body);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [graph, setGraph] = useState<LinkGraph | null>(null);

  // Wiki-link autocomplete state.
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [suggest, setSuggest] = useState<{ from: number; caret: number; query: string } | null>(
    null,
  );
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    void window.kanmer.getLinks(item.id).then(setGraph);
  }, [item.id, item.updated]);

  const statusOpts = withCurrent(board.statuses, item.status);
  const priorityOpts = withCurrent(board.priorities, item.priority);
  const areaOpts = withCurrent(board.areas, item.area);

  const patch = useMemo<UpdateItemPatch>(
    () => ({
      title,
      status,
      area,
      priority,
      assignee,
      labels: splitList(labels),
      links: splitList(links),
      body,
    }),
    [title, status, area, priority, assignee, labels, links, body],
  );

  const dirty =
    title !== item.title ||
    status !== item.status ||
    area !== item.area ||
    priority !== item.priority ||
    assignee !== item.assignee ||
    labels !== item.labels.join(", ") ||
    links !== item.links.join(", ") ||
    body !== item.body;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  };

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
    const next = body.slice(0, suggest.from) + `[[${chosen.id}]]` + body.slice(suggest.caret);
    setBody(next);
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
      setSuggest(null);
    }
  };

  return (
    <aside className="editor">
      <div className="editor-head">
        <span className="editor-id">{item.id}</span>
        {item.archived && <span className="chip subtle archived-tag">archived</span>}
        <div className="spacer" />
        <button className="ghost sm" onClick={() => void onSave({ archived: !item.archived })}>
          {item.archived ? "Unarchive" : "Archive"}
        </button>
        {confirmDelete ? (
          <button className="danger sm" onClick={() => void onDelete()}>
            Confirm delete
          </button>
        ) : (
          <button className="ghost sm" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
        <button className="ghost sm" onClick={onClose}>
          Close
        </button>
      </div>

      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="field">
        <span>Stage</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
          <select value={area} onChange={(e) => setArea(e.target.value)}>
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
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
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
        <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
      </label>

      <label className="field">
        <span>Labels (comma-separated)</span>
        <input value={labels} onChange={(e) => setLabels(e.target.value)} />
      </label>

      <label className="field">
        <span>Links (comma-separated ids)</span>
        <input value={links} onChange={(e) => setLinks(e.target.value)} />
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
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body, knownIds) }}
          />
        ) : (
          <div className="body-wrap">
            <textarea
              ref={bodyRef}
              className="body"
              value={body}
              spellCheck={false}
              onChange={(e) => {
                setBody(e.target.value);
                recomputeSuggest(e.target.value, e.target.selectionStart ?? 0);
              }}
              onKeyDown={onBodyKeyDown}
              onClick={(e) => recomputeSuggest(body, e.currentTarget.selectionStart ?? 0)}
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
