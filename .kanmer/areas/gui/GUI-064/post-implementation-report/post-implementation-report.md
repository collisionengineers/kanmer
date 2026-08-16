# Post-implementation report — GUI-064

PR: https://github.com/collisionengineers/kanmer/pull/29
Branch: `gui-064-installer-lock` · commits `3d56ab9`, `1d9a10a`

## What changed, file by file

| File | Change | Why |
|---|---|---|
| `apps/gui/src/shared/mcp-sessions.ts` | `CimRow` gains `ProcessId`; `parseSessions` collects `pids[]`, deduped, tolerant of string/absent/invalid values | The count was enough to *warn* about a session. Stopping one needs a pid. A row that parses but yields no pid still counts — "found it, cannot stop it" must read as not-cleared. |
| `apps/gui/src/shared/ipc.ts` | `McpSessions.pids`; new `McpStopResult`; `installUpdate()` now `Promise<string \| null>` | The refusal has to reach the renderer as a value. |
| `apps/gui/src/main/mcp-sessions.ts` | CIM query selects `ProcessId`; new `stopMcpSessions`, `stopMcpSessionsSync`, `refusalMessage`, injectable `Killer` + `setKiller` | The stopping half. `taskkill /T /F` per `dispatch.ts:51-63`; 3 bounded rounds with a 700 ms settle. |
| `apps/gui/src/main/updater.ts` | `installUpdateNow` is async: stop → verify → install, else return the reason. Quit path stops sessions and, failing that, quits *without* installing | The precondition must complete before `quitAndInstall`, which spawns the installer before `app.quit()`. |
| `apps/gui/src/main/index.ts` | `CH.installUpdate` handler is async and returns the result | Previously `void`. |
| `apps/gui/src/renderer/src/App.tsx` | New `startInstall()`; both former call sites route through it; refusal shown as a 12 s toast; `mcpSessions()` catch fallback gains `pids: []` | One call site, not two — the call now has a return value that must be handled. |
| `apps/gui/src/renderer/src/lib/update.ts` | Comment only | See "changed less than planned". |
| `apps/gui/src/shared/mcp-sessions.test.ts` | 5 new tests; existing `toEqual`s updated for `pids` | Pid extraction incl. string pids, out-of-dir exclusion, dedupe, and the unusable-pid cases. |
| `apps/gui/src/main/mcp-sessions.test.ts` | **New**, 12 tests | The stop logic had no coverage because it did not exist. `execFile`/`execFileSync` mocked, killer injected — nothing real is killed. |
| `docs/functional/frd/FRD-021-auto-update.md` | Amendment section | See Governing docs. |
| `AGENTS.md` | Gotcha 10 rewritten; §11 limitation updated | Both said "we cannot prevent it", which is now half true. |
| `apps/gui/release-notes.md` | 0.3.2 section | Leads with the literal error string, because that is what a user searches for. |

## How this meets the governing docs

`docs/functional/frd/FRD-021-auto-update.md`:

- **R4 — restored, not changed.** *"Updates preserve that path's validity"* was
  not true while the update could not apply at all. No requirement text was
  edited.
- **R2 — untouched.** The gate is still in the renderer, still before the IPC
  call, still the only thing that starts an install.
- **The as-built gap it named itself** — *"the end-to-end two-version install
  cycle has not yet been run on a real build"* — is why this bug shipped. The
  amendment records that the cycle has now run and what it found.
- **Prose amended, with the reason stated:** the claim *"We cannot prevent it"*
  in the FRD and in `shared/mcp-sessions.ts`. We cannot prevent NSIS killing
  processes under `$INSTDIR`; we can prevent the install failing because of one.

No new ADR: this is a missing precondition, not an architectural decision. The
decision that *would* need one — moving the MCP server out of `$INSTDIR` — was
deliberately not taken (see Follow-ups).

## Where it differs from the plan

- **Step 7 (`restartWarning` wording) turned out to be unnecessary.** The plan
  assumed the sentence blamed the installer. Reading it, it says *"Restarting to
  update will close N agent MCP session(s)"* — it never named who closes them,
  so it is still true. Left the wording alone and added a comment recording why.
  Changing it would have been churn.
- **Step 1 (measure respawn) is not yet run.** It needs killing the MCP server
  that is driving this ticket. The design does not depend on the number: the
  bounded 3-round loop is correct whether the host respawns or not, and the
  respawn case is unit-tested both ways (converges, and gives up with a
  refusal). Recorded honestly rather than quietly skipped.
- **Two bugs in my own first cut, caught before commit.** The refusal was going
  to be delivered as `emit({ phase: "error" })`. That is wrong twice:
  `updateSurface` only renders `error` when `source === "manual"`, so an auto
  check's refusal would have been invisible — the exact class of bug as
  [[GUI-065]] — and it would have overwritten the `downloaded` phase, removing
  the banner and stranding an update still on disk. The refusal travels as the
  IPC return value instead.

## Verification run

```
npm test                 201 passed (21 files)
npm run typecheck        clean
npm run build            core + mcp-server + plugin bundle
npm run build -w gui     ok
npm run smoke:protocol   26/26 checks passed
npm run plugin:check     29 tools match, bundle bytes match
npm run check:manual     up to date (12 chapters)
KANMER_SMOKE=1 electron out/main/index.js    exit 0
```

## What `kanmer-verify` should run on merged main

The unit tests prove the logic; they cannot prove the fix. **Proof requires the
real two-version cycle** — the one FRD-021 admits was never run:

1. Install a build containing this change.
2. Start an agent MCP session against the *installed* app.
3. Confirm the lock: probe `$INSTDIR` for `DELETE` access → expect
   `blocked: 2` (`icudtl.dat`, `v8_context_snapshot.bin`).
4. Take an update to a newer build. Expect it to complete, and the same probe
   to read `blocked: 0` immediately before the installer runs.
5. **The negative case matters as much.** With a holder our predicate cannot
   see, expect a named refusal — app still running, update still downloaded —
   and specifically **not** `uninstallFailed: 2`.

## Risks and follow-ups

- **We now force-kill user processes.** Narrowed by the pre-existing predicate
  (`kanmer-mcp.cjs` *and* path under `$INSTDIR`), only on an explicit install
  action the user has already confirmed, never on a timer. A reviewer should
  check specifically that the predicate was not widened — widening it would kill
  the running app.
- **An unrelated holder (antivirus mid-scan) can still lock those files.** Not
  fixable from here. It now produces a named refusal instead of `: 2`.
- **The root cause is untouched.** AGENTS.md §11's stated fix — ship the MCP
  server outside `$INSTDIR`, or behind a shim — would end both this failure and
  the session loss. Raised for the user in `open-questions.md`; needs its own
  ticket and ADR.
