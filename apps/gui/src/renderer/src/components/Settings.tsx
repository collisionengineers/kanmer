import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BoardColumn,
  BoardConfig,
  ColumnKind,
  DocType,
  GateRule,
  Item,
} from "@kanmer/core";
import type {
  ConnectResult,
  ConnectTarget,
  DocModel,
  ProviderInfo,
  SkillsStatus,
  Theme, KanmerGitStatus,
  UiPreferences,
} from "../../../shared/ipc.js";
import { useClient } from "../lib/client.js";
import { boardDraftModified, reconcileBoardDraft } from "../lib/settingsDraft.js";

type SettingsTab = "board" | "documents" | "appearance" | "git" | "connect";
const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "documents", label: "Documents" },
  { id: "appearance", label: "Appearance" },
  { id: "git", label: "Git" },
  { id: "connect", label: "Connect" },
];

interface SettingsProps {
  board: BoardConfig;
  items: Item[];
  theme: Theme;
  notifications: boolean;
  preferences: UiPreferences;
  onSaveBoard: (next: BoardConfig) => Promise<void>;
  onSetTheme: (theme: Theme) => void;
  onSetNotifications: (on: boolean) => void;
  onSetPreferences: (patch: Partial<UiPreferences>) => void;
  onClose: () => void;
}

const DEFAULT_COLOR = "#5b8cff";

