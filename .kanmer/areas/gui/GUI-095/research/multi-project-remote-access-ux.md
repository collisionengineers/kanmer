# Research — GUI-095 multi-project remote-access UX

## User model

Remote access is configured **per registered Kanmer project**. Each project has its own immutable project fingerprint, bearer credential, public hostname/tunnel identity, desired enabled/auto-start state, and runtime process generation. A single public endpoint never switches between projects.

The GUI may run several project remote hosts concurrently, but each project has at most one local HTTP host and one tunnel adapter generation. Start/stop/doctor/rotate operations are serialized per project. Cross-project startup uses a bounded queue so app launch cannot spawn an unbounded process storm.

## Information architecture

Add a Remote Access area reachable from the existing project/settings navigation. It must show every registered project, not only the currently open board. Recommended structure:

- overview list/cards: project name/id, safe path label, desired state, local/tunnel/public status, hostname, last doctor result/time, and primary action;
- project detail/configuration panel: provider, executable, named-tunnel id, public hostname, credential reference, bearer state/fingerprint, auto-start, start/stop, rotate, doctor, endpoint copy, and diagnostic events;
- first-use setup state: explains prerequisites and links to DOC-013 without embedding provider secrets;
- missing/moved project state: retains configuration but prevents start until project identity/path is reconciled.

Do not compress all health into one green/red indicator. Display three independent dimensions:

1. **Local MCP** — stopped, starting, ready, stopping, failed.
2. **Tunnel** — stopped, validating, starting, connected, degraded, restarting, failed.
3. **Public verification** — not run, checking, verified, warning, failed, stale.

“Connected” means cloudflared provider readiness; “Verified” means MCP-027 public doctor proved DNS/TLS/auth/MCP/project/tool policy/session close. The GUI must not label a live child PID as public success.

## Project card states and actions

- Not configured: `Configure`.
- Configured/stopped: `Start`, `Run configuration checks`, `Edit`, `Rotate token` where a credential exists.
- Starting: progress by explicit phase and `Cancel/Stop`.
- Connected but unverified: `Run public doctor` and a clear qualification.
- Verified: `Stop`, `Run doctor`, `Copy endpoint`, `Rotate token`.
- Degraded/restarting: next retry/attempt and `Stop`; no duplicate Start.
- Failed: first failing layer/code, one repair action, `Run doctor`, `Edit`, `Start` only after deterministic failures are corrected.
- Stopping: actions disabled except safe wait/status.
- Project missing/wrong fingerprint: `Locate/Reconcile project`; no start.

Destructive/sensitive actions require confirmation:

- rotate bearer token: states that all current sessions disconnect and clients need the new token;
- change hostname/tunnel/project while running: stop/restart required;
- remove remote configuration/credential reference;
- quit application while any GUI-owned remote host is active.

## Setup flow

Use a staged form with validation before save:

1. Select project (fixed when opened from its card).
2. Provider: only `cloudflared` in v1, while UI labels the architecture as provider-based rather than assuming Cloudflare fields globally.
3. Executable: auto-detected result or explicit path; run MCP-027 config checks.
4. Named tunnel: tunnel id/name, protected credentials-file reference, public hostname.
5. Bearer credential: generate new secure token or select/import through the approved protected flow; ordinary settings show only fingerprint/created time.
6. Review: exact project fingerprint, public endpoint, provider mode, auto-start, security statements.
7. Save configuration; optionally start.

Validation must use MCP-021/026/027 shared validators. Do not reproduce regexes or accept arbitrary cloudflared arguments/YAML.

## Token UX

A generated token is secret and must be treated differently from the public endpoint:

- generation is an explicit user action;
- show it only in a one-time modal after successful protected persistence;
- default display is masked; a deliberate reveal control is required;
- provide copy with a warning that it grants remote Kanmer authority;
- schedule clipboard clearing after a short documented interval **only if** the clipboard still contains exactly that token, so a newer user clipboard value is never erased;
- after closing the modal, ordinary settings show only token fingerprint and timestamps;
- routine status/doctor/export never reveals it;
- rotation uses the same one-time delivery and invalidates old sessions.

If secure persistence is unavailable or the selected Electron storage backend is explicitly unsafe, do not offer a misleading “saved securely” path. Block persistent/auto-start configuration and direct the user to the approved protected headless/manual option.

## Multi-project process behavior

- Persist desired configuration and non-secret metadata per project fingerprint.
- Runtime status is reconstructed from actual child readiness after every launch; never persist “connected” as truth.
- On application start, validate all enabled auto-start projects, then start in deterministic project order with a small concurrency cap (recommended two).
- One project's failure does not cancel unrelated projects.
- Reject duplicate public hostname and duplicate tunnel identity assigned to two active project configurations.
- Dynamically allocated local ports are runtime-only and not reused as project identity.
- If a project path moves but fingerprint matches after explicit reconciliation, update the registry without rotating the endpoint automatically.
- If fingerprint differs, treat it as another project and refuse silent config reuse.

GUI-owned remote hosts stop when the application truly quits. Closing a window must follow the application's existing tray/background policy; do not accidentally stop a process merely because a renderer reloads. A separate headless remote CLI can support operation without the GUI, but GUI and headless ownership of the same project/tunnel must be mutually exclusive and detected.

## Status/events

Consume normalized machine-readable events from MCP-021/025/026/027. Keep a bounded redacted per-project timeline with:

- requested action and generation;
- local ready/stopped;
- auth created/rotated/revoked fingerprint only;
- tunnel validation/start/readiness/degraded/restart/stop;
- doctor start/result and failed check id;
- process exit/forced cleanup.

Do not show raw child stderr as the primary UI. An expandable diagnostic view may show the bounded redacted event ring with copy/export after a canary-safe redaction pass.

## Accessibility and resilience

- Status meaning is conveyed by text/icons, not color alone.
- All controls are keyboard reachable with clear focus order and accessible names.
- Progress is announced without stealing focus.
- Confirmations identify the project and consequence.
- Long paths/hostnames wrap/copy without overflowing.
- Renderer restart/reload rehydrates from main-process state and subscriptions without starting duplicate children.
- Stale events from an older generation cannot overwrite the current card.

## Test strategy

- pure renderer state/reducer and form validation tests;
- main-process manager/IPC tests with fake remote host/doctor/safe storage/clipboard;
- renderer component tests for every state and accessibility labels;
- Electron integration smoke for configure→generate→start→connected→doctor→verified→rotate→stop with fake provider;
- two-project concurrent/queued startup and isolated failure;
- renderer reload and application quit/orphan cleanup;
- canary scans proving no secret in settings, IPC events (except explicit one-time reveal response), DOM after modal close, logs, screenshots/snapshots, diagnostics, or persisted state.

## Non-goals

- No provider account/tunnel/DNS creation, executable download, Quick Tunnel production mode, OAuth, multi-board endpoint, browser management UI, background dispatch, or always-on system service.
