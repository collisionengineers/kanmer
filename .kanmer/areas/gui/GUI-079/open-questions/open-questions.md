# Open questions — GUI-079

## ⚠ Operator decisions — the plan must not assume these

These four are product/ownership calls, not implementation details. Answer them
before `kanmer-plan` runs; a plan that guesses will guess wrong in a way that is
expensive to undo, because two of them change what gets deleted off a user's
machine.

- [ ] **Q1 — What is the ownership rule for `mcpServers.kanmer` in `.mcp.json`?**
      Three candidate rules, and they are genuinely different products:
      **(a) Marker.** Kanmer stamps what it writes (e.g. an extra field) and
      unmerges only stamped entries. Correct going forward, but every *existing*
      grok registration is unstamped, so on first run grok's disconnect becomes a
      no-op — the ticket's defect turns into the opposite defect for one release.
      **(b) Shape fingerprint.** Claude writes `"type": "stdio"`, grok's merge
      does not (verified in this repo's own `.mcp.json`). Needs no migration, but
      it is an inference about another tool's output format, and it silently
      breaks the day Claude stops writing `type` or grok starts.
      **(c) Move grok off the shared file** onto its own path, leaving
      `.mcp.json` to Claude alone. Cleanest ownership, largest change, and it
      strands users already registered through the shared file until they
      reconnect — i.e. it recreates in miniature the exact drain problem this
      ticket exists to fix.
      Which rule ships?

- [ ] **Q2 — When a legacy global entry has no project-scoped replacement, what
      does the sweep do?** The ticket settles that it must *warn*. It does not
      settle what the button does. Options: report only and refuse to remove
      (safest; the pile never fully drains without the user visiting each
      project); offer "reconnect that project first, then drain" as a single
      action (best outcome, most work, and it means the sweep starts *writing*
      other projects' files); or allow removal behind an explicit second
      confirmation that names the consequence. On this machine that entry was
      pegasus's only working registration, so the wrong default silently cuts
      board access for a project the user is not currently looking at.

- [ ] **Q3 — Where does the sweep live?** ADR-0010 says setup is reconciliation
      and that reconciliation belongs to `kanmer-setup`, which argues for the
      skill. But this sweep is machine-scoped, needs a human confirmation, and
      its findings are about *other* projects — which argues for the GUI's
      Connect panel, or a one-time prompt after an app update. It could be both
      (shared pure core, two front ends). Pick one, because it decides whether
      this ticket touches `Settings.tsx` + IPC at all, and that is roughly half
      the file list.

- [ ] **Q4 — Does draining a project's registration count as something Kanmer may
      do without that project being open?** The Connect UI's own hint text
      currently promises registration writes "nothing outside this project."
      The sweep breaks that promise by design. Confirm that is intended and the
      copy should be rewritten, rather than the sweep being scoped to only the
      currently-open project (which would make it useless).

## Technical questions — resolvable during implementation

- [ ] **Q5 — Is `codex mcp remove` formatting-safe on the global config?**
      Research established that Kanmer's own `smol-toml` round-trip is *not*:
      it collapses `startup_timeout_sec = 120.0` to `120` and rewrites all 65
      single-quoted `[projects.'…']` headers (evidence in `scratch/research.md`).
      So removal should delegate to codex. Circumstantial evidence says codex
      edits surgically — the live file kept its float and its literal strings
      through the removal of the pegasus entry — but that has not been proven by
      running the command against a copied fixture. Prove it before shipping; if
      it is *not* safe, the fallback is a surgical text-level excision of the
      `[mcp_servers.kanmer-*]` table blocks, never a parse/stringify rewrite.

- [ ] **Q6 — What happens when `codex` is not on PATH?** The sweep can list
      (pure TOML parse) but cannot drain. `connectAgent` swallows CLI failures
      with `.catch(() => undefined)`; the sweep must not, or it will report a
      drain that never happened. Confirm the copy-paste fallback (FRD-012 AC-4)
      is the right answer here rather than a hard failure.

- [ ] **Q7 — How should the sweep treat an entry whose recorded project root no
      longer exists on disk?** Deleted repo, renamed folder, or an install-path
      move (the separate stale-path problem noted at `AGENTS.md:494`). "No
      project-scoped replacement" and "no project" look identical to a naive
      probe, but they want opposite treatment: the first must be protected, the
      second is pure garbage and is the safest thing in the file to remove.

- [ ] **Q8 — Should the sweep also list *well-formed* legacy entries whose
      project HAS reconnected but which are currently shadowing it?** These are
      the straightforward drain targets and presumably yes — but note the entry
      is global and the replacement is project-scoped-and-trust-gated, so for an
      untrusted folder the global entry is still the only one codex loads.
      `codexTrustFromConfig` already exists to answer that and should probably
      gate this classification too.

## Parked (explicitly deferred)

- Whether grok should eventually own its own config file regardless of Q1's
  answer — a follow-up ticket if (a) or (b) ships.
- Repairing stale install paths inside the entries the sweep enumerates. Out of
  scope here (see `files`), but the sweep is the first thing that will have the
  full list in hand, so it is the natural home for that later feature.
- Extending the sweep to non-codex hosts. None of them ever wrote a global
  per-project entry, so there is nothing to drain today.

---

**Note for whoever verifies this:** the pegasus reproduction is gone. The live
`~/.codex/config.toml` no longer holds any `mcp_servers.kanmer-*` entry, and
`pegasus/.codex/config.toml` now carries a proper `[mcp_servers.kanmer]`. The
"no replacement" case must be a hand-written fixture; it cannot be observed on
this machine any more.
