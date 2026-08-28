import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UI_STAGES as STAGES } from "../../../shared/stages.js";

import type {
  BoardColumn,
  BoardConfig,
  DocType,
  GateReport,
  Item,
  LinkGraph,
  TicketDoc,
  TicketDocsInfo,
  UpdateItemPatch,
} from "@kanmer/core";
import { useClient } from "../lib/client.js";
import {
  cloneRequirementMap,
  CustomRequiresEditor,
  requirementErrors,
  vocabularyFromModel,
  type RequirementMap,
} from "./CustomRequiresEditor.js";
import type { Vocabulary } from "../lib/profileDraft.js";

/** The shipped profiles plus custom — the picker's options (FRD-002 P2/P3, FRD-032). */
const PROFILE_IDS = ["feature", "fix", "chore", "spike", "capture", "custom"] as const;
import { progressDocId } from "../lib/docProgress.js";
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
  /** Ephemeral presentation guidance; it never changes ticket workflow data. */
  mode?: EditorMode;
  /** A gate-feedback action may request a specific document tab on open. */
  initialDoc?: string;
  onModeChange?: (mode: EditorMode) => void;
}

/** The editable fields, as flat strings (lists joined for the inputs). */
interface Snapshot {
  title: string;
  status: string;
  area: string;
  profile: string;
  assignee: string;
  labels: string;
  links: string;
  refs: string;
  deployment: string;
  body: string;
  requires: RequirementMap;
  /** The `updated` stamp this snapshot came from — the conflict reference. */
  updated: string;
}

const FIELD_KEYS = [
  "title",
  "status",
  "area",
  "profile",
  "assignee",
  "labels",
  "links",
  "refs",
  "deployment",
  "body",
  "requires",
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];
type EditorTab = "ticket" | "scratch" | TicketDoc;
export type EditorMode = "approval" | "execution" | "review" | "evidence";

/** The exact pipeline paths core exposes, grouped by their top-level type. */
export function documentPathsByType(
  paths: readonly string[],
  types: readonly string[],
): Record<string, string[]> {
  const allowed = new Set(types);
  const grouped: Record<string, string[]> = {};
  for (const path of paths) {
    const slash = path.indexOf("/");
    if (slash <= 0) continue;
    const type = path.slice(0, slash);
    if (!allowed.has(type)) continue;
    (grouped[type] ??= []).push(path);
  }
  for (const values of Object.values(grouped)) values.sort();
  return grouped;
}

/** Prefer a type's conventional index, then the first existing path. */
export function preferredDocumentPath(type: string, paths: readonly string[]): string {
  const index = `${type}/${type}.md`;
  return paths.includes(index) ? index : paths[0] ?? index;
}

function documentLabel(doc: string): string {
  return doc.endsWith(".md") ? doc : `${doc}.md`;
}

export const EDITOR_MODES: ReadonlyArray<{ id: EditorMode; label: string; description: string }> = [
  { id: "approval", label: "Approval", description: "Ticket and group context" },
  { id: "execution", label: "Execution", description: "Plan" },
  { id: "review", label: "Review", description: "Scratch" },
  { id: "evidence", label: "Evidence", description: "Proof" },
];

export function startingTabForMode(mode: EditorMode): EditorTab {
  return { approval: "ticket", execution: "plan", review: "scratch", evidence: "proof" }[mode];
}
type GroupContext =
  | { state: "loading"; group: string }
  | { state: "ready"; group: string; content: string }
  | { state: "missing"; group: string }
  | { state: "error"; group: string; error: string };

function snapOf(item: Item): Snapshot {
  return {
    title: item.title,
    status: item.status,
    area: item.area,
    profile: item.profile ?? "",
    assignee: item.assignee,
    labels: (item.labels ?? []).join(", "),
    links: (item.links ?? []).join(", "),
    refs: (item.refs ?? []).join(", "),
    deployment: item.deployment ?? "",
    body: item.body,
    requires: cloneRequirementMap(item.requires),
    updated: item.updated,
  };
}

