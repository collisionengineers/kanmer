# Open questions — MCP-005

Two of these are **operator-only** and are flagged first. They are product and
cost decisions, not things an implementer may pick silently.

## Operator-only — answer before planning

- [ ] **OPERATOR: is ~192 MB of duplicated runtime per user acceptable, and when
      is it paid?** Relocation means copying `Kanmer.exe` (180.8 MB) +
      `icudtl.dat` (10.5 MB) + `v8_context_snapshot.bin` (0.66 MB) out of the
      265 MB install, so a machine with an agent connected carries ~457 MB. The
      alternative — shipping a ~80 MB standalone Node — adds ~80 MB to *every*
      download including users who never connect an agent, and creates a second
      binary needing its own signing subject and SmartScreen reputation.
      Sub-question, same decision: is the copy paid at **install** (slows every
      install), at **first Connect** (a visible pause in the modal), or **lazily
      in the background at boot** (invisible, but Connect can be asked for a
      path that is not ready yet)?

- [ ] **OPERATOR: may Kanmer rewrite provider config files in projects the user
      did not just open?** The migration sweep would edit `.mcp.json`,
      `.codex/config.toml`, `opencode.json` and `.agents/mcp_config.json` in
      every project it can find, unprompted, on the update that ships this. Note
      `codexTomlMerge` re-serialises TOML and **loses comments**
      (`providers.ts:152-154`) — today that only happens when the user clicks
      Connect. The options are: (a) sweep silently, (b) sweep after a one-time
      "Kanmer needs to update N agent registrations — Update / Not now" prompt,
      (c) never sweep, only rewrite on the next Connect. (c) is the most
      conservative and leaves the most projects on the legacy path.

## Design questions the plan must not assume

- [ ] **Is a directory junction the mechanism for the stable `current` path, and
      does it hold on every real machine?** `mklink /J` needs no elevation and no
      Developer Mode, and retargeting it while a server runs from the old target
      is safe. Unverified: redirected/roamed `%LOCALAPPDATA%`, non-NTFS volumes,
      and whether any agent host canonicalises the path it stores (which would
      re-introduce the versioned path into the config and undo the whole point).

- [ ] **Does an agent host resolve `command` at spawn time or cache the resolved
      target?** The junction design assumes the former. If a host stores the
      real path it resolved once, registrations go stale on the next release
      anyway and the design needs a different stable-path trick.

- [ ] **How is a project that is never reconnected surfaced, and for how long is
      the legacy path supported?** Current answer from research: it keeps
      working (the `.cjs` must keep shipping in `resources/mcp/` for exactly
      this reason) and keeps locking `$INSTDIR`, with `stopMcpSessions()` as the
      safety net; `mcpSessions()` already knows each session's `--root`, so the
      app can name those projects and offer Reconnect. Undecided: whether that
      surface is a toast, a Connect-panel badge, or nothing — and whether the
      legacy `resources/mcp/kanmer-mcp.cjs` ships forever or has a stated expiry.

- [ ] **Does provisioning cope with two Kanmer instances, and with a running
      server, at the same time?** Two windows/instances could provision
      concurrently; a copy into a versioned dir that a live server is running
      from cannot be overwritten. The copy-to-`<v>.tmp`-then-rename plan needs a
      stated answer for "the target version dir already exists and is in use".

- [ ] **Do the plugin route and the Connect route unify on one runtime?**
      `plugins/kanmer/mcp/claude.mcp.json` registers `command: "node"` — the
      marketplace path already requires a Node install, contradicting
      `connect.ts:33-35`'s stated reason for using the Electron binary. Either
      the plugin should point at the relocated runtime too, or the "no Node
      required" constraint is narrower than the ticket states. MCP-008 inherits
      whichever answer this gets.

- [ ] **Does antivirus or SmartScreen object to copying a 180 MB executable into
      `%LOCALAPPDATA%` and launching it?** A common heuristic. Unmeasured, and
      only observable on a real machine with real AV — cheap to check once,
      expensive to discover after release.

- [ ] **Does an update actually leave a live relocated session alive end-to-end?**
      Research proves the relocated process loads **0 modules from `$INSTDIR`**,
      which is the mechanism; it does not prove a full 0.3.x → 0.3.y install
      cycle with a live session surviving. That is the ticket's first
      verification box and belongs to proof, not to research — but the plan must
      not treat it as already answered.

## Parked (explicitly deferred)

- Agent-host respawn timing. Folded in from GUI-064 and deliberately not
  measured: relocation makes it moot, and `stopMcpSessions()` is correct for
  both answers.
- Code signing. Adjacent and scheduled (AGENTS.md §11), a one-way door, and not
  this ticket's to open.
- `app.setName("Kanmer")` and the `%APPDATA%\@kanmer\gui` wart. Named in
  AGENTS.md §11 as a product decision that must ship alone; this ticket avoids
  `userData` entirely rather than depending on it.
