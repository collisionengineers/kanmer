import { useCallback, useEffect, useState } from "react";
import type { RegistryEndpointView, RegistryView, RegistryWorkspaceView } from "../../../shared/ipc.js";

/**
 * Settings → Projects (GUI-144, FRD-029). Every endpoint named in the
 * registry is observed read-only; only the SELECTED project (the open tab
 * this Settings dialog belongs to) exposes registry controls. Another
 * project's only action is "Open project", which changes the selection
 * through the App-level open path (tabs + board state) — it never mutates
 * that project's board or registry entry. Main independently refuses
 * rename/policy/remove for any endpoint other than the selected one.
 */

const HEALTH_LABEL: Record<RegistryEndpointView["health"], string> = {
  ok: "Healthy",
  unassigned: "No identity yet",
  "missing-board": "Board missing",
  invalid: "Invalid entry",
  error: "Error",
};

function shortId(value: string | null): string {
  return value ?? "—";
}

function syncSummary(sync: RegistryEndpointView["boardSync"]): string {
  if (!sync) return "sync unknown";
  if (!sync.remote) return "no origin remote";
  return `ahead ${sync.ahead} · behind ${sync.behind}`;
}

function WorkspaceRow({ workspace }: { workspace: RegistryWorkspaceView }): JSX.Element {
  const lease = workspace.lease;
  return (
    <li className="registry-workspace">
      <code>{workspace.ticket}</code> · {workspace.stage} · {workspace.controller}
      {workspace.assignee && workspace.assignee !== workspace.controller ? ` (${workspace.assignee})` : ""} · claim {workspace.claim}
      {workspace.expiresAt ? ` until ${workspace.expiresAt}` : ""}
      {workspace.lease?.heartbeatStale ? " · heartbeat stale" : ""}
      {workspace.branch ? <> · <code>{workspace.branch}</code></> : null}
      {workspace.worktree ? <> · <code>{workspace.worktree}</code></> : null}
      {lease ? (
        <span className="hint"> · lease {lease.id}{lease.revision !== null ? ` r${lease.revision}` : ""}{lease.phase ? ` · ${lease.phase}` : ""}{lease.provider ? ` · ${lease.provider}` : ""}{lease.heartbeatAt ? ` · heartbeat ${lease.heartbeatAt}` : ""}</span>
      ) : null}
    </li>
  );
}

interface EndpointCardProps {
  endpoint: RegistryEndpointView;
  busy: string | null;
  onOpen: (repoRoot: string) => void;
  onRename: (from: string, to: string) => void;
  onSetPolicy: (name: string, policy: string | null) => void;
  onRemove: (name: string) => void;
}

