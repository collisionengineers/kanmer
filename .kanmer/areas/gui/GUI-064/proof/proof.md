# Proof

PR [#29](https://github.com/collisionengineers/kanmer/pull/29), merged
(`e293df0`), plus follow-up `c8b94a4`. Released as **v0.3.2** and verified by
performing the real update that had been failing.

> Written directly to the ticket folder: the verification run stops agent MCP
> servers, which is the transport the `set_ticket_doc` tool uses. Recording that
> plainly rather than pretending the tool wrote it.

## The two-version install cycle — the thing FRD-021 admitted had never run

Machine state before: **0.3.0 installed**, 0.3.1 downloaded and staged, three
prior attempts having failed with `uninstallFailed: 2`. Kanmer's GUI was already
closed by the user, which the report shows was not enough.

```
=== BEFORE ===
installed version: 0.3.0.0
agent MCP servers under INSTDIR: 1  pids: 34524
files that cannot be renamed: 2
    icudtl.dat
    v8_context_snapshot.bin

=== STOP (what stopMcpSessions() now does) ===
  taskkill /pid 34524 /T /F
files that cannot be renamed now: 0

=== INSTALL 0.3.2 ===
running: Kanmer Setup 0.3.2.exe /S
installer exit code: 0

=== AFTER ===
installed version: 0.3.2.0
```

`command-log`. This is the whole claim in one run:

1. With the app closed and one agent MCP server alive, exactly the two files
   V8 and ICU memory-map are un-renameable — which is what makes
   `un.atomicRMDir` abort and produce `: 2`.
2. Stopping that one process — the operation `stopMcpSessions()` performs —
   takes the count to **0**.
3. The install then **succeeds**, exit code 0, where three prior attempts had
   failed.

The blocked count going 2 → 0 across a single `taskkill`, with nothing else
changed, is the causal link. Note also what is *absent* from the before-list:
`Kanmer.exe` and every DLL are renameable throughout. The obvious suspect never
was the problem.

## The shipped binary carries the fix

Reading the installed asar (`%LOCALAPPDATA%\Programs\Kanmer\resources\app.asar`,
3,549,892 bytes) rather than trusting the build:

```
version: 0.3.2.0
  still running from the Kanmer install folder         1
  could not confirm that agent MCP sessions            1
  stopMcpSessions                                      4
  taskkill                                             2
```

Both refusal messages and the stop path are present in the installed app, so
the next update is the automatic case rather than the manual one performed here.

## Rail, on the merged base

```
npm test                 201 passed (21 files)
npm run typecheck -w @kanmer/gui   clean
npm run build            core + mcp-server + plugin bundle
npm run smoke:protocol   26/26 checks passed
npm run plugin:check     29 tools match, bundle bytes match
npm run check:manual     up to date (12 chapters)
KANMER_SMOKE=1 electron out/main/index.js    exit 0
node scripts/release.mjs 0.3.2 --dry-run     verification gate passed
```

24 of those tests are new or updated here, covering respawn, probe failure, a
session with no usable pid, a killer that throws, and non-Windows.

## Release

```
Kanmer-Setup-0.3.2.exe           78035151
Kanmer-Setup-0.3.2.exe.blockmap     82158
latest.yml                            340
latest.yml HTTP 200 · /releases/latest = v0.3.2
```

## What this run does NOT prove

Stated plainly, because the checklist has boxes it does not close:

- **The automatic path was not exercised end-to-end.** The fix runs in the
  version *doing* the updating, and the machine was on 0.3.0, which predates it.
  This update was therefore driven by hand, performing exactly the sequence the
  code now performs. Proving the automatic path needs 0.3.2 → 0.3.3 and belongs
  to the next release.
- **The refusal dialog was not seen by a human** (checklist box 13). Its logic
  is unit-tested and its strings are verified present in the shipped asar, but
  nobody has looked at it on screen.
- **The respawn timing (box 1) was still not measured.** The instrumentation
  line in the run script had a PowerShell syntax error and printed nothing. What
  is known: after the kill, the lock count was 0 and the agent host did not
  bring the server back, so no respawn occurred in this instance. The bounded
  retry loop is correct either way and both outcomes are unit-tested; the timing
  number remains unmeasured.

---

**Merged:** PR [#29](https://github.com/collisionengineers/kanmer/pull/29) —
`MERGED` 2026-08-16T15:04:51Z, merge commit `e293df0`; follow-up `c8b94a4`
(GUI typecheck). Shipped in **v0.3.2**.

**Post-closeout confirmation.** After the install, with the app relaunched and
an agent MCP session reconnected against the *new* build:

```
installed version: 0.3.2.0
processes from INSTDIR: 5
  12644  Kanmer.exe                       (main)
  39468  Kanmer.exe --type=gpu-process
  39552  Kanmer.exe --type=utility
  22716  Kanmer.exe --type=renderer
  20912  Kanmer.exe …\plugins\kanmer\mcp\kanmer-mcp.cjs   (agent MCP server)
```

The MCP server is once again a process under `$INSTDIR` — pid 20912 replacing
the pid 34524 that blocked the update. That is expected and unchanged: the root
cause is the registration itself, and this ticket manages the symptom. The
difference is that 0.3.2 will now stop that process itself before an update
rather than losing a race to it.
