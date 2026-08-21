import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BoardColumn,
  BoardConfig,
  ColumnKind,
  Item,
} from "@kanmer/core";
import type {
  ConnectResult,
  ConnectTarget,
  DocModel,
  LegacyCodexDrainResult,
  LegacyCodexScan,
  ProviderInfo,
  SkillsStatus,
  Theme, KanmerGitStatus,
  UiPreferences,
} from "../../../shared/ipc.js";
import type { RemoteConfigInput, RemoteDoctorResult, RemoteProjectView, RemoteStatus } from "../../../shared/ipc.js";
import { useClient } from "../lib/client.js";
import { boardDraftModified } from "../lib/settingsDraft.js";
import {
  applyProfileEdit,
  changedProfiles,
  splitRequirements,
  ticketsAffected,
  validateProfiles,
  type Vocabulary,
} from "../lib/profileDraft.js";

type SettingsTab = "board" | "profiles" | "appearance" | "git" | "connect" | "remote";
const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "profiles", label: "Profiles" },
  { id: "appearance", label: "Appearance" },
  { id: "git", label: "Git" },
  { id: "connect", label: "Connect" },
  { id: "remote", label: "Remote access" },
];

interface SettingsProps {
  projectId: string;
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
  projectId,
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
  const [draft, setDraft] = useState<BoardConfig>(() => structuredClone(board));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("board");
  // Set when a refresh fails and the pane can no longer trust its draft.
  const [reloadRequired] = useState(false);

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
                <p className="hint">
                  Stages are fixed: Backlog → Preparing → Implementing → Review →
                  Verifying → Done. Every board has the same six, so a document gate
                  can never point at a stage that does not exist.
                </p>
                <div className="settings-cols">
                  <ColumnEditor
                    title="Areas (colour-grouped)"
                    kind="area"
                    columns={draft.areas}
                    usage={usage.area}
                    onChange={(c) => setColumns("area", c)}
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

            {tab === "remote" && <RemoteSection projectId={projectId} />}

