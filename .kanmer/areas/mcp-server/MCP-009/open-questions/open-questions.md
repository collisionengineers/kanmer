# MCP-009 — Open questions

## ⚠ OPERATOR ONLY — these cannot be resolved by an agent, and block planning

- [ ] **Q1. Antigravity and `.agents/skills/`: whose evidence wins?**
      ADR-0009 states Antigravity reads project `<root>/.agents/skills/`,
      "verified 2026-08-15". I could not reproduce that on `agy` 1.1.13 /
      Windows: probe skills placed in `.agents/skills/`, `.agent/skills/`,
      `.claude/skills/` and `.opencode/skills/` were all invisible, and the same
      probe correctly listed all 12 skills once `agy plugin install` had run
      (`research` §Finding 4c — the positive control rules out a broken probe).
      Three explanations, and only you can say which: (a) the original check was
      against the **Antigravity IDE**, not the `agy` CLI, and both are "Antigravity";
      (b) it was a different `agy` version or platform; (c) it was assumed. If
      (a), the ADR and FRD-012 are not wrong so much as ambiguous about *which*
      Antigravity, and the fix is to say which — and Connect still needs to know
      that the CLI ignores the tree it writes. **Which was it?**

- [ ] **Q2. May I contradict [[GUI-073]]'s stated premise?**
      GUI-073 is already in Preparing with research written, and its third
      verification item is "Connecting Antigravity still writes
      `.agents/mcp_config.json` **and** `.agents/skills` — the capability the old
      label denied." Per Q1 that item cannot pass for the CLI. GUI-073's
      *conclusion* survives intact and gets stronger — Antigravity is not
      register-only, and I proved `agy -p "<prompt>"` returns clean output at
      exit 0, so `dispatch: false` is simply stale — but its *mechanism* is the
      plugin install, not a project skills copy. Do you want me to (a) leave
      GUI-073 alone and note the correction only here, (b) file a blocking
      ticket against it, or (c) have you relay it? **I have not edited GUI-073.**

- [ ] **Q3. Do you accept the split, or should MCP-009 land as one ticket?**
      `research` §"Recommended split" proposes MCP-009 (docs: the ADR + FRD
      amendments) plus **a** marketplace-root fix + packaging, **b** grok →
      plugin, **c** antigravity → plugin + dispatch, **d** the `.mcp.json`
      collision. As one ticket this is four code changes, two document
      amendments and a packaging change across three risk classes. I am not
      narrowing it unilaterally — if you want it as one unit, say so and the
      plan will cover all of it.

- [ ] **Q4. Should the Kanmer plugin install at user scope or project scope?**
      `claude plugin install` defaults to `--scope user` (verified: the test
      install reported "scope: user"), so Kanmer's 12 skills currently load into
      **every project on the machine**. `-s project` exists. Everything else
      Kanmer writes is project-scoped by decision (ADR-0007). Nobody appears to
      have chosen this; it is a product call, not a technical one, and it
      changes what users see in unrelated repos.

- [ ] **Q5. Is the shared `.mcp.json` between Claude Code and grok intended?**
      Both write `mcpServers.kanmer` to the same project file, so connecting
      Claude alone silently registers grok too (`grok inspect` confirms it reads
      the entry Claude wrote), and **disconnecting grok deletes Claude Code's
      registration** — an FRD-012 R4 violation. Is the convergence a feature to
      document, or should grok move to `.grok/config.toml` (its native
      `grok mcp add -s project` target)?

## Questions an implementer must resolve before planning (agent-answerable, not yet answered)

- [ ] **Q6. Where does the packaged marketplace root live?**
      Shipping `.claude-plugin/marketplace.json` into `resources/` puts it beside
      `resources/plugins/kanmer`, so its relative `source: "./plugins/kanmer"`
      resolves correctly — but that has not been tested against a real packaged
      build, only reasoned from the layout. It must be verified on an actual
      installed app, not in dev mode, because `pluginRoot()` takes a different
      branch when `!app.isPackaged`.

- [ ] **Q7. Does `${PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_ROOT}` actually expand?**
      `codex mcp list` displays the token **unexpanded** after install, and
      Antigravity copied it verbatim into
      `~/.gemini/config/plugins/kanmer/mcp_config.json`. Claude's did resolve —
      `claude mcp list` showed `plugin:kanmer:kanmer: node …/mcp/kanmer-mcp.cjs
      - ✔ Connected`. So the answer differs per host. This sits on [[MCP-011]]'s
      boundary; whoever plans MCP-011 needs it, and it is recorded here rather
      than acted on.

- [ ] **Q8. Does keeping BOTH delivery paths double-load skills?**
      With grok's plugin installed *and* a `.claude/skills/` tree present,
      `grok inspect` listed each kanmer skill **twice** — once as
      `project [claude]` and once as `plugin: kanmer`. If any host keeps both a
      copy path and a plugin path, the duplicate needs a decided behaviour.

- [ ] **Q9. Do marketplace hosts prune a retired skill on update?**
      [[GUI-080]] explicitly asks this and marks it unchecked. Partial evidence
      from here: codex installs into a **version-keyed** cache directory
      (`…\cache\kanmer-plugins\kanmer\0.1.0`), which implies a version bump
      lands in a fresh directory and prunes implicitly — but the frozen `0.1.0`
      ([[MCP-011]]) means a real bundle change would overwrite in place, so this
      was **not** proven. Answering it belongs to GUI-080; flagged here because
      this research is where the cache path was observed.

## Parked (explicitly deferred)

- The Antigravity **IDE** (as distinct from the `agy` CLI) — not installed on
  this machine, deliberately not investigated. Note this is *parked*, not
  *unchecked*: the CLI, which is what Kanmer's Connect shells out to, was fully
  checked.
- Publishing to any public marketplace directory — already out of scope per
  `docs/plans/implementation-audit.md:103`.
- `grok plugin details <id>` rejects the id that `grok plugin list` prints
  (`Error: Plugin "c--users-pc-…-4a183bd6" not found`). An upstream grok quirk,
  no impact on Kanmer.
- Whether `claude plugin install` needs `-y` under Connect's non-TTY `execAsync`.
  The flag is documented as required only "for a plugin installed by running a
  marketplace-declared command"; Kanmer's marketplace declares none, and the
  install succeeded. Low risk, worth a belt-and-braces `-y` if cheap.