function EndpointCard({ endpoint, busy, onOpen, onRename, onSetPolicy, onRemove }: EndpointCardProps): JSX.Element {
  const [renameTo, setRenameTo] = useState(endpoint.name);
  const [policy, setPolicy] = useState(endpoint.policy ?? "");
  useEffect(() => { setRenameTo(endpoint.name); setPolicy(endpoint.policy ?? ""); }, [endpoint.name, endpoint.policy]);
  const openRoot = endpoint.repoRoot ?? endpoint.boardRoot;
  // Only a board that was actually observed may be opened: main's open path
  // initialises a fresh board when none exists, so a stale registry pointer
  // must never become an empty board at that path (review F-015).
  const openable = endpoint.health === "ok" || endpoint.health === "unassigned";
  return (
    <article className={endpoint.selected ? "card registry-endpoint selected" : "card registry-endpoint"} aria-label={`Registry endpoint ${endpoint.name}`}>
      <div className="registry-endpoint-head">
        <strong>{endpoint.name}</strong>
        <span className={`registry-health registry-health-${endpoint.health}`} aria-label={`Health ${endpoint.health}`}>{HEALTH_LABEL[endpoint.health]}</span>
        {endpoint.selected && <span className="registry-selected" aria-label="Selected project">Selected project</span>}
        {endpoint.policy && <span className="hint">policy {endpoint.policy}</span>}
      </div>
      <span className="hint">Project {shortId(endpoint.project?.project_id ?? null)}{endpoint.project?.board_id && endpoint.project.board_id !== endpoint.project.project_id ? ` · board ${endpoint.project.board_id}` : ""}{endpoint.project ? ` · ${endpoint.project.identity}${endpoint.project.origin ? ` (${endpoint.project.origin})` : ""}` : ""}</span>
      <span className="hint">Board <code>{endpoint.boardRoot || "?"}</code>{endpoint.repoRoot ? <> · repo <code>{endpoint.repoRoot}</code></> : null}</span>
      <span className="hint">Branch {endpoint.boardBranch ?? "?"} · {syncSummary(endpoint.boardSync)}{endpoint.ticketCount !== null ? ` · ${endpoint.ticketCount} ticket${endpoint.ticketCount === 1 ? "" : "s"}` : ""}{endpoint.location?.remoteOrigin ? ` · origin ${endpoint.location.remoteOrigin}` : ""}{endpoint.location?.machine ? ` · ${endpoint.location.machine}` : ""}</span>
      {endpoint.problems.length > 0 && <ul className="registry-problems">{endpoint.problems.map((problem) => <li key={problem} className="hint">{problem}</li>)}</ul>}
      {endpoint.controllers.length > 0 ? (
        <span className="hint">Active controllers: {endpoint.controllers.map((controller) => `${controller.controller} (${controller.tickets.join(", ")})`).join("; ")}</span>
      ) : endpoint.health === "ok" || endpoint.health === "unassigned" ? <span className="hint">No active controllers.</span> : null}
      {endpoint.workspaces.length > 0 && (
        <ul className="registry-workspaces" aria-label={`Workspaces on ${endpoint.name}`}>
          {endpoint.workspaces.map((workspace) => <WorkspaceRow key={workspace.ticket} workspace={workspace} />)}
        </ul>
      )}
      {endpoint.selected ? (
        <div className="registry-actions" aria-label={`Registry controls for ${endpoint.name}`}>
          <label className="registry-field">Rename to
            <input value={renameTo} aria-label="Rename endpoint" onChange={(e) => setRenameTo(e.target.value)} />
          </label>
          <button className="ghost xs" disabled={busy !== null || renameTo === endpoint.name} onClick={() => onRename(endpoint.name, renameTo)}>Rename</button>
          <label className="registry-field">Policy
            <input value={policy} aria-label="Endpoint policy" placeholder="e.g. main-only" onChange={(e) => setPolicy(e.target.value)} />
          </label>
          <button className="ghost xs" disabled={busy !== null || policy === (endpoint.policy ?? "")} onClick={() => onSetPolicy(endpoint.name, policy.trim() || null)}>Save policy</button>
          <button className="danger xs" disabled={busy !== null} onClick={() => onRemove(endpoint.name)}>Remove from registry</button>
        </div>
      ) : (
        <div className="registry-actions">
          <span className="hint">Observation only. Open this project to act on it.</span>
          <button className="ghost xs" disabled={busy !== null || !openRoot || !openable} onClick={() => onOpen(openRoot)}>Open project</button>
          {!openable && <span className="hint" aria-label={`Open refused for ${endpoint.name}`}>Cannot open: no board was observed at the recorded path, and opening would create a new one.</span>}
        </div>
      )}
    </article>
  );
}

export interface ProjectRegistrySectionProps {
  projectId: string;
  /** The App's `openProject` — the only path that makes another project the selected tab (review F-002). */
  onOpenProject: (root: string) => Promise<void>;
}