export function Settings({
  board,
  items,
  theme,
  notifications,
  preferences,
  onSaveBoard,
  onSetTheme,
  onSetNotifications,
  onSetPreferences,
  onClose,
}: SettingsProps): JSX.Element {
  const client = useClient();
  const [draft, setDraft] = useState<BoardConfig>(() => structuredClone(board));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("board");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [reloadRequired, setReloadRequired] = useState(false);

  // Usage counts so deleting an in-use column shows a soft warning.
  const usage = useMemo(() => countUsage(items), [items]);

  const modified = useMemo(() => boardDraftModified(draft, board), [draft, board]);

  const setColumns = (kind: ColumnKind, cols: BoardColumn[]) =>
    setDraft((d) => ({ ...d, [pluralKey(kind)]: cols }));

  const save = async () => {
    if (reloadRequired) {
      setError("Reload Settings before saving: the board changed but this draft could not be refreshed.");
      return;
    }
    const problems = validateDraft(draft, board, items);
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

  const backfill = async () => {
    if (modified || backfilling) return;
    setBackfilling(true);
    setError(null);
    let result;
    try {
      result = await client.backfillBoard(false);
    } catch (err) {
      setError(`Backfill failed: ${err instanceof Error ? err.message : String(err)}`);
      setBackfilling(false);
      return;
    }
    try {
      const refreshed = await client.getBoard();
      setDraft(reconcileBoardDraft(refreshed));
      setReloadRequired(false);
      setBackfillMsg(result.addedStages.length ? `Added: ${result.addedStages.join(", ")}` : "Already current.");
    } catch (err) {
      setReloadRequired(true);
      setError(`Backfill applied but Settings could not refresh: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBackfilling(false);
    }
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
        className="modal settings"
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
          <button className="primary sm" disabled={saving || reloadRequired} onClick={() => void save()}>
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

        <div className="settings-shell">
          <nav className="settings-rail">
            {SETTINGS_TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? "tab active" : "tab"}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="settings-pane">
            {tab === "board" && (
              <>
                <div className="settings-cols">
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
                  <p className="hint">
                    Applies to newly created items only; existing ids are unchanged.
                  </p>
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
              </>
            )}

            {tab === "documents" && (
              <DocumentsTab
                draft={draft}
                setDraft={setDraft}
                onBackfill={backfill}
                backfilling={backfilling}
                backfillMsg={backfillMsg}
                backfillDisabled={modified}
              />
            )}

            {tab === "git" && <GitTab />}

            {tab === "appearance" && (
              <>
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

                <div className="settings-section">
                  <h3>Card density</h3>
                  <div className="theme-toggle">
                    {(["comfortable", "compact"] as const).map((d) => (
                      <button
                        key={d}
                        className={d === preferences.cardDensity ? "tab active" : "tab"}
                        onClick={() => onSetPreferences({ cardDensity: d })}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Behaviour</h3>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={preferences.confirmOnDelete}
                      onChange={(e) => onSetPreferences({ confirmOnDelete: e.target.checked })}
                    />
                    Ask for confirmation before deleting a ticket
                  </label>
                </div>

                <div className="settings-section">
                  <h3>New-ticket defaults</h3>
                  <p className="hint">
                    Pre-fill the &quot;New ticket&quot; dialog. Applied only when the id exists on
                    this board.
                  </p>
                  <div className="field-row">
                    <label className="field">
                      <span>Default area</span>
                      <select
                        value={board.areas.some((a) => a.id === preferences.defaultArea) ? preferences.defaultArea : ""}
                        onChange={(e) => onSetPreferences({ defaultArea: e.target.value })}
                      >
                        <option value="">— none —</option>
                        {board.areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Default priority</span>
                      <select
                        value={
                          board.priorities.some((p) => p.id === preferences.defaultPriority)
                            ? preferences.defaultPriority
                            : ""
                        }
                        onChange={(e) => onSetPreferences({ defaultPriority: e.target.value })}
                      >
                        <option value="">— board default —</option>
                        {board.priorities.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </>
            )}

            {tab === "connect" && <ConnectSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Register the MCP server + install skills for any supported host (data-driven). */
function ConnectSection(): JSX.Element {
  const client = useClient();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [skills, setSkills] = useState<Record<string, SkillsStatus>>({});
  const [result, setResult] = useState<
    (ConnectResult & { target: ConnectTarget; action: "connect" | "disconnect" | "update" }) | null
  >(null);

  const refreshSkills = (list: ProviderInfo[]) => {
    for (const p of list) {
      void client.getSkillsStatus(p.id).then((s) => setSkills((cur) => ({ ...cur, [p.id]: s })));
    }
  };

  useEffect(() => {
    void window.kanmer.listProviders().then((list) => {
      setProviders(list);
      refreshSkills(list);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (target: ConnectTarget, action: "connect" | "disconnect") => {
    setBusy(`${action}:${target}`);
    try {
      const res =
        action === "connect"
          ? await client.connectAgent(target)
          : await client.disconnectAgent(target);
      setResult({ ...res, target, action });
      void client.getSkillsStatus(target).then((s) => setSkills((cur) => ({ ...cur, [target]: s })));
    } finally {
      setBusy(null);
    }
  };

  const update = async (target: ConnectTarget) => {
    setBusy(`update:${target}`);
    try {
      const res = await client.updateSkills(target);
      setResult({ ...res, target, action: "update" });
      void client.getSkillsStatus(target).then((s) => setSkills((cur) => ({ ...cur, [target]: s })));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="settings-section">
      <h3>Connect an AI agent</h3>
      <p className="hint">
        Registers this project's Kanmer board with the host's MCP client and installs the skills —
        via its plugin marketplace (Claude Code, Codex), a project skills dir (Grok), or the shared
        AGENTS.md block for hosts that only read skills globally (opencode, Antigravity), so nothing
        is written outside this project.
      </p>
      <div className="provider-list">
        {providers.map((p) => (
          <div key={p.id} className="provider-row">
            <span className="provider-name">
              {p.label}
              {!p.dispatch && <span className="hint"> · register-only</span>}
              {skills[p.id]?.updateAvailable && (
                <span className="hint">
                  {" "}
                  · skills v{skills[p.id]!.installedVersion} →{" "}
                  {skills[p.id]!.bundledVersion}
                </span>
              )}
            </span>
            <button className="ghost sm" disabled={busy !== null} onClick={() => void run(p.id, "connect")}>
              {busy === `connect:${p.id}` ? "Connecting…" : "Connect"}
            </button>
            {skills[p.id]?.updateAvailable && (
              <button
                className="ghost sm"
                disabled={busy !== null}
                onClick={() => void update(p.id)}
                title={`Bundled skills (v${skills[p.id]!.bundledVersion}) are newer than the copy in this project (v${skills[p.id]!.installedVersion})`}
              >
                {busy === `update:${p.id}` ? "Updating…" : "Update skills"}
              </button>
            )}
            <button
              className="ghost sm"
              disabled={busy !== null}
              onClick={() => void run(p.id, "disconnect")}
            >
              {busy === `disconnect:${p.id}` ? "…" : "Disconnect"}
            </button>
          </div>
        ))}
      </div>

      {result && (
        <div className={result.ok ? "connect-result ok" : "connect-result err"}>
          <div className="connect-status">
            {result.ok
              ? `✓ ${result.action === "connect" ? "Connected" : result.action === "update" ? "Updated skills for" : "Disconnected"} ${result.target}. ${result.output}`
              : `Couldn't ${result.action} ${result.target}.${result.action === "connect" ? " Run this yourself:" : ""}`}
          </div>
          {result.command && (
            <div className="connect-cmd">
              <code>{result.command}</code>
              <button
                className="ghost xs"
                onClick={() => void navigator.clipboard.writeText(result.command)}
              >
                Copy
              </button>
            </div>
          )}
          {!result.ok && <div className="connect-out">{result.output}</div>}
        </div>
      )}
    </div>
  );
}

/** Global board-branch settings, with the active project's safe manual sync. */
function GitTab(): JSX.Element {
  const client = useClient();
  const [branch, setBranch] = useState("kanmer-board");
  const [minutes, setMinutes] = useState(0);
  const [status, setStatus] = useState<KanmerGitStatus | null>(null);
  useEffect(() => {
    void Promise.all([window.kanmer.getSettings(), window.kanmer.getKanmerGitStatus(client.projectId)]).then(([s, st]) => {
      setBranch(s.kanmerBranch); setMinutes(s.gitSyncMinutes); setStatus(st);
    });
  }, [client.projectId]);
  const save = async () => window.kanmer.setKanmerGitPreferences({ kanmerBranch: branch, gitSyncMinutes: minutes });
  return <div className="settings-section">
    <h3>Shared board Git branch</h3>
    <p className="hint">Kanmer stores the board in <code>.worktrees/kanmer</code>; your source checkout remains the project tab.</p>
    <label className="field"><span>Kanmer branch</span><input value={branch} onChange={(e) => setBranch(e.target.value)} onBlur={() => void save()} /></label>
    <label className="check"><input type="checkbox" checked={minutes > 0} onChange={(e) => { const next = e.target.checked ? 1 : 0; setMinutes(next); void window.kanmer.setKanmerGitPreferences({ kanmerBranch: branch, gitSyncMinutes: next }); }} /> Automatic sync</label>
    {minutes > 0 && <label className="field"><span>Minutes</span><input type="number" min={1} step={1} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.trunc(Number(e.target.value) || 1)))} onBlur={() => void save()} /></label>}
    {!status?.available ? <p className="hint">Git sync is unavailable for this non-Git project.</p> : <>
      <p className="hint">Board worktree: <code>{status.boardRoot}</code>{status.lastSync ? ` · last sync ${status.lastSync}` : ""}</p>
      {status.error && <p className="error">{status.error}</p>}
      <button className="ghost sm" onClick={() => void window.kanmer.syncKanmerNow(client.projectId).then(setStatus)}>{status.paused ? "Retry" : "Sync now"}</button>
    </>}
  </div>;
}

