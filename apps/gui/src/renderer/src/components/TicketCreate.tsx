import { useMemo, useState } from "react";
import type { BoardConfig, CreateItemInput, Item } from "@kanmer/core";
import { ChipInput } from "./ChipInput.js";

interface TicketCreateProps {
  board: BoardConfig;
  items: Item[];
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
export function TicketCreate({ board, items, onClose, onCreate }: TicketCreateProps): JSX.Element {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(board.statuses[0]?.id ?? "");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState(
    board.priorities.some((p) => p.id === "medium") ? "medium" : board.priorities[0]?.id ?? "",
  );
  const [assignee, setAssignee] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [refs, setRefs] = useState<string[]>([]);
  const [docsTodo, setDocsTodo] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const labelSuggestions = useMemo(
    () => [...new Set(items.flatMap((i) => i.labels ?? []))].map((l) => ({ id: l })),
    [items],
  );
  const linkSuggestions = useMemo(
    () => items.map((i) => ({ id: i.id, hint: i.title })),
    [items],
  );

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setFailed(false);
    const input: CreateItemInput = { type: "ticket", title: title.trim(), status, priority };
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
              {board.statuses.map((s) => (
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
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {board.priorities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Assignee</span>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </label>
        </div>

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
          <label className="check-row">
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
          <button className="primary" disabled={!title.trim() || busy} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