function fieldEqual(a: Snapshot, b: Snapshot, key: FieldKey): boolean {
  return key === "requires" ? JSON.stringify(a.requires) === JSON.stringify(b.requires) : a[key] === b[key];
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
    mode = "approval",
    initialDoc,
    onModeChange,
  } = props;

  const client = useClient();
  const [form, setForm] = useState<Snapshot>(() => snapOf(item));
  // The item as last read/written: saves diff against this, never against
  // the live prop — so a concurrent agent edit to a field the user never
  // touched is left alone instead of being clobbered.
  const baseline = useRef<Snapshot>(snapOf(item));
  const [tab, setTab] = useState<EditorTab>(() => startingTabForMode(mode));
  const [pendingTab, setPendingTab] = useState<{
    tab: EditorTab;
    scratchSlug?: string;
    docPath?: string;
    mode?: EditorMode;
  } | null>(null);
  const appliedMode = useRef<{ id: string; mode: EditorMode }>({ id: item.id, mode });
  const [docsInfo, setDocsInfo] = useState<TicketDocsInfo | null>(null);
  const [selectedDocPaths, setSelectedDocPaths] = useState<Record<string, string>>({});
  const [scratchSlug, setScratchSlug] = useState<string | null>(null);
  const [newScratchSlug, setNewScratchSlug] = useState("");
  const [scratchError, setScratchError] = useState<string | null>(null);
  const [groupContext, setGroupContext] = useState<GroupContext | null>(null);
  const scratchNotes = docsInfo?.scratch ?? [];
  /** Reference upload: drag-over highlight, in-flight flag, remove confirmation. */
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);
  const [vocabularyError, setVocabularyError] = useState<string | null>(null);
  /** The core gate report — what this ticket owes, and what it already has. */
  const [gates, setGates] = useState<GateReport | null>(null);
  const [docDirty, setDocDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [graph, setGraph] = useState<LinkGraph | null>(null);
  const [conflict, setConflict] = useState<{ fields: FieldKey[]; theirs: Partial<Snapshot> } | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const initialDocApplied = useRef<string | null>(null);

  // Wiki-link autocomplete state.
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [suggest, setSuggest] = useState<{ from: number; caret: number; query: string } | null>(
    null,
  );
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    void client.getLinks(item.id).then(setGraph);
  }, [item.id, item.updated]);

  const refreshDocsInfo = useCallback(async () => {
    setDocsInfo(await client.getDocsInfo(item.id));
  }, [client, item.id]);

  useEffect(() => {
    if (item.type !== "ticket") return;
    void client.getDocsInfo(item.id).then(setDocsInfo);
  }, [item.id, item.updated, changeSignal, item.type]);

  useEffect(() => {
    const slugs = scratchNotes;
    setScratchSlug((current) =>
      current && slugs.includes(current) ? current : slugs.includes("review") ? "review" : slugs[0] ?? null,
    );
  }, [scratchNotes]);

  useEffect(() => {
    const group = item.groups?.[0];
    if (!group) {
      setGroupContext(null);
      return;
    }
    let cancelled = false;
    setGroupContext({ state: "loading", group });
    void client
      .getGroupDoc(group, "context.md")
      .then((content) => {
        if (!cancelled) setGroupContext(content === null ? { state: "missing", group } : { state: "ready", group, content });
      })
      .catch((err: unknown) => {
        if (!cancelled) setGroupContext({ state: "error", group, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, item.id, item.groups?.[0], item.updated, changeSignal]);

  /**
   * Copy files into the ticket's `reference/` folder, one at a time.
   *
   * Sequential rather than parallel: core suffixes a colliding name, and two
   * concurrent copies of the same filename would race on the collision check
   * and both resolve to the same suffix.
   */
  const addReferences = useCallback(
    async (paths: string[]) => {
      setUploading(true);
      setRefError(null);
      try {
        for (const p of paths) await client.addReference(item.id, p);
        await refreshDocsInfo();
      } catch (err) {
        setRefError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [client, item.id, refreshDocsInfo],
  );

  // Doc tabs come from the ticket area's configured doc set (Phase 1), resolved
  // in the main process (core is node-only, so the renderer can't import it).
  useEffect(() => {
    if (item.type !== "ticket") {
      setDocTypes([]);
      return;
    }
    void client.getDocTypes(item.id).then(setDocTypes);
  }, [item.id, item.area, item.type]);

  useEffect(() => {
    if (item.type !== "ticket") {
      setVocabulary(null);
      setVocabularyError(null);
      return;
    }
    let cancelled = false;
    setVocabulary(null);
    setVocabularyError(null);
    if (typeof client.getDocModel !== "function") {
      setVocabularyError("The project document model is unavailable.");
      return () => {
        cancelled = true;
      };
    }
    void client
      .getDocModel()
      .then((model) => {
        if (!cancelled) setVocabulary(vocabularyFromModel(model, board));
      })
      .catch((error: unknown) => {
        if (!cancelled) setVocabularyError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [board, client, item.id, item.type]);

  const pathsByType = useMemo(
    () => documentPathsByType(docsInfo?.documentPaths ?? [], docTypes.map((d) => d.id)),
    [docsInfo?.documentPaths, docTypes],
  );

  // Keep a selected exact path stable across inventory refreshes. While the
  // document editor is dirty, defer reconciliation so an agent's inventory
  // update cannot unmount the editor and discard the user's text.
  useEffect(() => {
    if (docDirty) return;
    setSelectedDocPaths((current) => {
      let changed = false;
      const next = { ...current };
      for (const type of docTypes.map((d) => d.id)) {
        const preferred = preferredDocumentPath(type, pathsByType[type] ?? []);
        if (!pathsByType[type]?.includes(current[type] ?? "")) {
          if (next[type] !== preferred) changed = true;
          next[type] = preferred;
        }
      }
      return changed ? next : current;
    });
  }, [docDirty, docTypes, pathsByType]);

  const dirtyKeys = useMemo(
    () => FIELD_KEYS.filter((k) => !fieldEqual(form, baseline.current, k)),
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
    const touched = FIELD_KEYS.filter((k) => !fieldEqual(prev, baseline.current, k));
    const conflicts = touched.filter(
      (k) => !fieldEqual(incoming, baseline.current, k) && !fieldEqual(incoming, prev, k),
    );
    const next: Snapshot = { ...incoming };
    for (const k of touched) Object.assign(next, { [k]: k === "requires" ? cloneRequirementMap(prev.requires) : prev[k] });
    baseline.current = incoming;
    setForm(next);
    if (conflicts.length > 0) {
      setConflict({
        fields: conflicts,
        theirs: Object.fromEntries(conflicts.map((k) => [k, incoming[k]])),
      });
    }
  }, [item]);

  const statusOpts = withCurrent(STAGES.map((s) => ({ id: s.id, name: s.name, color: s.color })), item.status);
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
      else if (k === "requires" && form.profile === "custom") patch.requires = cloneRequirementMap(form.requires);
      else if (k === "requires") continue;
      else patch[k] = form[k];
    }
    return patch;
  };

  const save = async () => {
    const keys = FIELD_KEYS.filter((k) => !fieldEqual(form, baseline.current, k));
    if (keys.length === 0) return;
    if (form.profile === "custom") {
      if (!vocabulary) {
        setSaveError(vocabularyError ?? "Requirement vocabulary is still loading.");
        return;
      }
      const errors = requirementErrors(form.requires, vocabulary);
      if (Object.keys(errors).length > 0) {
        setSaveError(Object.values(errors).flat().join(" "));
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    try {
      // Close the watcher-debounce race: check the file just before writing.
      const fresh = await client.getItem(item.id);
      if (fresh && fresh.updated !== baseline.current.updated) {
        const incoming = snapOf(fresh);
        const conflicts = keys.filter(
          (k) => !fieldEqual(incoming, baseline.current, k) && !fieldEqual(incoming, form, k),
        );
        setForm((prev) => {
          const next: Snapshot = { ...incoming };
          for (const k of keys) Object.assign(next, { [k]: k === "requires" ? cloneRequirementMap(prev.requires) : prev[k] });
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
  const activeDocPath =
    tab !== "ticket" && tab !== "scratch"
      ? selectedDocPaths[tab] ?? preferredDocumentPath(tab, pathsByType[tab] ?? [])
      : undefined;

  const tryTab = (
    next: EditorTab,
    nextScratchSlug?: string,
    nextMode?: EditorMode,
    nextDocPath?: string,
  ) => {
    const changesDocument =
      next !== tab ||
      (next === "scratch" && nextScratchSlug !== scratchSlug) ||
      (next !== "ticket" && next !== "scratch" && nextDocPath !== undefined && nextDocPath !== activeDocPath);
    if (changesDocument && docDirty) {
      setPendingTab({ tab: next, scratchSlug: nextScratchSlug, docPath: nextDocPath, mode: nextMode });
    }
    else {
      setTab(next);
      if (next === "scratch" && nextScratchSlug !== undefined) setScratchSlug(nextScratchSlug);
      if (next !== "ticket" && next !== "scratch" && nextDocPath !== undefined) {
        setSelectedDocPaths((current) => ({ ...current, [next]: nextDocPath }));
      }
      if (nextMode) onModeChange?.(nextMode);
    }
  };

  // Gate feedback can open this editor while it is already mounted. Wait for
  // the document inventory before selecting the requested tab so a missing
  // document reaches DocEditor's existing Create affordance.
  useEffect(() => {
    if (!initialDoc || !docsInfo || initialDocApplied.current === initialDoc) return;
    if (!docTypes.some((doc) => doc.id === initialDoc)) return;
    initialDocApplied.current = initialDoc;
    tryTab(initialDoc);
  }, [docTypes, docsInfo, initialDoc]);

  const requestMode = (nextMode: EditorMode) => {
    if (nextMode !== mode) tryTab(startingTabForMode(nextMode), undefined, nextMode);
  };

  useEffect(() => {
    const previous = appliedMode.current;
    if (previous.id !== item.id || previous.mode !== mode) {
      appliedMode.current = { id: item.id, mode };
      setTab(startingTabForMode(mode));
    }
  }, [item.id, mode]);

  const tabClass = (id: EditorTab) => {
    const emphasis = id === startingTabForMode(mode) ? "mode-primary" : "mode-secondary";
    return tab === id ? `tab active ${emphasis}` : `tab ${emphasis}`;
  };

  const createScratch = () => {
    const slug = newScratchSlug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setScratchError("Use a lowercase kebab-case note name.");
      return;
    }
    if ((docsInfo?.scratch ?? []).includes(slug)) {
      setScratchError("That scratch note already exists.");
      return;
    }
    setScratchError(null);
    setNewScratchSlug("");
    tryTab("scratch", slug);
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

  // Re-read on every disk change and after a save: a document written in
  // another tab, or by an agent, must move the readiness rows without a reload.
  useEffect(() => {
    if (item.type !== "ticket") return;
    let cancelled = false;
    void client
      .getGates(item.id)
      .then((g) => {
        if (!cancelled) setGates(g);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client, item.id, item.status, item.profile, changeSignal, docsInfo]);

  const progressDoc = progressDocId(docTypes);
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
        <label className="editor-mode">
          <span className="sr-only">Editor mode</span>
          <select aria-label="Editor mode" value={mode} onChange={(e) => requestMode(e.target.value as EditorMode)}>
            {EDITOR_MODES.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
          </select>
        </label>
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
            className={tabClass("ticket")}
            onClick={() => tryTab("ticket")}
          >
            Ticket
          </button>
          <button className={tabClass("scratch")} onClick={() => tryTab("scratch")}>
            Scratch
            {scratchNotes.length > 0 && <span className="count">{scratchNotes.length}</span>}
          </button>
          {docTypes.map((d) => (
            <button
              key={d.id}
              className={tabClass(d.id)}
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

      {item.type === "ticket" && docsInfo && (
        <section
          className={dragging ? "references dropping" : "references"}
          aria-label="Reference files"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            // Electron exposes the real filesystem path on dropped files;
            // a browser would not, which is why this works here and only here.
            const paths = [...e.dataTransfer.files]
              .map((f) => (f as File & { path?: string }).path)
              .filter((v): v is string => Boolean(v));
            if (paths.length) void addReferences(paths);
          }}
        >
          <div className="editor-actions">
            <strong>Attachments</strong>
            <span className="hint">
              inputs to the work — never satisfy a document gate
            </span>
            <span className="spacer" />
            <button
              className="ghost sm"
              disabled={uploading}
              onClick={() => {
                void client
                  .pickReferences()
                  .then((paths) => (paths.length ? addReferences(paths) : undefined))
                  .catch((e) => setRefError(String(e)));
              }}
            >
              {uploading ? "Adding…" : "Add files…"}
            </button>
          </div>

          {refError && <p className="error">{refError}</p>}

          {docsInfo.references.length === 0 ? (
            <p className="hint">
              Drop a mockup, spec or log here, or use Add files. They live in the
              ticket&rsquo;s <code>reference/</code> folder and agents can read them.
            </p>
          ) : (
            <ul className="reference-list">
              {docsInfo.references.map((r) => (
                <li key={r.name}>
                  <button className="linkish" onClick={() => void client.openReference(item.id, r.name)}>
                    {r.name}
                  </button>
                  {pendingRemove === r.name ? (
                    <>
                      <span className="hint">Delete {r.name}? This cannot be undone.</span>
                      <button
                        className="danger xs"
                        onClick={() => {
                          setPendingRemove(null);
                          void client
                            .removeReference(item.id, r.name)
                            .then(refreshDocsInfo)
                            .catch((e) => setRefError(String(e)));
                        }}
                      >
                        Delete
                      </button>
                      <button className="ghost xs" onClick={() => setPendingRemove(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button className="ghost xs" onClick={() => setPendingRemove(r.name)}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
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
          message={`Discard changes to ${item.id} ${documentLabel(tab === "ticket" ? "ticket" : tab === "scratch" ? `scratch/${scratchSlug ?? ""}` : activeDocPath ?? tab)}?`}
          actionLabel="Discard"
          onCancel={() => setPendingTab(null)}
          onConfirm={() => {
            // Clear docDirty first: otherwise the outer `dirty` is still true
            // for the render in which the tab has already changed.
            setDocDirty(false);
            setTab(pendingTab.tab);
            if (pendingTab.mode) onModeChange?.(pendingTab.mode);
            if (pendingTab.tab === "scratch" && pendingTab.scratchSlug !== undefined) {
              setScratchSlug(pendingTab.scratchSlug);
            }
            if (pendingTab.tab !== "ticket" && pendingTab.tab !== "scratch" && pendingTab.docPath !== undefined) {
              setSelectedDocPaths((current) => ({ ...current, [pendingTab.tab]: pendingTab.docPath! }));
            }
            setPendingTab(null);
          }}
        />
      )}

      {tab === "scratch" ? (
        <section className="scratch-panel" aria-label="Scratch notes">
          <div className="scratch-head">
            <div>
              <strong>Scratch notes</strong>
              <p className="hint">Working material only — scratch never satisfies a document gate.</p>
            </div>
            <div className="scratch-create">
              <input aria-label="New scratch note name" value={newScratchSlug} onChange={(e) => { setNewScratchSlug(e.target.value); setScratchError(null); }} placeholder="new-note" />
              <button className="ghost sm" onClick={createScratch}>New note</button>
            </div>
          </div>
          {scratchError && <p className="error">{scratchError}</p>}
          {scratchNotes.length > 0 && (
            <div className="scratch-list" aria-label="Existing scratch notes">
              {scratchNotes.map((slug) => (
                <button key={slug} className={slug === scratchSlug ? "chip link active" : "chip link"} onClick={() => tryTab("scratch", slug)}>
                  {slug}
                </button>
              ))}
            </div>
          )}
          {scratchSlug ? (
            <DocEditor key={`${item.id}:scratch/${scratchSlug}`} id={item.id} doc={`scratch/${scratchSlug}`} progressDoc={undefined} knownIds={knownIds} changeSignal={changeSignal} onDirty={setDocDirty} onNavigate={onNavigate} onSaved={refreshDocsInfo} />
          ) : (
            <p className="doc-empty">No scratch notes yet. Add a safe lowercase-kebab name to draft one.</p>
          )}
        </section>
      ) : tab !== "ticket" ? (
        <>
          <DocumentPathSelector
            type={tab}
            paths={pathsByType[tab] ?? []}
            selected={activeDocPath ?? preferredDocumentPath(tab, pathsByType[tab] ?? [])}
            onSelect={(path) => tryTab(tab, undefined, undefined, path)}
          />
          <DocEditor
            key={`${item.id}:${activeDocPath ?? tab}`}
            id={item.id}
            doc={activeDocPath ?? preferredDocumentPath(tab, pathsByType[tab] ?? [])}
            progressDoc={progressDoc}
            knownIds={knownIds}
            changeSignal={changeSignal}
            onDirty={setDocDirty}
            onNavigate={onNavigate}
            onSaved={refreshDocsInfo}
          />
        </>
      ) : (
        <>
          {gates && <ReadinessPanel gates={gates} onOpenDoc={(t) => tryTab(t)} />}
          {groupContext && (
            <section className="group-context-pane" aria-label={`Shared context for ${groupContext.group}`}>
              <strong>Shared context — {groupContext.group}</strong>
              {groupContext.state === "loading" && <p className="hint">Loading context…</p>}
              {groupContext.state === "missing" && <p className="hint">No context.md is available for {groupContext.group}. Open the group to add shared context.</p>}
              {groupContext.state === "error" && <p className="error">Could not load context: {groupContext.error}</p>}
              {groupContext.state === "ready" && <div className="markdown group-context-markdown" onClick={onPreviewClick} dangerouslySetInnerHTML={{ __html: renderMarkdown(groupContext.content, knownIds) }} />}
            </section>
          )}
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
              <span>Profile</span>
              {/* What this ticket owes at each boundary. Changing it re-gates
                  immediately — the readiness panel below updates with it. */}
              <select value={form.profile} onChange={(e) => set("profile", e.target.value)}>
                <option value="">— inherit —</option>
                {PROFILE_IDS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
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
          </div>

          {form.profile === "custom" && vocabulary && (
            <CustomRequiresEditor
              value={form.requires}
              vocabulary={vocabulary}
              onChange={(requires) => setForm((current) => ({ ...current, requires }))}
            />
          )}
          {form.profile === "custom" && !vocabulary && (
            <div className="custom-requires" role="status">
              {vocabularyError ? `Could not load requirement vocabulary: ${vocabularyError}` : "Loading custom requirements…"}
            </div>
          )}

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
            <button
              type="button"
              className="ghost xs"
              onClick={async () => {
                const picked = await client.pickRepoDoc();
                if (!picked) return;
                const cur = splitList(form.refs);
                if (!cur.includes(picked)) set("refs", [...cur, picked].join(", "));
              }}
            >
              Browse…
            </button>
            {splitList(form.refs).length > 0 && (
              <div className="refs-open">
                {splitList(form.refs).map((r) => (
                  <button
                    key={r}
                    className="chip link"
                    title="Open in the default app"
                    onClick={() => void client.openRepoDoc(r)}
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

function DocumentPathSelector({
  type,
  paths,
  selected,
  onSelect,
}: {
  type: string;
  paths: string[];
  selected: string;
  onSelect: (path: string) => void;
}): JSX.Element {
  const relative = (path: string) => path.startsWith(`${type}/`) ? path.slice(type.length + 1) : path;
  return (
    <nav className="document-paths" aria-label={`${type} document paths`}>
      <span className="document-paths-label">Files</span>
      {paths.length === 0 ? (
        <span className="document-paths-empty">No saved {type} files yet; the index path is ready to create.</span>
      ) : (
        <div className="document-path-list" role="list">
          {paths.map((path) => (
            <div key={path} role="listitem">
              <button
                type="button"
                className={path === selected ? "chip link active" : "chip link"}
                aria-label={path}
                aria-pressed={path === selected}
                title={path}
                onClick={() => onSelect(path)}
              >
                {relative(path)}
              </button>
            </div>
          ))}
        </div>
      )}
    </nav>
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
  onSaved,
}: {
  id: string;
  doc: TicketDoc;
  progressDoc: TicketDoc | undefined;
  knownIds: Set<string>;
  changeSignal: number;
  onDirty: (dirty: boolean) => void;
  onNavigate: (id: string) => void;
  onSaved?: () => Promise<void> | void;
}): JSX.Element {
  const client = useClient();
  const [content, setContent] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = editing && text !== (content ?? "");
  const label = documentLabel(doc);
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
    void client.getDoc(id, doc).then(({ content: c, version: v }) => {
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
      const res = await client.setDoc(
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
      await onSaved?.();
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
        <p>No {label} yet.</p>
        <button
          className="primary sm"
          onClick={() => {
            setText(`# ${id} ${label}\n\n`);
            setEditing(true);
          }}
        >
          Create {label}
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
            {saving ? "Saving…" : `Save ${label}`}
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


/**
 * What this ticket owes, per boundary (FRD-002 S2).
 *
 * Every row comes from the core resolver — the renderer computes none of it,
 * because it cannot import core at runtime and, more importantly, a second
 * implementation of the rules is exactly what ADR-0009 exists to prevent.
 * Clicking an unmet requirement opens that document's tab, so the panel is a
 * to-do list rather than a report.
 */
function ReadinessPanel({
  gates,
  onOpenDoc,
}: {
  gates: GateReport;
  onOpenDoc: (docType: string) => void;
}): JSX.Element | null {
  if (!gates.boundaries.length) {
    return (
      <p className="hint readiness-none">
        Profile <code>{gates.profile}</code> asks nothing of this ticket — it can move freely.
      </p>
    );
  }
  return (
    <section className="readiness" aria-label="Requirements">
      <header>
        <span>
          Profile <code>{gates.profile}</code>
        </span>
      </header>
      {gates.boundaries.map((b) => (
        <div key={b.boundary} className={b.passable ? "gate ok" : "gate unmet"}>
          <span className="gate-label">{b.label}</span>
          <span className="gate-reqs">
            {b.requirements.map((r) => (
              <button
                key={r.requirement}
                type="button"
                className={r.satisfied ? "req met" : "req missing"}
                title={
                  r.satisfied
                    ? `${r.requirement} — satisfied`
                    : `${r.requirement} — open the tab to write it`
                }
                onClick={() => onOpenDoc(r.type)}
              >
                {r.satisfied ? "✓" : "○"} {r.requirement}
              </button>
            ))}
          </span>
        </div>
      ))}
      {gates.warnings.map((w) => (
        <p key={w} className="hint warn-note">
          {w}
        </p>
      ))}
    </section>
  );
}
