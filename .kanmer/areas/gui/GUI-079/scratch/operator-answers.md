## OPERATOR ANSWERS — 2026-08-16

**Q1 — ownership rule for `mcpServers.kanmer` in `.mcp.json`?
ANSWERED: move grok off the shared file. `.mcp.json` belongs to Claude alone.**

grok gets its own path. This is the largest change of the three options and the
operator took it deliberately over the cheaper marker and shape-fingerprint
options. Consequences to implement, not to re-debate:

- **Existing grok users must reconnect once.** Say so in the release notes and in
  FRD-012. Do not try to auto-migrate them by rewriting `.mcp.json` — that is the
  exact behaviour this ticket exists to stop.
- **`isRegistered()` (`connect.ts:117`) must move with it.** Research found the
  bug is bigger than disconnect: `isRegistered` reads `mcpServers.kanmer` out of
  `.mcp.json` to decide whether **grok** is connected, so a Claude-only project
  reports grok as registered and `hasRegisteredCopySkillsPeer` keeps the AGENTS.md
  block alive for a host that was never connected. Fixing unmerge without fixing
  the read is half a fix.

**Q2 + Q3 + Q4 — answered together: GUI panel, prompt once, refuse the risky ones.**

- **Where it lives: the GUI's Connect panel.** Not `kanmer-setup`. So this ticket
  does touch `Settings.tsx` + IPC — roughly half the file list is in scope.
- **One prompt, listing everything found**, with each entry marked as having a
  project-scoped replacement or not.
- **Entries WITH a replacement may be drained. Entries WITHOUT one are reported
  and NOT removed.** The operator explicitly chose the option that refuses. The
  warning must name the project and say what to do — open it and click Connect
  first. On this machine that entry was pegasus's only working registration; a
  wrong default silently cuts board access to a project the user is not looking at.
- **Kanmer never writes another project's config files.** The "reconnect that
  project for you" option was rejected. This also preserves the Connect UI's
  existing promise that registration writes nothing outside this project — so
  **that copy does NOT need rewriting**, contrary to the research doc's Q4 framing.
  Removing a *global* entry is not writing outside the project in the sense the
  copy means; if the copy is ambiguous on that point, tighten it rather than
  reversing it.
- **Reconciliation, so a no-op on second run** (ADR-0010).

**Removal must not round-trip the global TOML.** Research proved empirically that
`TOML.parse`/`TOML.stringify` on the real `~/.codex/config.toml` produces a
different file (9704 → 10092 bytes): `startup_timeout_sec = 120.0` collapses to
`120` on a field codex reads as f64, and all 65 `[projects.'c:\…']` literal-quoted
trust headers get rewritten as double-quoted escaped strings. Comments are lost
too. **Delegate removal to `codex mcp remove`** (verified present) and keep the
TOML parse for **listing only**.

**Key on `--repo-root ?? --root`, not the name.** `codexServerName` slugifies and
truncates a basename to 32 chars and basenames are not unique per machine, so the
"has a replacement?" probe must use the path the entry carries in `args`.

**The pegasus reproduction is gone** — `~/.codex/config.toml` now holds no
`kanmer-*` entry and pegasus has a proper project-scoped one. The fixture must be
synthetic. Build it from the shape research recorded, and keep the
no-replacement case as a named test.

**Amend ADR-0007** as the ticket says: the pile drains only for projects that are
actually reconnected, and the sweep is the thing that drains it.

**No manual ripple** — `build-manual.mjs` compiles nine curated FRDs and FRD-012
is not among them; ADRs never are. Verified, worth knowing because the repo's
conventions suggest otherwise.

**Lane B: GUI-080 goes first** (shares `connect.ts` and `providers.ts`). Rebase
onto it before opening this PR.