            {tab === "profiles" && <ProfilesTab />}

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
        via its plugin marketplace (Claude Code, Codex), or a project skills directory —{" "}
        <code>.grok/skills</code> for Grok, and one shared <code>.agents/skills</code> tree that
        opencode and Antigravity both read, alongside the managed AGENTS.md block. Every
        registration Kanmer writes lands inside this project, in a file the host owns.
      </p>
      <div className="provider-list">
        {providers.map((p) => (
          <div key={p.id} className="provider-row">
            <span className="provider-name">
              {p.label}
              {/* Names exactly what the flag means. It used to say "register-only",
                  which read as a capability tier and denied the project skills
                  install this host does get (GUI-073). Same source as
                  `dispatchableProviders()`, so badge and menu cannot disagree. */}
              {!p.dispatch && (
                <span
                  className="hint"
                  title="Kanmer cannot start this host in the background to work a ticket; it registers and receives skills like every other host."
                >
                  {" "}
                  · no background dispatch
                </span>
              )}
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

      <LegacyCodexSweep />
    </div>
  );
}

/**
 * The one-time drain of the global codex registrations older Kanmers left
 * behind (GUI-079, ADR-0010).
 *
 * Renders nothing when there is nothing to report, so the second run — and
 * every run on a clean machine — is invisible.
 *
 * The safety property this UI carries: an entry whose project has no
 * project-scoped replacement is that project's **only working registration**,
 * so it gets no checkbox at all. Not a pre-unticked one, not one behind a
 * confirmation — a row that looks like the removable ones is a silent
 * data-loss button, and the point of the ticket is that it must not exist.
 */
function LegacyCodexSweep(): JSX.Element | null {
  const [scan, setScan] = useState<LegacyCodexScan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [drained, setDrained] = useState<LegacyCodexDrainResult | null>(null);

  const load = useCallback((next: LegacyCodexScan) => {
    setScan(next);
    setSelected(new Set(next.findings.filter((f) => f.recommended).map((f) => f.name)));
  }, []);

  useEffect(() => {
    void window.kanmer.scanLegacyCodexRegistrations().then(load);
  }, [load]);

  if (!scan || scan.findings.length === 0) return null;

  const removable = scan.findings.filter((f) => f.removable);
  const blocked = scan.findings.filter((f) => !f.removable);
  const chosen = [...selected].filter((n) => removable.some((f) => f.name === n));

  const toggle = (name: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const drain = async () => {
    setBusy(true);
    try {
      const res = await window.kanmer.drainLegacyCodexRegistrations(chosen);
      setDrained(res);
      load(res.scan);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="legacy-sweep">
      <h4>Legacy codex registrations</h4>
      <p className="hint">
        Older versions of Kanmer registered codex globally, one entry per project, in{" "}
        <code>{scan.configPath}</code> — so these load in every codex session no matter which folder
        you start it in. {scan.findings.length} left. Reconnecting a project only ever drained its
        own; this drains the rest.
      </p>

      {removable.length > 0 && (
        <div className="legacy-list">
          {removable.map((f) => (
            <label key={f.name} className="legacy-row">
              <input
                type="checkbox"
                checked={selected.has(f.name)}
                disabled={busy}
                onChange={() => toggle(f.name)}
              />
              <span className="legacy-name">
                <code>{f.name}</code>
                {f.status === "orphaned" && <span className="hint"> · folder missing</span>}
              </span>
              <span className="legacy-detail hint">{f.detail}</span>
            </label>
          ))}
        </div>
      )}

      {blocked.length > 0 && (
        <div className="legacy-list">
          {blocked.map((f) => (
            <div key={f.name} className="legacy-row blocked">
              <span className="legacy-warn" aria-hidden="true">
                ⚠
              </span>
              <span className="legacy-name">
                <code>{f.name}</code> · kept
              </span>
              <span className="legacy-detail">{f.detail}</span>
            </div>
          ))}
        </div>
      )}

      <button className="ghost sm" disabled={busy || chosen.length === 0} onClick={() => void drain()}>
        {busy ? "Removing…" : `Remove ${chosen.length} selected`}
      </button>

      {drained && (
        <div className="legacy-results">
          {drained.removals.length === 0 && <div className="connect-status">Nothing was removed.</div>}
          {drained.refused.length > 0 && (
            <div className="connect-result err">
              <div className="connect-status">
                Kept {drained.refused.join(", ")} — re-checked at removal time and still not safe to
                remove.
              </div>
            </div>
          )}
          {drained.removals.map((r) => (
            <div key={r.name} className={r.ok ? "connect-result ok" : "connect-result err"}>
              <div className="connect-status">
                {r.ok ? `✓ Removed ${r.name}.` : `Couldn't remove ${r.name}. Run this yourself:`}
              </div>
              {!r.ok && (
                <>
                  <div className="connect-cmd">
                    <code>{r.command}</code>
                    <button
                      className="ghost xs"
                      onClick={() => void navigator.clipboard.writeText(r.command)}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="connect-out">{r.output}</div>
                </>
              )}
            </div>
          ))}
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
  const [saved, setSaved] = useState("kanmer-board");
  const [renaming, setRenaming] = useState(false);
  useEffect(() => {
    void Promise.all([window.kanmer.getSettings(), window.kanmer.getKanmerGitStatus(client.projectId)]).then(([s, st]) => {
      setBranch(s.kanmerBranch); setSaved(s.kanmerBranch); setMinutes(s.gitSyncMinutes); setStatus(st);
    });
  }, [client.projectId]);
  const save = async (next?: { branch?: string; minutes?: number }) => {
    const s = await window.kanmer.setKanmerGitPreferences({
      kanmerBranch: next?.branch ?? saved,
      gitSyncMinutes: next?.minutes ?? minutes,
    });
    setSaved(s.kanmerBranch);
    setStatus(await window.kanmer.getKanmerGitStatus(client.projectId));
  };
  const pending = branch.trim() && branch.trim() !== saved ? branch.trim() : null;
  return <div className="settings-section">
    <h3>Shared board Git branch</h3>
    <p className="hint">Kanmer stores the board in <code>.worktrees/kanmer</code>; your source checkout remains the project tab.</p>
    {/*
      Renaming is deliberately a button, not an on-blur save. It rewrites the
      branch on every open board and deletes the old one from the remote, and
      tabbing out of a half-typed name should not do that.
    */}
    <label className="field"><span>Kanmer branch</span><input value={branch} onChange={(e) => setBranch(e.target.value)} /></label>
    {pending && <p className="hint">
      Renames <code>{saved}</code> to <code>{pending}</code> in place, keeping the board&rsquo;s history and worktree path. The new branch is pushed first, then <code>{saved}</code> is deleted from <code>origin</code>.
    </p>}
    <button className="ghost sm" disabled={!pending || renaming} onClick={() => {
      if (!pending) return;
      setRenaming(true);
      void save({ branch: pending }).finally(() => setRenaming(false));
    }}>{renaming ? "Renaming…" : "Rename branch"}</button>
    <label className="check"><input type="checkbox" checked={minutes > 0} onChange={(e) => { const next = e.target.checked ? 1 : 0; setMinutes(next); void save({ minutes: next }); }} /> Automatic sync</label>
    {minutes > 0 && <label className="field"><span>Minutes</span><input type="number" min={1} step={1} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.trunc(Number(e.target.value) || 1)))} onBlur={() => void save()} /></label>}
    {!status?.available ? <p className="hint">Git sync is unavailable for this non-Git project.</p> : <>
      <p className="hint">Board worktree: <code>{status.boardRoot}</code>{status.lastSync ? ` · last sync ${status.lastSync}` : ""}</p>
      {status.error && <p className="error">{status.error}</p>}
      <button className="ghost sm" onClick={() => void window.kanmer.syncKanmerNow(client.projectId).then(setStatus)}>{status.paused ? "Retry" : "Sync now"}</button>
    </>}
  </div>;
}

/**
 * The Profiles pane: which documents each stage boundary asks of a ticket, per
 * profile (FRD-002 S2), plus area defaults and the proof-type vocabulary
 * (FRD-006 R1).
 *
 * Editing a profile re-gates every ticket resolving to it, immediately. Core
 * rejects an invalid board; nothing warns about a *valid* one that re-blocks
 * half the board, so the save button carries the affected count.
 *
 * Validation is `lib/profileDraft.ts` — the renderer may only `import type`
 * from core, so core's rules are mirrored there (AGENTS.md §7, third pairing).
 */
function ProfilesTab(): JSX.Element {
  const client = useClient();
  const [model, setModel] = useState<DocModel | null>(null);
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [draft, setDraft] = useState<BoardConfig | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [m, b, list] = await Promise.all([
      client.getDocModel(),
      client.getBoard(),
      client.listItems({ includeArchived: true }),
    ]);
    setModel(m);
    setBoard(b);
    setDraft(structuredClone(b));
    setItems(list);
  }, [client]);

  useEffect(() => {
    void load().catch((e) => setError(String(e)));
  }, [load]);

  if (!model || !board || !draft) return <p className="hint">{error ?? "Loading…"}</p>;

  const vocab: Vocabulary = {
    docTypes: model.docTypes,
    proofTypes: (draft as { proofTypes?: string[] }).proofTypes ?? model.proofTypes,
    environments: ((draft as { deployment?: { environments?: { id: string }[] } }).deployment?.environments ?? []).map((e) => e.id),
    boundaries: model.boundaries,
  };

  const draftProfiles =
    (draft as { profiles?: Record<string, Record<string, string[]>> }).profiles ?? model.profiles;
  const errors = validateProfiles(draftProfiles, vocab);
  const changed = changedProfiles(board, draft);
  const dirty = JSON.stringify(board) !== JSON.stringify(draft);
  const affected = ticketsAffected(items, draft, changed);

  const edit = (profile: string, boundary: string, field: string): void => {
    setSaved(false);
    setDraft(applyProfileEdit(draft, profile, boundary, splitRequirements(field)));
  };

  return (
    <>
      <p className="hint">
        A ticket&rsquo;s <strong>profile</strong> decides what each stage boundary requires of
        it, so requirements scale with the nature of the work rather than with where it
        lives. A ticket inherits its area&rsquo;s default, then the board&rsquo;s
        (<code>{model.defaultProfile}</code>). <code>custom</code> carries its
        requirements inline on the ticket itself.
      </p>

      <div className="settings-section">
        <table className="profiles-table">
          <thead>
            <tr>
              <th>Profile</th>
              {model.boundaries.map((b) => (
                <th key={b}>{b.replace("-", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(draftProfiles).map((name) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                {model.boundaries.map((b) => {
                  const key = `${name}.${b}`;
                  const errs = errors[key];
                  return (
                    <td key={b}>
                      <input
                        className={errs ? "invalid" : ""}
                        value={(draftProfiles[name]?.[b] ?? []).join(", ")}
                        placeholder="—"
                        aria-label={`${name}, ${b}`}
                        onChange={(e) => edit(name, b, e.target.value)}
                      />
                      {errs && <p className="field-error">{errs.join("; ")}</p>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Comma-separated. A requirement is a document type, optionally
          <code>/named</code>, and for proof <code>:type</code> and <code>@environment</code> —
          e.g. <code>proof:visual@staging</code>.
        </p>
      </div>

      <div className="settings-section">
        <h3>Area defaults</h3>
        <p className="hint">Applied to tickets in that area with no profile of their own.</p>
        {(draft.areas ?? []).map((a, idx) => (
          <label className="field" key={a.id}>
            <span>{a.name}</span>
            <select
              value={(a as { defaultProfile?: string }).defaultProfile ?? ""}
              onChange={(e) => {
                const next = structuredClone(draft);
                const area = next.areas![idx] as { defaultProfile?: string };
                if (e.target.value) area.defaultProfile = e.target.value;
                else delete area.defaultProfile;
                setSaved(false);
                setDraft(next);
              }}
            >
              <option value="">— board default ({model.defaultProfile}) —</option>
              {Object.keys(draftProfiles).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="settings-section">
        <h3>Proof types</h3>
        <p className="hint">
          The vocabulary <code>proof:&lt;type&gt;</code> validates against. Removing one
          invalidates any requirement naming it.
        </p>
        <label className="field">
          <span>Types</span>
          <input
            value={vocab.proofTypes.join(", ")}
            onChange={(e) => {
              const next = structuredClone(draft) as BoardConfig & { proofTypes?: string[] };
              const list = splitRequirements(e.target.value);
              if (list.length) next.proofTypes = list;
              else delete next.proofTypes;
              setSaved(false);
              setDraft(next);
            }}
          />
        </label>
      </div>

      <div className="settings-section">
        {error && <p className="error">{error}</p>}
        {dirty && changed.length > 0 && (
          <p className="banner warn">
            {changed.length} profile{changed.length === 1 ? "" : "s"} changed —{" "}
            <strong>{affected}</strong> ticket{affected === 1 ? "" : "s"} will be re-gated
            the moment this saves.
          </p>
        )}
        <button
          className="primary sm"
          disabled={!dirty || saving || Object.keys(errors).length > 0}
          onClick={() => {
            setSaving(true);
            setError(null);
            void client
              .setBoard(draft)
              .then(() => load())
              .then(() => setSaved(true))
              .catch((e) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Saving…" : "Save profiles"}
        </button>
        {saved && !dirty && <span className="hint"> Saved.</span>}
      </div>

      <p className="hint">
        Gate-exempt folders — <code>{(model.gateExemptFolders ?? []).join("</code>, <code>")}</code> —
        hold inputs and provisional notes, so they never satisfy a requirement.
      </p>
    </>
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

function pluralKey(_kind: ColumnKind): keyof BoardConfig {
  return "areas"; // the only editable column kind in format 3
}

/** Mirror of core's write-side checks, so problems surface inline pre-save. */
function validateDraft(draft: BoardConfig, board: BoardConfig, items: Item[]): string[] {
  const problems: string[] = [];
  // Stages and priorities are no longer board data, so areas are all there is
  // to validate here.
  if (draft.areas.some((c) => !c.name.trim())) problems.push("Every area needs a name.");
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
    ["area", "area", board.areas, draft.areas],
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
  // Profile/requirement validation lives in core (validateProfileMap) and is
  // surfaced through the save path; there is no board-side gate shape to check
  // here any more.
  return problems;
}

function countUsage(items: Item[]) {
  const acc = { area: {} as Record<string, number> };
  for (const i of items) {
    if (i.area) acc.area[i.area] = (acc.area[i.area] ?? 0) + 1;
  }
  return acc;
}

function RemoteSection({ projectId }: { projectId: string }): JSX.Element {
  const [view, setView] = useState<RemoteProjectView | null>(null);
  const [status, setStatus] = useState<RemoteStatus | null>(null);
  const [doctor, setDoctor] = useState<RemoteDoctorResult | null>(null);
  const [token, setToken] = useState<{ deliveryId: string; value: string; expiresAt: number } | null>(null);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<RemoteConfigInput>({ executable: "", tunnelId: "", credentialsFile: "", hostname: "", enabled: false });
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (clipboardTimer.current) clearTimeout(clipboardTimer.current); }, []);

  useEffect(() => {
    if (!token) return;
    const deliveryId = token.deliveryId;
    const timer = setTimeout(() => {
      void window.kanmer.remoteConsumeSecret(deliveryId).catch(() => undefined);
      setToken(null);
      setTokenRevealed(false);
      setMessage("The one-time token delivery expired without being copied.");
    }, Math.max(0, token.expiresAt - Date.now()));
    return () => {
      clearTimeout(timer);
      void window.kanmer.remoteConsumeSecret(deliveryId).catch(() => undefined);
    };
  }, [token]);

  const load = useCallback(async () => {
    try {
      const next = await window.kanmer.remoteRegister(projectId);
      setView(next);
      setStatus(next.status);
      setDraft({ executable: next.config.executable, tunnelId: next.config.tunnelId, credentialsFile: next.config.credentialsFile, hostname: next.config.hostname, enabled: next.config.enabled });
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }, [projectId]);

  useEffect(() => {
    void load();
    const remove = window.kanmer.onRemoteStatus((next) => {
      if (next.projectId === projectId) setStatus(next);
    });
    return remove;
  }, [load, projectId]);

  const run = async (operation: string, action: () => Promise<void>) => {
    setBusy(operation); setError(null); setMessage(null);
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(null); }
  };

  const save = () => run("save", async () => {
    const next = await window.kanmer.remoteSaveConfig(projectId, draft);
    setView(next); setStatus(next.status); setMessage("Cloudflare configuration saved. Store the tunnel credentials file outside the project.");
  });

  const createSecret = (rotate: boolean) => run(rotate ? "rotate" : "create", async () => {
    const delivery = await window.kanmer.remoteCreateSecret(projectId, rotate);
    setToken({ deliveryId: delivery.deliveryId, value: delivery.token, expiresAt: Date.parse(delivery.expiresAt) });
    setTokenRevealed(false);
    setMessage(rotate ? "Token rotated. Copy it now; it will not be shown again." : "Token created. Copy it now; it will not be shown again.");
    await load();
  });

  const copyToken = async () => {
    if (!token) return;
    const copied = token.value;
    await navigator.clipboard.writeText(token.value);
    await window.kanmer.remoteConsumeSecret(token.deliveryId);
    setToken(null);
    setTokenRevealed(false);
    setMessage("Token copied. It is no longer available in Kanmer.");
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    clipboardTimer.current = setTimeout(() => {
      void clearClipboardIfUnchanged(navigator.clipboard, copied)
        .then((cleared) => { if (cleared) setMessage("The copied token was cleared from the clipboard."); })
        .catch(() => setMessage("Kanmer could not verify clipboard cleanup; replace the copied token manually."));
    }, 60_000);
  };

  const start = () => run("start", async () => { const next = await window.kanmer.remoteStart(projectId); setStatus(next); });
  const stop = () => run("stop", async () => { const next = await window.kanmer.remoteStop(projectId); setStatus(next); });
  const runDoctor = () => run("doctor", async () => { setDoctor(await window.kanmer.remoteDoctor(projectId)); });
  const active = status?.state === "ready" || status?.state === "starting" || status?.state === "degraded";

  return (
    <div className="settings-section">
      <h3>Cloudflare Tunnel</h3>
      <p className="hint">Remote access is per project. Kanmer stores only this project’s Cloudflare references and keeps the bearer token in encrypted OS storage.</p>
      {view?.identity && <p className="hint">Project fingerprint: <code>{view.identity.fingerprint}</code></p>}
      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner success">{message}</div>}
      <div className="field-row">
        <label className="field"><span>cloudflared executable</span><input value={draft.executable} onChange={(e) => setDraft({ ...draft, executable: e.target.value })} placeholder="C:\\Tools\\cloudflared.exe" /></label>
        <label className="field"><span>Tunnel id</span><input value={draft.tunnelId} onChange={(e) => setDraft({ ...draft, tunnelId: e.target.value })} /></label>
      </div>
      <label className="field"><span>Credentials file</span><input value={draft.credentialsFile} onChange={(e) => setDraft({ ...draft, credentialsFile: e.target.value })} placeholder="C:\\Users\\…\\.json" /></label>
      <label className="field"><span>Public hostname</span><input value={draft.hostname} onChange={(e) => setDraft({ ...draft, hostname: e.target.value })} placeholder="kanmer.example.com" /></label>
      <label className="checkbox"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Enable this project’s Cloudflare remote access</label>
      <div className="button-row">
        <button className="primary sm" disabled={busy !== null} onClick={() => void save()}>{busy === "save" ? "Saving…" : "Save configuration"}</button>
        <button className="ghost sm" disabled={busy !== null || !view?.config.executable || view.config.secretConfigured} onClick={() => void createSecret(false)}>Create token</button>
        <button className="ghost sm" disabled={busy !== null || !view?.config.secretConfigured || active} onClick={() => void createSecret(true)}>Rotate token</button>
      </div>
      {token && <div className="banner warn" role="status"><strong>Copy this token now.</strong><code aria-label={tokenRevealed ? "One-time token" : "Hidden one-time token"}>{tokenRevealed ? token.value : "•".repeat(token.value.length)}</code><button className="ghost xs" onClick={() => setTokenRevealed((revealed) => !revealed)} aria-label={tokenRevealed ? "Hide one-time token" : "Reveal one-time token"}>{tokenRevealed ? "Hide" : "Reveal"}</button><button className="primary xs" onClick={() => void copyToken()}>Copy and dismiss</button></div>}
      <div className="settings-section">
        <h4>Status: {status?.state ?? "disabled"}</h4>
        {status && <p className="hint">Local: <strong>{status.local}</strong> · Tunnel: <strong>{status.tunnel}</strong> · Public: <strong>{status.public}</strong></p>}
        {status?.lastError && <p className="error-text">{status.lastError}</p>}
        {status?.endpoint && <p className="hint">Endpoint: <code>{status.endpoint}</code> <button className="ghost xs" onClick={() => void navigator.clipboard.writeText(status.endpoint!)}>Copy endpoint</button></p>}
        <div className="button-row">
          <button className="primary sm" disabled={busy !== null || active || !view?.config.secretConfigured} onClick={() => void start()}>{busy === "start" ? "Starting…" : "Start"}</button>
          <button className="ghost sm" disabled={busy !== null || !active} onClick={() => void stop()}>{busy === "stop" ? "Stopping…" : "Stop"}</button>
          <button className="ghost sm" disabled={busy !== null || !view?.config.secretConfigured} onClick={() => void runDoctor()}>{busy === "doctor" ? "Checking…" : "Run doctor"}</button>
        </div>
      </div>
      {doctor && <div className={`banner ${doctor.ok ? "success" : "error"}`}><strong>{doctor.summary}</strong><ul>{doctor.checks.map((check) => <li key={check.id}>{check.id}: {check.status} — {check.detail}</li>)}</ul></div>}
    </div>
  );
}

export async function clearClipboardIfUnchanged(clipboard: Pick<Clipboard, "readText" | "writeText">, expected: string): Promise<boolean> {
  const current = await clipboard.readText();
  if (current !== expected) return false;
  await clipboard.writeText("");
  return true;
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