export function ProjectRegistrySection({ projectId, onOpenProject }: ProjectRegistrySectionProps): JSX.Element {
  const [view, setView] = useState<RegistryView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addPolicy, setAddPolicy] = useState("");

  const refresh = useCallback(async () => {
    setView(await window.kanmer.registryObserve(projectId));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await window.kanmer.registryObserve(projectId);
        if (!cancelled) setView(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const run = useCallback(async (label: string, work: () => Promise<RegistryView | void>) => {
    setBusy(label); setError(null); setMessage(null);
    try {
      const next = await work();
      if (next) setView(next);
      else await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const add = () => run("add", async () => {
    const next = await window.kanmer.registryAddProject(projectId, addName.trim(), addPolicy.trim() || null);
    setAddName(""); setAddPolicy("");
    setMessage(`Registered this project as "${addName.trim()}".`);
    return next;
  });
  const rename = (from: string, to: string) => run("rename", async () => {
    const next = await window.kanmer.registryRename(projectId, from, to);
    setMessage(`Renamed "${from}" to "${to}".`);
    return next;
  });
  const setPolicy = (name: string, policy: string | null) => run("policy", async () => {
    const next = await window.kanmer.registrySetPolicy(projectId, name, policy);
    setMessage(policy ? `Policy for "${name}" set to "${policy}".` : `Policy for "${name}" cleared.`);
    return next;
  });
  const remove = (name: string) => run("remove", async () => {
    if (!window.confirm(`Remove "${name}" from the endpoint registry? The board itself is not touched.`)) return;
    const next = await window.kanmer.registryRemove(projectId, name);
    setMessage(`Removed "${name}" from the registry.`);
    return next;
  });
  // Selection changes only through the App: it opens the tab, swaps the board
  // state and re-renders this section with the new projectId (which reloads
  // the view), so no manual refresh is needed here.
  const open = (root: string) => run("open", async () => { await onOpenProject(root); });

  const nameValid = /^[a-z0-9][a-z0-9._-]{0,63}$/.test(addName.trim());

  return (
    <div className="settings-section" aria-label="Project registry">
      <h3>Named project endpoints</h3>
      <p className="hint">
        Every Kanmer MCP process serves one project. The registry names several of them so this app — and any
        of those servers, through <code>list_projects</code> — can watch their health together. Everything across
        projects is observational: only the selected project has controls here, and opening another project is how
        you select it.
      </p>
      {view && (
        <p className="hint">Registry file <code>{view.registry.path}</code> ({view.registry.source === "env" ? "KANMER_ENDPOINT_REGISTRY" : "default location"}){view.registry.exists ? "" : " · not created yet"}</p>
      )}
      {view?.registry.error && <div className="banner error">{view.registry.error}</div>}
      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner">{message}</div>}
      <div className="registry-toolbar">
        <button className="ghost xs" disabled={busy !== null} onClick={() => void run("refresh", refresh)}>Refresh</button>
      </div>
      {view && !view.selectedRegistered && !view.registry.error && (
        <div className="registry-add" aria-label="Add this project to the registry">
          <p className="hint">The selected project is not in the registry yet. Name it to add it; its board and repository locations come from the open tab.</p>
          <label className="registry-field">Name
            <input value={addName} aria-label="New endpoint name" placeholder="my-project" onChange={(e) => setAddName(e.target.value)} />
          </label>
          <label className="registry-field">Policy (optional)
            <input value={addPolicy} aria-label="New endpoint policy" placeholder="e.g. main-only" onChange={(e) => setAddPolicy(e.target.value)} />
          </label>
          <button className="primary xs" disabled={busy !== null || !nameValid} onClick={add}>Add this project</button>
          {addName.trim() && !nameValid && <span className="hint">Names are lowercase: a-z, 0-9, dots, underscores and dashes, up to 64 characters.</span>}
        </div>
      )}
      {view && view.endpoints.length === 0 && !view.registry.error && <p className="hint">No endpoints are registered yet.</p>}
      {view && view.endpoints.length > 0 && (
        <div className="remote-project-grid">
          {view.endpoints.map((endpoint) => (
            <EndpointCard key={endpoint.name} endpoint={endpoint} busy={busy} onOpen={open} onRename={rename} onSetPolicy={setPolicy} onRemove={remove} />
          ))}
        </div>
      )}
      {!view && !error && <p className="hint">Observing registered projects…</p>}
    </div>
  );
}
