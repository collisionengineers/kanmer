import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BoardColumn,
  BoardConfig,
  DocType,
  Item,
  LinkGraph,
  TicketDoc,
  TicketDocsInfo,
  UpdateItemPatch,
} from "@kanmer/core";
import { renderMarkdown } from "../lib/markdown.js";
import { ChipInput } from "./ChipInput.js";
import { ConfirmModal } from "./ConfirmModal.js";

interface EditorProps {
  item: Item;
  board: BoardConfig;
  items: Item[];
  knownIds: Set<string>;
  /** Bumped on every on-disk change so open documents can re-sync. */
  changeSignal: number;
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
  refs: string;
  deployment: string;
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
  "refs",
  "deployment",
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
    refs: (item.refs ?? []).join(", "),
    deployment: item.deployment ?? "",
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
  const {
    item,
    board,
    items,
    knownIds,
    changeSignal,
    onClose,
    onNavigate,
    onSave,
    onDirtyChange,
  } = props;

  const [form, setForm] = useState<Snapshot>(() => snapOf(item));
  // The item as last read/written: saves diff against this, never against
  // the live prop — so a concurrent agent edit to a field the user never
  // touched is left alone instead of being clobbered.
  const baseline = useRef<Snapshot>(snapOf(item));
  const [tab, setTab] = useState<"ticket" | TicketDoc>("ticket");
  const [pendingTab, setPendingTab] = useState<"ticket" | TicketDoc | null>(null);
  const [docsInfo, setDocsInfo] = useState<TicketDocsInfo | null>(null);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [docDirty, setDocDirty] = useState(false);
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

  useEffect(() => {
    if (item.type !== "ticket") return;
    void window.kanmer.getDocsInfo(item.id).then(setDocsInfo);
  }, [item.id, item.updated, changeSignal, item.type]);

  // Doc tabs come from the ticket area's configured doc set (Phase 1), resolved
  // in the main process (core is node-only, so the renderer can't import it).
  useEffect(() => {
    if (item.type !== "ticket") {
      setDocTypes([]);
      return;
    }
    void window.kanmer.getDocTypes(item.id).then(setDocTypes);
  }, [item.id, item.area, item.type]);

  const dirtyKeys = useMemo(
    () => FIELD_KEYS.filter((k) => form[k] !== baseline.current[k]),
    [form],
  );
  const dirty = dirtyKeys.length > 0 || docDirty;

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
  const labelSuggestions = useMemo(
    () =>
      [...new Set(items.flatMap((i) => i.labels ?? []))].map((l) => ({ id: l })),
    [items],
  );
  const linkSuggestions = useMemo(
    () => items.filter((i) => i.id !== item.id).map((i) => ({ id: i.id, hint: i.title })),
    [items, item.id],
  );

