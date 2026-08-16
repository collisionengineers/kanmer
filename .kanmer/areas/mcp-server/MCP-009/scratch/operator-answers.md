## OPERATOR ANSWERS — 2026-08-16

**Q3 — accept the split? ANSWERED: YES, split. MCP-009 keeps the DOCS only.**

Your scope is now:
- the **ADR-0009 amendment** (replacing the staleness clause with the
  absence-of-evidence rule and the check-the-binary method — you drafted it
  verbatim in your research doc; ship that)
- the **FRD-012 corrections**, including the install matrix
- **FRD-012 R5**, which repeats the same wrong lesson and must point at the
  amended clause

Everything else has been filed and is NOT yours:
- **[[MCP-013]]** (in HZN-003) — marketplace root + packaging. The blocker: the
  failing `claude plugin marketplace add`, the swallowed non-zero exit at
  `connect.ts:152`, the packaged app shipping neither marketplace JSON, the two
  marketplace names, the two `${…}_ROOT` variables.
- **[[MCP-014]]** (outside HZN-003) — grok to the plugin path.
- **[[MCP-015]]** (outside HZN-003) — Antigravity to the plugin path plus dispatch.
- The `.mcp.json` collision is already owned by **[[GUI-079]]**, and the operator
  has settled it: grok moves to its own file, `.mcp.json` belongs to Claude alone.
  Record the finding, do not fix it.

**Q1 + Q2 — Antigravity and `.agents/skills/`: DO NOT WRITE YOUR CONCLUSION YET.**

You and GUI-073 reached opposite answers running the same CLI. GUI-073 found
`.agents/skills/` and `.agents/mcp_config.json` ARE read, but only in a
**project-bound** session (`agy --new-project` / `--project <id>`); bare `agy -p`
gave `TOOL:NO SKILL:NO`, which matches your negative. Your probe may not have been
project-bound.

**An adjudication agent is settling this by running both procedures back to back
on one tree with a positive control.** Until its verdict is recorded on GUI-073:

- **Do not ship the clause saying `.agents/skills/` serves opencode and grok but
  not Antigravity.** That would write a second wrong lesson into ADR-0009 — the
  document you exist to correct for carrying a wrong lesson — and this one would
  arrive carrying an evidence table, which makes it harder to dislodge.
- Write everything else in the amendment now. Leave that one sentence for the
  verdict.
- **You may not edit GUI-073**, and it may not edit you. Neither ticket overwrites
  the other's finding; the tool decides.

**Q4 — user scope or project scope for `claude plugin install`? SCHEDULER: this
belongs to [[MCP-013]], not to you.** Record the finding in your research (the
default is `--scope user`, so Kanmer's 12 skills load into every project on the
machine, while everything else Kanmer writes is project-scoped per ADR-0007, and
nobody appears to have chosen this). MCP-013 owns the decision because it owns the
install command.

**Q5 — is the shared `.mcp.json` intended? ANSWERED by the operator via GUI-079:
no. grok moves to its own file.** Record it; GUI-079 implements it.

**Profile note:** with code out of scope, check `get_doc_gates MCP-009`. If a docs
-only change no longer fits `feature`, say so and propose the profile rather than
writing documents nobody needs — but do not change the profile to dodge a gate.
