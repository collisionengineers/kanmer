# Open questions — MCP-008

Research settled the two big ones. **Headless needs no Electron** (proved by
running the standalone bundle in an isolated directory under plain Node —
120/120 smoke checks) and **`.mcpb` can ask the user for the board** (via
`user_config` with `type: "directory"`, interpolated into `--root`). What is left
are scope and sequencing decisions, most of which only the operator can make.

---

## ⚠️ OPERATOR-ONLY — cannot be resolved by reading code

These need a human decision or a machine the agent does not have. Planning must
not silently assume an answer.

- [ ] **O1 — Does the `.mcpb` half wait for MCP-005, or ship independently?**
      MCP-005 blocks this ticket, but research found the `.mcpb` is *largely
      insulated*: it carries its own copy of the server payload, and Claude
      Desktop unpacks it into its own per-user extensions directory — already
      outside `%LOCALAPPDATA%\Programs\Kanmer` by construction. The only real
      coupling is *which build output the `.mcpb` build script copies from*, and
      whether MCP-005 lands a native binary (→ `server.type: "binary"`) rather
      than a `.cjs` (→ `"node"`). **Split the ticket, or hold the whole thing
      until MCP-005 decides?**

- [ ] **O2 — Which platforms does the `.mcpb` `compatibility.platforms` claim?**
      Claude Desktop runs on `darwin` and `win32`. Kanmer ships **Windows NSIS
      only** (`apps/gui/electron-builder.yml`). The bundle payload is
      platform-neutral JS and would very likely work on macOS, but *nobody can
      test it here* — this machine is Windows 11 and the isolated-Node proof was
      Windows-only. Claiming `darwin` untested is a support liability; claiming
      `win32` only is honest but narrows the format's main audience. **Which?**
      (Sub-risk if `darwin` is claimed: chokidar 3's optional `fsevents` is
      externalised from the bundle and would not resolve inside an `.mcpb`. It is
      `require`d in a try/catch and the watcher is lazy — only reached on
      `resources/subscribe` — so the expected outcome is a silent fallback to
      `fs.watch`. **Expected, not verified.**)

- [ ] **O3 — One board per installed extension: acceptable for v1?**
      `--root` takes exactly one value, and `user_config` `multiple: true`
      expands into several separate `args` the server cannot consume. So a user
      with three projects installs the extension once and gets one board — or we
      teach the server multiple roots, which is a real design change to
      `KanmerStore` and every tool signature. **Ship single-board and file
      multi-board as its own ticket, or scope it in now?**

- [ ] **O4 — Does the `.mcpb` become a GitHub release asset?**
      That means editing `scripts/release.mjs`, which carries explicit hard-won
      constraints (tag before publish; **never delete assets from old releases**
      because `Provider.getBlockMapFiles` derives URLs from them; re-uploading to
      a release older than 2 hours needs special handling). The safer
      alternative is building it out-of-band and attaching by hand. There is no
      CI in this repo at all (`.github/` does not exist), so nothing automates
      either path. **Automate into the release rail, or keep it manual?**

- [ ] **O5 — Is `@anthropic-ai/mcpb` a devDependency or a documented
      prerequisite?** The official guidance is `npm install -g @anthropic-ai/mcpb`.
      A devDependency makes the build reproducible and CI-able later; a documented
      prerequisite keeps the workspace lighter. **Which fits the project's taste?**

- [ ] **O6 — Who performs the acceptance test?**
      "A `.mcpb` installs into Claude Desktop and connects to a chosen project
      root" is a **human test on a real Claude Desktop install**. It cannot be
      automated in this repo and cannot be done by the implementing agent. The
      plan needs a named manual verification step with the operator as the actor,
      or the acceptance criterion needs rewording.

---

## Technical — resolvable, but a decision the plan must state

- [ ] **T1 — Does this ticket wait for MCP-010, or ship before it?**
      MCP-010 does **not** solve the desktop case (its whole ladder is rooted at
      `process.cwd()`, and a desktop app's cwd is meaningless), so it is not a
      blocker. But it decides the manifest's help text and what the user is
      allowed to pick: with MCP-010, `<repo>` works; without it, the user must
      pick `<repo>/.worktrees/kanmer` — a path that does not exist until the
      desktop app has been run once, and which most users would never guess from
      a folder dialog. **Ship with the narrow instruction now, or sequence after
      MCP-010 for the better picker?**

- [ ] **T2 — Where do the manifest and staging directory live in the repo?**
      `plugins/kanmer/` is the existing precedent for "a distributable assembled
      from the standalone bundle". A sibling `mcpb/` at the repo root is the
      obvious parallel, but this should be chosen deliberately — the payload now
      has three homes and version drift across them is a *documented* past
      failure (MCP-011: `plugin.json` stuck at `0.1.0` against a repo at
      `0.3.2`, silently disabling "Update skills"). Whatever the location, the
      plan must say which rail asserts (a) payload bytes match a fresh build and
      (b) manifest `version` matches the repo version.

- [ ] **T3 — Does the `.mcpb` ship skills, or only the MCP server?**
      Kanmer's skills reach Claude Code via the plugin marketplace and other
      hosts via the AGENTS.md block (`connect.ts` `installSkills`). An `.mcpb` is
      an MCP-server bundle; the manifest has `prompts`, and the server already
      registers `standup` and `take-ticket` prompts, but nothing equivalent to
      the skill set. A desktop user therefore gets the tools without the
      workflow guidance the skills provide. **Accept that gap and document it, or
      is it a follow-up ticket?**

- [ ] **T4 — What exactly does FRD-022 promise about the unsynced board?**
      With the app closed, git auto-sync (FRD-020 R3, a GUI timer) does not run,
      so a headless session accumulates uncommitted changes on the board branch.
      The ticket rules out building a committer. The remaining choice is wording:
      does FRD-022 say "commits are the user's responsibility while the GUI is
      closed", or does it go further and require the server to *surface* the
      unsynced state (e.g. in `get_status`)? The latter is a server change and a
      scope increase. **Which limit is being promised?**

## Parked (explicitly deferred)

- Signing the bundle (`mcpb sign`, PKCS#7/X.509). Available, not needed for
  direct install; revisit if Kanmer ever distributes broadly.
- Submission to the Connectors Directory. The Anthropic guide notes MCPB is the
  *secondary* distribution path and submission adds mandatory tool annotations, a
  privacy policy, and worked examples per tool. Well beyond this ticket.
- Multi-root / multi-board support in one server process — see O3; if the answer
  is "later", it becomes its own ticket rather than living here.
- Linux. Claude Desktop does not run there.
