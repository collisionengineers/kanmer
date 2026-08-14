# Phase 7 — Agents: dispatch a ticket to a background agent

**Goal:** a "Dispatch to agent" action that spawns a headless agent CLI in the background against a ticket (`claude -p` / `codex exec` / `opencode run` / `grok -p`), streaming output to the ticket's scratch file and a live status surface. Nothing like this exists today (only `connect.ts`'s one-shot `exec` for `mcp add`).

**Depends on:** Phase 6 (provider registry + `dispatch` capability), Phase 1 (scratch folder), Phase 2 (`takeTicketPromptText` SSOT). **Scope:** `@kanmer/gui` main + shared + a small core export.

## Items

### 7.1 `dispatch.ts` — L (request #10)
- **Where:** new `main/dispatch.ts`; `providers.ts` (`dispatch(root, prompt)` per host); `shared/ipc.ts`; `main/index.ts`.
- Uses **`child_process.spawn`** (long-running, streamed) — not `exec`. `dispatchTicket(provider, ticketId, root)` builds the prompt from **`takeTicketPromptText(id)`** (the shared core export, single source with the MCP `take-ticket` prompt — never copy-paste it) and spawns `<cli> <headlessFlag> "<prompt>"` with `cwd: root`. Per-host flags from the registry: `claude -p`, `codex exec`, `opencode run`, `grok -p --cwd <root> --no-auto-update`. **antigravity register-only in v1** (`agy -p` hangs when spawned with piped stdout, GH #318/#76) — exclude it from `DISPATCH_TARGETS`, or gate behind a pty + `--output-format json` and label experimental.
- **The agent is the worker, not the log.** The take-ticket prompt drives the spawned agent to work the ticket **end-to-end** — take it, create the worktree, implement, open the PR — writing the clean pipeline docs and its own scratch notes itself via the MCP tools. Dispatch's output capture is diagnostics of that run, not the deliverable.
- Track handles in a `Map<dispatchId, DispatchHandle>`; stream stdout/stderr to an **app-local log** (`userData/dispatch/<dispatchId>.log` — never the repo: `.kanmer/` is committed) **and** to the renderer via a new `onDispatchStatus` event. On exit, set status, emit a final event, keep the log, and write **one** bounded summary to the ticket via a single `appendScratch(id, "dispatch", …)` — provider, exit status, duration, last ~50 output lines — so the ticket records the run without per-chunk activity-log churn (the activity log rotates at 512 KB / 5000 lines).

### 7.2 Guards + lifecycle — M
- **Pre-flight:** refuse if the ticket is already `taken` by someone else (surface "held by X; release first", mirroring `kanmer-execute`'s coordination); per-ticket in-flight lock (key the Map by `ticketId`); CLI-missing (`ENOENT`) → the same copy-fallback ethos as Connect. **Worktree:** dispatch does **not** create a worktree — it spawns at the repo root and lets the agent's skill own `git worktree add .worktrees/<id>` (pre-creating would collide). Cross-ticket concurrency is naturally conflict-free via the worktree-per-id model.
- **Cleanup:** on `app.will-quit`, kill all tracked children — **tree-kill on Windows** (agent CLIs spawn git/node grandchildren; a bare `child.kill()` orphans them). `detached:false` default (children die with the app); a "keep running after close" mode is a later opt-in. Soft concurrency cap, a **per-dispatch timeout** setting (default ~30 min; on expiry tree-kill + mark `timed-out`), and `listDispatches`/`cancelDispatch`.

### 7.3 UI hooks — M
- **Handoff to GUI:** a native item-menu "Dispatch to agent →" submenu (`showItemMenu` `main/index.ts:352-387`, action union gains `{type:"dispatch", target}`) and/or an Editor headbar button (`Editor.tsx:364-378`). New IPC `dispatchAgent`/`cancelDispatch`/`listDispatches`/`onDispatchStatus` (channel + handler `main/index.ts:447-449` pattern + preload wrapper).
- **Dispatches drawer:** a small panel (activity-feed pattern) listing running/finished dispatches — provider, ticket, elapsed, status — with a **live output tail** from the app-local log and a cancel button; dispatched tickets get a spinner badge on their card (partially delivers the never-built agent-presence indicator from the Phase 0 loose ends).

## Risks
- **Spawning external processes from Electron** — inherited env, grandchildren, orphaning on quit → tree-kill + tracked PIDs, reconcile stale handles on restart.
- **Secrets/auth** — grok needs `XAI_API_KEY`; others need prior login. Surface "authenticate `<cli>` first"; don't log stdout blindly if agents echo secrets.
- **Runaway processes** — no cap → soft concurrency limit + visible `listDispatches`/`cancelDispatch`.

## Release rail
No new MCP tools. `takeTicketPromptText` relocation (Phase 2) is the only cross-package change. `AGENTS.md` §5 documents dispatch + the provider/dispatch split.

## Verification
- Inject a fake spawn (a `node -e` echo) to test lifecycle without a real agent: status transitions, app-local log write, exit-summary lands in scratch as one append, `taken` refusal, in-flight guard, timeout fires, `cancelDispatch` kills the tree.
- A test that `takeTicketPromptText(id)` contains the id and the MCP prompt uses it (drift guard).
- Manual: dispatch a ticket to claude against a sandbox; confirm the agent takes the ticket and writes real pipeline docs, the drawer shows the live tail, the exit summary appears in scratch, status updates, cancel works.
