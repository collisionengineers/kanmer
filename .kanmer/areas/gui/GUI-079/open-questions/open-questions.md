# Open questions — GUI-079

All eight are answered. Q1–Q4 were answered **by the operator** on 2026-08-16 —
full text in `scratch/operator-answers.md`, which is binding and not to be
re-opened. Q5–Q8 were resolved during planning, empirically where possible.

## ⚠ Operator decisions — answered 2026-08-16

- [x] **Q1 — What is the ownership rule for `mcpServers.kanmer` in `.mcp.json`?**
      **Answer: (c) move grok off the shared file. `.mcp.json` belongs to Claude
      alone.** Chosen deliberately over the cheaper marker and shape-fingerprint
      options. Consequences to implement, not re-debate: existing grok users
      **reconnect once** (say so in the release notes and FRD-012 — do *not*
      auto-migrate by rewriting `.mcp.json`, which is the behaviour this ticket
      exists to stop), and **`isRegistered()` (`connect.ts:117`) moves with it**,
      because it reads `mcpServers.kanmer` to decide whether *grok* is connected,
      so a Claude-only project reports grok as registered and
      `hasRegisteredCopySkillsPeer` keeps the AGENTS.md block alive for a host
      never connected. Fixing unmerge without fixing the read is half a fix.
      *Implementation:* grok moves to **`.grok/config.toml`** — re-verified today
      against the installed grok CLI (`grok mcp add --scope project` writes it;
      `~/.grok/docs/user-guide/07-mcp-servers.md` documents it as the native
      project scope and the **highest-priority** source, with `.mcp.json` a
      conditional, lowest-priority *compat* source). Ownership is pushed into
      the provider registry as `register.isRegistered(contents)`, so the read and
      the write are answered in one place.

- [x] **Q2 — When a legacy global entry has no project-scoped replacement, what
      does the sweep do?** **Answer: report it and refuse to remove it.** The
      operator explicitly chose the option that refuses. The warning names the
      project and says what to do — open it and click Connect first. Kanmer never
      writes another project's config files; the "reconnect that project for you"
      option was rejected.

- [x] **Q3 — Where does the sweep live?** **Answer: the GUI's Connect panel**,
      not `kanmer-setup`. `Settings.tsx` + IPC are therefore in scope. One
      prompt, listing every global `kanmer-*` found, each marked as having a
      project-scoped replacement or not.

- [x] **Q4 — May Kanmer drain a project's registration without that project
      being open?** **Answer: yes, and the Connect hint copy does NOT need
      reversing.** Removing a *global* entry is not "writing outside this
      project" in the sense the copy means. Tighten the wording if it reads
      ambiguously; do not reverse the promise.

## Technical questions — resolved during planning

- [x] **Q5 — Is `codex mcp remove` formatting-safe on the global config?**
      **Answer: yes — proven, not assumed.** Run against a synthetic `CODEX_HOME`
      fixture carrying `startup_timeout_sec = 120.0`, two literal-quoted
      `[projects.'c:\…']` trust headers, a top-of-file comment and a second MCP
      server. `codex mcp remove kanmer-pegasus` printed "Removed global MCP
      server", and `diff -u` against the pre-image shows exactly one deletion
      hunk — the `[mcp_servers.kanmer-pegasus]` block and its own preceding
      comment. The float, the literal quoting and every other byte survived.
      Removal therefore delegates to `codex mcp remove`; the TOML parse is for
      **listing only** (F1: Kanmer's own round-trip is destructive).

- [x] **Q6 — What happens when `codex` is not on PATH?** **Answer: the copy-paste
      fallback (FRD-012 AC-4), never a swallowed failure.** Listing is a pure
      TOML parse and still works. Each removal reports its own `ok`/output and
      carries the exact `codex mcp remove <name>` command; a missing CLI shows up
      as every entry failing with the command to run by hand. `connectAgent`'s
      `.catch(() => undefined)` is deliberately *not* copied — a drain that
      reports success it did not achieve is worse than no sweep.

- [x] **Q7 — An entry whose recorded project root no longer exists on disk?**
      **Answer: a distinct `orphaned` class — removable, but never
      pre-selected.** It is not the protected case: a folder that does not exist
      has no registration to cut. But the probe can be wrong (an unmounted drive,
      a moved checkout), so it never rides along with the recommended selection
      and the row says plainly that an unmounted drive is a reason to leave it.
      The operator's refusal for *no-replacement* is untouched and has no
      override.

- [x] **Q8 — Should the sweep list well-formed legacy entries whose project has
      reconnected but which are shadowing it?** **Answer: yes, and trust gates
      the classification.** A project-scoped replacement codex will not load is
      not a replacement, so `codexTrustFromConfig` runs against the same global
      string already in hand: only `trusted` makes an entry drainable.
      `untrusted` and `maybe-via-ancestor` are reported as their own class and
      are **not removable** — the detail says to trust the folder. Treating
      "maybe" as not-trusted errs toward leaving the entry in place, which is the
      safe direction.

## Parked (explicitly deferred)

- Auto-migrating existing grok users off `.mcp.json`. Explicitly rejected by the
  operator (Q1) — they reconnect once.
- Repairing stale install paths inside the entries the sweep enumerates. Out of
  scope here (see `files`), but the sweep is the first thing that will have the
  full list in hand, so it is the natural home for that later feature.
- Extending the sweep to non-codex hosts. None of them ever wrote a global
  per-project entry, so there is nothing to drain today.
- A comment-preserving TOML writer. `.grok/config.toml` inherits ADR-0007's
  accepted round-trip tradeoff for *project* files; see ADR-0012's consequences.

---

**Note for whoever verifies this:** the pegasus reproduction is gone. The live
`~/.codex/config.toml` no longer holds any `mcp_servers.kanmer-*` entry, and
`pegasus/.codex/config.toml` now carries a proper `[mcp_servers.kanmer]`. The
"no replacement" case must be a hand-written fixture; it cannot be observed on
this machine any more.
