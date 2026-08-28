import { useEffect, useMemo, useState } from "react";
import { UI_FIRST_STAGE as FIRST_STAGE, UI_STAGES as STAGES } from "../../../shared/stages.js";

/** The shipped profiles plus custom — the picker's options (FRD-002 P2/P3, FRD-032). */
const PROFILE_IDS = ["feature", "fix", "chore", "spike", "capture", "custom"] as const;
import type { BoardConfig, CreateItemInput, Item } from "@kanmer/core";
import { ChipInput } from "./ChipInput.js";
import { useClient } from "../lib/client.js";
import {
  cloneRequirementMap,
  CustomRequiresEditor,
  requirementErrors,
  vocabularyFromModel,
  type RequirementMap,
} from "./CustomRequiresEditor.js";
import type { Vocabulary } from "../lib/profileDraft.js";

interface TicketCreateProps {
  board: BoardConfig;
  items: Item[];
  /** Preferred initial area/priority (Phase 4.4); used only when on this board. */
  defaultArea?: string;
  onClose: () => void;
  /** Create the ticket; resolves with the created item, or null on failure. */
  onCreate: (input: CreateItemInput) => Promise<Item | null>;
}

/**
 * The full add-ticket dialog (request #15): every CreateItemInput field, plus a
 * governing-docs row (refs + a "new doc needed" flag → docs_todo) so a
 * GUI-created ticket isn't stranded by the standard leave-backlog gate. The
 * per-column inline QuickAdd stays as the one-field fast path.
 */
export function TicketCreate({
  board,
  items,
  defaultArea = "",
  onClose,
  onCreate,
}: TicketCreateProps): JSX.Element {
  const client = useClient();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>(FIRST_STAGE);
  const [area, setArea] = useState(
    board.areas.some((a) => a.id === defaultArea) ? defaultArea : "",
  );
  // Profile decides what this ticket will owe at each stage boundary; empty
  // means inherit (area default, then board default).
  const [profile, setProfile] = useState("");
  const [requires, setRequires] = useState<RequirementMap>({});
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);
  const [vocabularyError, setVocabularyError] = useState<string | null>(null);
  const [assignee, setAssignee] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [refs, setRefs] = useState<string[]>([]);
  const [docsTodo, setDocsTodo] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
  }, [board, client]);

  const customErrors = vocabulary ? requirementErrors(requires, vocabulary) : {};
  const customInvalid = profile === "custom" && (vocabulary === null || Object.keys(customErrors).length > 0);

  const labelSuggestions = useMemo(
    () => [...new Set(items.flatMap((i) => i.labels ?? []))].map((l) => ({ id: l })),
    [items],
  );
  const linkSuggestions = useMemo(
    () => items.map((i) => ({ id: i.id, hint: i.title })),
    [items],
  );

  const submit = async () => {
    if (!title.trim() || busy || customInvalid) return;
    setBusy(true);
    setFailed(false);
    const input: CreateItemInput = { type: "ticket", title: title.trim(), status };
    if (profile) input.profile = profile;
    if (profile === "custom") input.requires = cloneRequirementMap(requires);
    if (area) input.area = area;
    if (assignee.trim()) input.assignee = assignee.trim();
    if (labels.length) input.labels = labels;
    if (links.length) input.links = links;
    if (refs.length) input.refs = refs;
    if (docsTodo) input.docs_todo = true;
    if (body.trim()) input.body = body;
    const created = await onCreate(input);
    // onCreate surfaces its own error banner; keep the dialog open on failure.
    if (!created) {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal ticket-create"
        role="dialog"
        aria-label="New ticket"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="modal-head">
          <h2>New ticket</h2>
        </div>

        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
            }}
            placeholder="What needs doing?"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Stage</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Area</span>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">— none —</option>
              {board.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Profile</span>
            <select value={profile} onChange={(e) => setProfile(e.target.value)}>
              <option value="">— inherit —</option>
              {PROFILE_IDS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Assignee</span>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </label>
        </div>

        {profile === "custom" && vocabulary && (
          <CustomRequiresEditor value={requires} vocabulary={vocabulary} onChange={setRequires} />
        )}
        {profile === "custom" && !vocabulary && (
          <div className="custom-requires" role="status">
            {vocabularyError ? `Could not load requirement vocabulary: ${vocabularyError}` : "Loading custom requirements…"}
          </div>
        )}

        <div className="field">
          <span>Labels</span>
          <ChipInput
            value={labels}
            onChange={setLabels}
            suggestions={labelSuggestions}
            placeholder="Add label…"
            ariaLabel="Labels"
          />
        </div>

        <div className="field">
          <span>Links</span>
          <ChipInput
            value={links}
            onChange={setLinks}
            suggestions={linkSuggestions}
            placeholder="Link an item id…"
            ariaLabel="Links"
          />
        </div>

        <div className="field">
          <span>Governing docs</span>
          <ChipInput
            value={refs}
            onChange={setRefs}
            suggestions={[]}
            placeholder="docs/prd/…"
            ariaLabel="Governing document paths"
          />
          <button
            type="button"
            className="ghost xs"
            onClick={async () => {
              const picked = await client.pickRepoDoc();
              if (picked && !refs.includes(picked)) setRefs([...refs, picked]);
            }}
          >
            Browse…
          </button>
          <label className="check">
            <input type="checkbox" checked={docsTodo} onChange={(e) => setDocsTodo(e.target.checked)} />
            <span>New PRD/FRD/ADR still needed (docs_todo)</span>
          </label>
          <span className="hint">
            Link a governing doc or tick the box, or the ticket can&apos;t leave Backlog.
          </span>
        </div>

        <div className="field">
          <span>Body</span>
          <textarea
            className="body"
            value={body}
            spellCheck={false}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Markdown… reference other items with [[TICK-001]]"
          />
        </div>

        {failed && <div className="banner error">Couldn&apos;t create the ticket — see the message above the board.</div>}

        <div className="confirm-actions">
          <button className="ghost sm" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={!title.trim() || busy || customInvalid} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