/**
 * The Documents tab: where D5's "fully customizable" promise lives. Edits the
 * board's default doc types (order = hierarchy, `requires` prerequisites), the
 * gate rules (as friendly sentences), and the deployment toggle. A board with no
 * `docs` block inherits the shipped defaults (fetched via getDocModel); the
 * "Customize" action materialises them into the draft so they can be edited.
 */
function DocumentsTab({
  draft,
  setDraft,
  onBackfill,
  backfilling,
  backfillMsg,
  backfillDisabled,
}: {
  draft: BoardConfig;
  setDraft: React.Dispatch<React.SetStateAction<BoardConfig>>;
  onBackfill: () => void;
  backfilling: boolean;
  backfillMsg: string | null;
  backfillDisabled: boolean;
}): JSX.Element {
  const client = useClient();
  const [model, setModel] = useState<DocModel | null>(null);
  useEffect(() => {
    void client.getDocModel().then(setModel);
  }, [client]);
  const missingStages = [
    "backlog",
    "researching",
    "planning",
    "implementing",
    "review",
    "verifying",
    "done",
  ].filter((c) => !draft.statuses.some((s) => s.id === c));

  // Scope: "" = the board default, else a per-area override (D5). The editor
  // below operates on whichever scope is selected.
  const [activeArea, setActiveArea] = useState("");
  const scopeTypes = activeArea ? draft.docs?.areas?.[activeArea]?.types : draft.docs?.default?.types;
  const scopeGates = activeArea ? draft.docs?.areas?.[activeArea]?.gates : draft.docs?.default?.gates;
  const customized = scopeTypes !== undefined;
  const types = scopeTypes ?? model?.defaultTypes ?? [];
  const gates = scopeGates ?? model?.defaultGates ?? [];
  const stageName = (id: string) => draft.statuses.find((s) => s.id === id)?.name ?? id;

  const patchDefault = (patch: { types?: DocType[]; gates?: GateRule[] }) =>
    setDraft((d) => {
      const docs = { ...(d.docs ?? {}) };
      docs.repoDocs = docs.repoDocs ?? model?.repoDocs;
      const scope = {
        types:
          patch.types ??
          (activeArea ? docs.areas?.[activeArea]?.types : docs.default?.types) ??
          model?.defaultTypes ??
          [],
        gates:
          patch.gates ??
          (activeArea ? docs.areas?.[activeArea]?.gates : docs.default?.gates) ??
          model?.defaultGates ??
          [],
      };
      if (activeArea) docs.areas = { ...(docs.areas ?? {}), [activeArea]: scope };
      else docs.default = scope;
      return { ...d, docs };
    });

  const resetDefaults = () =>
    setDraft((d) => {
      const docs = { ...(d.docs ?? {}) };
      if (activeArea) {
        const areas = { ...(docs.areas ?? {}) };
        delete areas[activeArea];
        docs.areas = Object.keys(areas).length ? areas : undefined;
      } else {
        delete (docs as { default?: unknown }).default;
      }
      const empty =
        !docs.repoDocs &&
        !docs.default &&
        (!docs.areas || Object.keys(docs.areas).length === 0);
      return { ...d, docs: empty ? undefined : docs };
    });

  const setTypeName = (i: number, name: string) =>
    patchDefault({ types: types.map((t, idx) => (idx === i ? { ...t, name } : t)) });
  const setTypeRequires = (i: number, requires: string[]) =>
    patchDefault({
      types: types.map((t, idx) => (idx === i ? { ...t, requires: requires.length ? requires : undefined } : t)),
    });
  const moveType = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= types.length) return;
    const next = [...types];
    [next[i], next[j]] = [next[j], next[i]];
    patchDefault({ types: next });
  };
  const removeType = (i: number) => patchDefault({ types: types.filter((_, idx) => idx !== i) });

  const [newType, setNewType] = useState("");
  const addType = () => {
    const name = newType.trim();
    if (!name) return;
    const id = slug(name);
    if (!id || types.some((t) => t.id === id)) return;
    patchDefault({ types: [...types, { id, name }] });
    setNewType("");
  };

  const removeGate = (i: number) => patchDefault({ gates: gates.filter((_, idx) => idx !== i) });

  return (
    <>
      <div className="settings-section">
        <label className="field">
          <span>Editing document model for</span>
          <select value={activeArea} onChange={(e) => setActiveArea(e.target.value)}>
            <option value="">Default (all areas)</option>
            {draft.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {draft.docs?.areas?.[a.id]?.types ? "(customized)" : "(inherits default)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="settings-section">
        <div className="section-head">
          <h3>Document types</h3>
          {customized ? (
            <button className="ghost xs" onClick={resetDefaults}>
              {activeArea ? "Reset to default" : "Reset to defaults"}
            </button>
          ) : (
            <button className="ghost xs" onClick={() => patchDefault({})} disabled={!model}>
              Customize…
            </button>
          )}
        </div>
        <p className="hint">
          Order is the hierarchy; each doc&apos;s <em>requires</em> must exist before it can be
          written.{" "}
          {customized
            ? ""
            : activeArea
              ? "This area inherits the default set — Customize to override it."
              : "This board uses the defaults — Customize to edit."}
        </p>
        {types.map((t, i) => (
          <div key={t.id} className="doc-type-row">
            <input
              className="col-name"
              value={t.name}
              disabled={!customized}
              onChange={(e) => setTypeName(i, e.target.value)}
              aria-label={`Name of doc ${t.id}`}
            />
            <span className="col-id" title="doc id (stable)">
              {t.id}
              {t.progress ? <span className="usage"> ·progress</span> : null}
            </span>
            <input
              className="doc-requires"
              value={(t.requires ?? []).join(", ")}
              disabled={!customized}
              placeholder="requires…"
              onChange={(e) =>
                setTypeRequires(
                  i,
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              aria-label={`Requires for ${t.id}`}
            />
            <button className="ghost xs" disabled={!customized || i === 0} onClick={() => moveType(i, -1)}>
              ↑
            </button>
            <button
              className="ghost xs"
              disabled={!customized || i === types.length - 1}
              onClick={() => moveType(i, 1)}
            >
              ↓
            </button>
            <button className="ghost xs" disabled={!customized} onClick={() => removeType(i)}>
              ✕
            </button>
          </div>
        ))}
        {customized && (
          <div className="col-add">
            <input
              placeholder="Add document type…"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addType()}
            />
            <button className="ghost xs" onClick={addType}>
              + Add
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Gate rules</h3>
        <p className="hint">Documents required to cross a stage boundary.</p>
        {gates.length === 0 && <p className="empty">No gates.</p>}
        {gates.map((g, i) => {
          const boundary = g.before.leave
            ? `leave ${stageName(g.before.leave)}`
            : `enter ${stageName(g.before.enter ?? "")}`;
          const need = g.needs
            ? `the ${g.needs} document must exist`
            : `a governing doc (${(g.needsRepoDoc ?? []).join("/")}) must be linked`;
          return (
            <div key={i} className="gate-row">
              <span>
                To <strong>{boundary}</strong>, {need}.
              </span>
              <button className="ghost xs" disabled={!customized} onClick={() => removeGate(i)}>
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="settings-section">
        <h3>Deployment tracking</h3>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.deployment !== undefined}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                deployment: e.target.checked
                  ? { environments: d.deployment?.environments?.length ? d.deployment.environments : ["production"] }
                  : undefined,
              }))
            }
          />
          Track a deployment status on tickets (adds the n/a · not-deployed · &lt;env&gt; field)
        </label>
        {draft.deployment && (
          <EnvEditor
            environments={draft.deployment.environments}
            onChange={(envs) => setDraft((d) => ({ ...d, deployment: { environments: envs } }))}
          />
        )}
      </div>

      {missingStages.length > 0 && (
        <div className="settings-section">
          <h3>Upgrade board</h3>
          <p className="hint">
            This board is missing canonical stages ({missingStages.join(", ")}). Backfill inserts
            them in order — additive, never renaming/reordering existing stages, never touching item
            files. Backfill refreshes this draft before it can be saved.
          </p>
          <button
            className="ghost sm"
            disabled={backfillDisabled || backfilling}
            title={backfillDisabled ? "Save or discard Settings changes before backfilling." : undefined}
            onClick={onBackfill}
          >
            {backfilling ? "Backfilling…" : "Backfill missing stages"}
          </button>
          {backfillMsg && <p className="hint">{backfillMsg}</p>}
        </div>
      )}
    </>
  );
}

/** Edit the ordered deployment environments (the last is "live"). */
function EnvEditor({
  environments,
  onChange,
}: {
  environments: string[];
  onChange: (envs: string[]) => void;
}): JSX.Element {
  const [name, setName] = useState("");
  return (
    <div className="env-editor">
      {environments.map((env, i) => (
        <span key={env} className="chip">
          {env}
          {i === environments.length - 1 ? " (live)" : ""}
          <button
            className="chip-x"
            aria-label={`Remove ${env}`}
            onClick={() => onChange(environments.filter((_, idx) => idx !== i))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="env-add"
        placeholder="Add environment…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = slug(name);
            if (v && !environments.includes(v)) onChange([...environments, v]);
            setName("");
          }
        }}
      />
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
function validateDraft(draft: BoardConfig, board: BoardConfig, items: Item[]): string[] {
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
  // the type prefixes — they share one id space. Mirrors core's
  // assertUniquePrefixes() (packages/core/src/board.ts); the renderer may only
  // import *types* from core, so this is a deliberate second copy.
  //
  // Built with an explicit loop, not `new Map(entries)`: the Map constructor
  // silently keeps only the last entry per duplicate key, which is exactly the
  // blind spot that let two type prefixes share a value.
  const seen = new Map<string, string>();
  for (const [t, p] of Object.entries(draft.idPrefixes)) {
    const holder = seen.get(p);
    if (holder) problems.push(`The ${t} id prefix "${p}" is already used by ${holder}.`);
    else seen.set(p, `the ${t} prefix`);
  }
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

  // Column-stranding (mirrors core's setBoard check): don't remove a stage/area/
  // priority that items still reference.
  for (const [kind, field, prev, cur] of [
    ["stage", "status", board.statuses, draft.statuses],
    ["area", "area", board.areas, draft.areas],
    ["priority", "priority", board.priorities, draft.priorities],
  ] as const) {
    for (const c of prev) {
      if (cur.some((n) => n.id === c.id)) continue;
      const users = items.filter((i) => (i as Record<string, unknown>)[field] === c.id);
      if (users.length > 0) {
        const sample = users.slice(0, 5).map((i) => i.id).join(", ");
        problems.push(
          `Can't remove ${kind} "${c.name}": ${users.length} item(s) still use it (${sample}${users.length > 5 ? ", …" : ""}).`,
        );
      }
    }
  }

  // Document model (mirrors core's DocTypeArray/GateRule refinements).
  const docTypes = draft.docs?.default?.types;
  if (docTypes) {
    const ids = new Set(docTypes.map((t) => t.id));
    for (const t of docTypes) {
      if (t.id.startsWith("scratch-")) problems.push(`Doc id "${t.id}" can't start with "scratch-".`);
      for (const r of t.requires ?? []) {
        if (!ids.has(r)) problems.push(`Doc "${t.id}" requires "${r}", which isn't a doc type.`);
      }
    }
    const edges = new Map(docTypes.map((t) => [t.id, t.requires ?? []]));
    const state = new Map<string, 1 | 2>();
    const cyclic = (id: string): boolean => {
      if (state.get(id) === 2) return false;
      if (state.get(id) === 1) return true;
      state.set(id, 1);
      for (const n of edges.get(id) ?? []) if (edges.has(n) && cyclic(n)) return true;
      state.set(id, 2);
      return false;
    };
    if (docTypes.some((t) => cyclic(t.id))) problems.push("Document `requires` form a cycle.");
  }
  const gates = draft.docs?.default?.gates;
  if (gates) {
    const docIds = new Set((docTypes ?? []).map((t) => t.id));
    const stageIds = new Set(draft.statuses.map((s) => s.id));
    const kinds = new Set(Object.keys(draft.docs?.repoDocs ?? { prd: "", frd: "", adr: "" }));
    for (const g of gates) {
      const bstage = g.before.leave ?? g.before.enter;
      if (bstage && !stageIds.has(bstage)) {
        problems.push(`A gate names stage "${bstage}", which isn't on the board.`);
      }
      if (g.needs && docTypes && !docIds.has(g.needs)) {
        problems.push(`A gate needs document "${g.needs}", which isn't a doc type.`);
      }
      for (const k of g.needsRepoDoc ?? []) {
        if (!kinds.has(k)) problems.push(`A gate names governing-doc kind "${k}", which isn't configured.`);
      }
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
