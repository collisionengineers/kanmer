import { useCallback, useEffect, useState } from "react";
import type { GroupWithMembers } from "@kanmer/core";
import { UI_STAGES, uiStageName } from "../../../shared/stages.js";
import { useClient } from "../lib/client.js";
import { renderMarkdown } from "../lib/markdown.js";

/** Group prose is not ticket prose: no [[ID]] resolution to do here. */
const NO_IDS: Set<string> = new Set();

/**
 * A group's detail view (FRD-001 G8): its goal, its shared context, and the
 * members derived from the tickets that name it.
 *
 * The member table and the progress bar are read-only by construction —
 * membership lives on tickets, so the only way to change it here would be to go
 * and edit a ticket. That is deliberate: a UI that let you drag a ticket "into"
 * a group would imply the group owns the list, which is exactly the model
 * ADR-0001 rejects.
 */
export function GroupView({
  id,
  onClose,
  onOpenTicket,
}: {
  id: string;
  onClose: () => void;
  onOpenTicket: (ticketId: string) => void;
}): JSX.Element {
  const client = useClient();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [context, setContext] = useState<string>("");
  const [editingContext, setEditingContext] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, ctx] = await Promise.all([client.getGroup(id), client.getGroupDoc(id, "context.md")]);
      setGroup(g);
      setContext(ctx ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [client, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!group) {
    return (
      <aside className="editor group-view">
        <p className="hint">{error ?? "Loading…"}</p>
        <button className="ghost sm" onClick={onClose}>
          Close
        </button>
      </aside>
    );
  }

  const pct = group.total ? Math.round((group.complete / group.total) * 100) : 0;

  return (
    <aside className="editor group-view" aria-label={`Group ${group.id}`}>
      <div className="editor-actions">
        <strong>{group.id}</strong>
        <span className="chip subtle">{group.kind}</span>
        {group.archived && <span className="chip subtle">archived</span>}
        <span className="spacer" />
        <button
          className="ghost sm"
          onClick={() => {
            void client
              .updateGroup(id, { archived: !group.archived })
              .then(load)
              .catch((e) => setError(String(e)));
          }}
        >
          {group.archived ? "Unarchive" : "Archive"}
        </button>
        <button className="ghost sm" onClick={onClose}>
          Close
        </button>
      </div>

      <h2>{group.title || group.id}</h2>
      {group.body && (
        <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(group.body, NO_IDS) }} />
      )}

      {error && <div className="banner warn">{error}</div>}

      <section className="group-progress" aria-label="Progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="hint">
          {group.complete} of {group.total} done
          {group.members.length !== group.total &&
            ` · ${group.members.length - group.total} archived`}
        </p>
        <div className="stage-counts">
          {UI_STAGES.map((s) => (
            <span key={s.id} className="chip subtle" title={s.name}>
              {s.name}: {group.progress[s.id] ?? 0}
            </span>
          ))}
        </div>
      </section>

      <section aria-label="Shared context">
        <div className="editor-actions">
          <strong>Shared context</strong>
          <span className="spacer" />
          {editingContext ? (
            <>
              <button
                className="primary sm"
                onClick={() => {
                  void client
                    .setGroupDoc(id, "context.md", draft)
                    .then(() => {
                      setEditingContext(false);
                      return load();
                    })
                    .catch((e) => setError(String(e)));
                }}
              >
                Save
              </button>
              <button className="ghost sm" onClick={() => setEditingContext(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button
              className="ghost sm"
              onClick={() => {
                setDraft(context);
                setEditingContext(true);
              }}
            >
              Edit
            </button>
          )}
        </div>
        {editingContext ? (
          <textarea
            className="group-context"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="The constraint or decision every member sits under. Agents working any member ticket read this."
          />
        ) : context ? (
          <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(context, NO_IDS) }} />
        ) : (
          <p className="hint">
            No shared context yet. This is where the decision that binds these tickets belongs, so
            each one does not have to repeat it.
          </p>
        )}
      </section>

      <section aria-label="Members">
        <strong>Members</strong>
        {group.members.length === 0 ? (
          <p className="hint">
            No tickets name this group yet. Add one from a ticket&rsquo;s Groups field — membership
            lives on the ticket.
          </p>
        ) : (
          <table className="member-table">
            <tbody>
              {group.members.map((m) => (
                <tr key={m.id} className={m.archived ? "archived" : ""}>
                  <td>
                    <button className="linkish" onClick={() => onOpenTicket(m.id)}>
                      {m.id}
                    </button>
                  </td>
                  <td>{m.title}</td>
                  <td className="muted">{m.archived ? "archived" : uiStageName(m.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </aside>
  );
}
