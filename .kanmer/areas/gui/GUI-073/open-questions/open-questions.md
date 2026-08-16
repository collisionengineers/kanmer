# Open questions — GUI-073

## ⚠️ Operator-only — these need a human answer before the plan is written

The research refuted the fact this ticket was scoped around, which widens it.
Two of the three questions below are product/scope calls, not research gaps: no
amount of further investigation settles them.

- [ ] **`agy -p` works now (research F2) — does `dispatch` flip to `true` in this ticket, or does this ticket stay a copy fix?**
      Evidence: `echo "hi" | agy -p "Reply with exactly: PONG" --print-timeout 90s` → `PONG`, exit 0, stdout piped. The "GH #318/#76 hangs when piped" justification does not hold on agy 1.1.13.
      **Flipping it is not one line.** `dispatch.ts:115` spawns with `cwd: root` and no project binding, and research F6 proves a bare `agy` session ignores `.agents/mcp_config.json` *and* `.agents/skills/` — so a dispatched Antigravity agent would run without the Kanmer MCP server Connect just registered. A correct invocation needs `--new-project` or a stored `--project <id>`, which is dispatch **configuration** and arguably [[GUI-075]]'s.
      The options are: (a) copy-only — badge becomes "no background dispatch", `dispatch` stays `false`, and a new ticket carries the flip; (b) flip it here, including the project-binding argument vector and the menu; (c) copy-only now, and re-word so the badge does not claim a permanent limitation.
      *Whoever answers this decides the ticket's size — it cannot be inferred from the board.*

- [ ] **Does FRD-012 get amended here, or does [[MCP-009]] amend it?**
      Both tickets point at the same install matrix, and R1/AC2 are wrong in the same place (research F10): R1 never names `.agents/mcp_config.json` or the project-binding condition; AC2's "`/skills`-style listings show them" holds for opencode but only for a project-bound `agy`. Two tickets editing those lines will conflict. MCP-009 says it "keeps FRD-012's install matrix as the single description, corrected to match", which reads like MCP-009 owns it — confirm.

- [ ] **`plugins/kanmer/skills/kanmer-report/SKILL.md` fails Antigravity's YAML parser — new ticket, or absorbed by [[MCP-009]]?**
      Evidenced (research F9): agy logs `Failed to parse skill file …kanmer-report\SKILL.md: failed to parse frontmatter: yaml: line 2: mapping values are not allowed in this context`, and only 11 of 12 `kanmer-*` skills load. Cause is the unquoted `": "` inside the plain YAML scalar at `SKILL.md:3`. Claude Code tolerates it; agy does not. **A user connecting Antigravity today silently loses one skill.** I did not create a ticket for it — research-only instruction — so it will be lost unless filed.

## Answerable without the operator, but still unresolved

- [ ] **Should `listProviders()` expose capabilities instead of one boolean?**
      The ticket asks. The research supports it (research implication 3): the badge is wrong precisely because the renderer has to *interpret* `dispatch`, and `codexTrustWarning` (`providers.ts:243-263`) already shows the pattern for a per-host conditional. But it changes an IPC-crossing return type, and it is only worth it if there is a second consumer. The plan should decide — a minimal fix is defensible.

- [ ] **What does the Antigravity IDE do, as opposed to `agy`?**
      Everything verified here is the CLI. The IDE binds a project whenever a folder is open, so the project-binding caveat is *expected* not to apply — expected, not verified; a GUI cannot be driven headlessly from this session. It matters because it decides whether the caveat belongs in the badge at all or only in CLI-facing copy. Answerable by a human opening the repo in Antigravity and checking that the Kanmer MCP tools and skills appear — one minute of manual work, and worth it before copy is written.

## Parked (explicitly deferred)

- Whether GH #318 / #76 are still open upstream. Not fetched (no network lookup
  performed); the behaviour was tested directly instead, which is the stronger
  check. Only relevant if someone wants the history in a comment.
- Whether agy 1.0.x behaved as `providers.ts` describes. Only 1.1.13 is
  installed. Interesting for the changelog, irrelevant to what the UI should say
  today.
- The other four providers' "cannot" claims — [[MCP-009]]'s audit.