  /** Build the diff patch: only fields where local ≠ baseline. */
  const buildPatch = (keys: FieldKey[]): UpdateItemPatch => {
    const patch: UpdateItemPatch = {};
    for (const k of keys) {
      if (k === "labels") patch.labels = splitList(form.labels);
      else if (k === "links") patch.links = splitList(form.links);
      else if (k === "refs") patch.refs = splitList(form.refs);
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

  // Ctrl+S saves from anywhere in the editor (ticket tab only; doc tabs
  // have their own save flow).
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

  /**
   * Tab switches lose the document editor's unsaved text (both the doc→doc
   * key change and the doc→Ticket unmount), so they are guarded where the
   * loss happens rather than by stretching App's item-level trySelect.
   */
  const tryTab = (next: "ticket" | TicketDoc) => {
    if (next !== tab && docDirty) setPendingTab(next);
    else setTab(next);
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

  const progressDoc = docTypes.find((d) => d.progress)?.id;
  const showDeployment = board.deployment !== undefined;
  const deploymentOptions = ["n/a", "not-deployed", ...(board.deployment?.environments ?? [])];

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={tab === "ticket" ? "modal editor-pop" : "modal editor-pop doc-full"}
        role="dialog"
        aria-label={`Ticket ${item.id}`}
        onClick={(e) => e.stopPropagation()}
      >
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

      {item.type === "ticket" && docsInfo && (
        <nav className="doc-tabs">
          <button
            className={tab === "ticket" ? "tab active" : "tab"}
            onClick={() => tryTab("ticket")}
          >
            Ticket
          </button>
          {docTypes.map((d) => (
            <button
              key={d.id}
              className={tab === d.id ? "tab active" : "tab"}
              onClick={() => tryTab(d.id)}
            >
              {d.name}
              {docsInfo.docs[d.id] && <span className="doc-dot" aria-label="exists" />}
              {d.id === progressDoc && docsInfo.checklist && (
                <span className="count">
                  {docsInfo.checklist.checked}/{docsInfo.checklist.total}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

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

      {pendingTab !== null && (
        <ConfirmModal
          message={`Discard changes to ${item.id} ${tab}.md?`}
          actionLabel="Discard"
          onCancel={() => setPendingTab(null)}
          onConfirm={() => {
            // Clear docDirty first: otherwise the outer `dirty` is still true
            // for the render in which the tab has already changed.
            setDocDirty(false);
            setTab(pendingTab);
            setPendingTab(null);
          }}
        />
      )}

      {tab !== "ticket" ? (
        <DocEditor
          key={`${item.id}:${tab}`}
          id={item.id}
          doc={tab}
          progressDoc={progressDoc}
          knownIds={knownIds}
          changeSignal={changeSignal}
          onDirty={setDocDirty}
          onNavigate={onNavigate}
        />
      ) : (
        <>
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

          <div className="field-row">
            <label className="field">
              <span>Assignee</span>
              <input value={form.assignee} onChange={(e) => set("assignee", e.target.value)} />
            </label>
            {showDeployment && (
              <label className="field">
                <span>Deployment</span>
                <select
                  value={form.deployment}
                  onChange={(e) => set("deployment", e.target.value)}
                >
                  <option value="">— unset —</option>
                  {deploymentOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {item.taken_at && (
            <div className="taken-note">
              ⛏ Taken {item.branch ? `on ${item.branch}` : ""}
              {item.worktree ? ` in ${item.worktree}` : ""} since{" "}
              {new Date(item.taken_at).toLocaleString()}
            </div>
          )}

          <div className="field">
            <span>Labels</span>
            <ChipInput
              value={splitList(form.labels)}
              onChange={(arr) => set("labels", arr.join(", "))}
              suggestions={labelSuggestions}
              placeholder="Add label…"
              ariaLabel="Labels"
            />
          </div>

          <div className="field">
            <span>Links</span>
            <ChipInput
              value={splitList(form.links)}
              onChange={(arr) => set("links", arr.join(", "))}
              suggestions={linkSuggestions}
              placeholder="Link an item id…"
              ariaLabel="Links"
            />
          </div>

          <div className="field">
            <span>Governing docs</span>
            <ChipInput
              value={splitList(form.refs)}
              onChange={(arr) => set("refs", arr.join(", "))}
              suggestions={[]}
              placeholder="docs/prd/…"
              ariaLabel="Governing document paths"
            />
            {splitList(form.refs).length > 0 && (
              <div className="refs-open">
                {splitList(form.refs).map((r) => (
                  <button
                    key={r}
                    className="chip link"
                    title="Open in the default app"
                    onClick={() => void window.kanmer.openRepoDoc(r)}
                  >
                    ↗ {r}
                  </button>
                ))}
              </div>
            )}
            {item.docs_todo && (
              <span className="hint">A governing doc is still to be created (docs_todo).</span>
            )}
          </div>

          {((item.commits?.length ?? 0) > 0 || (item.prs?.length ?? 0) > 0) && (
            <div className="field">
              <span>Traceability</span>
              <div className="trace-row">
                {(item.commits ?? []).map((c) => (
                  <span key={c} className="chip subtle" title="Commit">
                    ⎇ {c.slice(0, 10)}
                  </span>
                ))}
                {(item.prs ?? []).map((p) => (
                  <span key={p} className="chip subtle" title="Pull request">
                    ⇅ {p}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {graph &&
            (graph.links.length > 0 ||
              graph.backlinks.length > 0 ||
              graph.blocks.length > 0 ||
              graph.blockedBy.length > 0) && (
              <div className="links-panel">
                {graph.links.length > 0 && (
                  <LinkGroup title="Links to" ids={graph.links} onNavigate={onNavigate} />
                )}
                {graph.backlinks.length > 0 && (
                  <LinkGroup title="Linked from" ids={graph.backlinks} onNavigate={onNavigate} />
                )}
                {graph.blocks.length > 0 && (
                  <LinkGroup title="Blocks" ids={graph.blocks} onNavigate={onNavigate} />
                )}
                {graph.blockedBy.length > 0 && (
                  <LinkGroup title="Blocked by" ids={graph.blockedBy} onNavigate={onNavigate} />
                )}
              </div>
            )}

          <div className="editor-foot">
            <button className="primary" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? "Saving…" : dirtyKeys.length > 0 ? "Save changes" : "Saved"}
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function LinkGroup({
  title,
  ids,
  onNavigate,
}: {
  title: string;
  ids: string[];
  onNavigate: (id: string) => void;
}): JSX.Element {
  return (
    <div className="links-group">
      <span className="links-title">{title}</span>
      {ids.map((id) => (
        <button key={id} className="chip link" onClick={() => onNavigate(id)}>
          {id}
        </button>
      ))}
    </div>
  );
}

/**
 * One pipeline document: edit/preview/save whole-doc, with the checklist tab
 * rendering interactive checkboxes that write straight back to disk.
 */
function DocEditor({
  id,
  doc,
  progressDoc,
  knownIds,
  changeSignal,
  onDirty,
  onNavigate,
}: {
  id: string;
  doc: TicketDoc;
  progressDoc: TicketDoc | undefined;
  knownIds: Set<string>;
  changeSignal: number;
  onDirty: (dirty: boolean) => void;
  onNavigate: (id: string) => void;
}): JSX.Element {
  const [content, setContent] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = editing && text !== (content ?? "");
  // What the last save tried to write — "Overwrite anyway" re-issues exactly
  // that, which matters for the checklist toggle (its content never reaches
  // `text`).
  const lastAttempt = useRef("");

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);

  // Load — and re-sync on external changes while the user isn't editing.
  // `dirty` is in the deps on purpose: it flips true→false on Cancel and
  // after a save, which re-runs the load and re-syncs both content and the
  // version token. That is what closes the otherwise unbounded window in
  // which a cancelled edit left a stale token behind. It cannot loop — after
  // a load `dirty` is already false and does not change.
  useEffect(() => {
    if (dirty) return;
    void window.kanmer.getDoc(id, doc).then(({ content: c, version: v }) => {
      setContent(c);
      setVersion(v);
      setText(c ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, doc, changeSignal, dirty]);

  /**
   * Save the whole document. `expectedVersion` makes a concurrent write
   * (an agent over MCP, a second window) a visible conflict instead of a
   * silent overwrite; `force` re-issues the same save without it.
   */
  const saveDoc = async (next: string, force = false) => {
    lastAttempt.current = next;
    setSaving(true);
    try {
      const written = next.trim() ? `${next.trim()}\n` : next;
      const res = await window.kanmer.setDoc(
        id,
        doc,
        next,
        force ? undefined : { expectedVersion: version },
      );
      setContent(written);
      setText(written);
      setVersion(res.version);
      setConflict(null);
      setEditing(false);
    } catch (err) {
      // Keep `editing` — the user's text must survive the rejection.
      setConflict(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleCheckbox = async (boxIndex: number) => {
    if (content === null) return;
    let seen = -1;
    const next = content
      .split("\n")
      .map((line) => {
        const m = /^(\s*[-*]\s+\[)( |x|X)(\].*)$/.exec(line);
        if (!m) return line;
        seen++;
        if (seen !== boxIndex) return line;
        return `${m[1]}${m[2] === " " ? "x" : " "}${m[3]}`;
      })
      .join("\n");
    await saveDoc(next);
  };

  const conflictBanner =
    conflict === null ? null : (
      <div className="banner warn conflict-banner">
        <span>{conflict}</span>
        <div className="conflict-actions">
          <button
            className="ghost xs"
            onClick={() => {
              // dirty goes false, so the load effect re-runs and re-syncs.
              setConflict(null);
              setEditing(false);
            }}
          >
            Reload from disk
          </button>
          <button
            className="ghost xs"
            onClick={() => {
              setConflict(null);
              void saveDoc(lastAttempt.current, true);
            }}
          >
            Overwrite anyway
          </button>
        </div>
      </div>
    );

  if (content === null && !editing) {
    return (
      <div className="doc-empty">
        <p>No {doc}.md yet.</p>
        <button
          className="primary sm"
          onClick={() => {
            setText(`# ${id} ${doc}\n\n`);
            setEditing(true);
          }}
        >
          Create {doc}.md
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="doc-editor">
        {conflictBanner}
        <textarea
          className="body doc-body"
          value={text}
          spellCheck={false}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
        <div className="editor-foot">
          <button
            className="ghost sm"
            onClick={() => {
              setText(content ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </button>
          <button className="primary" disabled={saving} onClick={() => void saveDoc(text)}>
            {saving ? "Saving…" : `Save ${doc}.md`}
          </button>
        </div>
      </div>
    );
  }

  if (doc === progressDoc) {
    let boxIndex = -1;
    return (
      <div className="doc-editor">
        {conflictBanner}
        <div className="doc-view progress-view">
          {(content ?? "").split("\n").map((line, i) => {
            const m = /^(\s*)[-*]\s+\[( |x|X)\]\s?(.*)$/.exec(line);
            if (!m) return <div key={i} className="checklist-text">{line}</div>;
            boxIndex++;
            const idx = boxIndex;
            const checked = m[2] !== " ";
            return (
              <label key={i} className="checklist-item" style={{ paddingLeft: m[1].length * 8 }}>
                <input type="checkbox" checked={checked} onChange={() => void toggleCheckbox(idx)} />
                <span className={checked ? "done" : ""}>{m[3]}</span>
              </label>
            );
          })}
        </div>
        <div className="editor-foot">
          <button className="ghost sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-editor">
      {conflictBanner}
      <div
        className="preview markdown doc-view"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const href = target.tagName === "A" ? target.getAttribute("href") ?? "" : "";
          if (href.startsWith("kanmer:")) {
            e.preventDefault();
            onNavigate(href.slice("kanmer:".length));
          }
        }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content ?? "", knownIds) }}
      />
      <div className="editor-foot">
        <button className="ghost sm" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    </div>
  );
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
