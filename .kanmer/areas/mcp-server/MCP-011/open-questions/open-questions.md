# MCP-011 — Open questions

Nothing here blocks planning. The ticket's one genuinely open question — "can the
plugin path reach the Electron binary?" — was answered by measurement rather than
referred upward, which is what the ticket asked for.

## Resolved during research

- [x] **Can a plugin-installed MCP server reach the Electron binary?**
      **Yes for claude and grok, no for codex.** Claude Code 2.1.233 and grok
      0.2.111 both expand `${VAR:-default}` in a plugin's MCP config, so
      `"command": "${KANMER_NODE:-node}"` keeps `node` as the default and lets a
      Node-less machine point at `Kanmer.exe`; verified by *calling the tool*,
      which returned `electron: 31.7.7`. codex 0.147.0 expands nothing anywhere
      in a plugin's MCP config, so no override is expressible and Node on PATH is
      a hard dependency there — stated in FRD-012 R6 rather than left implicit.
      (Research F1, F2, F3, F6.)
- [x] **Is dropping `--root` correct now?** Yes on the code (MCP-010's
      `discoverBoardRoot` shipped in `741ef81`), and to be **confirmed by running
      the installed plugin**, not by reasoning — carried into the plan's
      checklist as an execute-phase step, per the ticket's wording.
- [x] **What is "the repo version"?** `package.json` → `0.3.2`, and
      `scripts/release.mjs` treats `apps/gui/package.json` as authoritative with
      the root kept in step. Both plugin manifests take that same value, and
      `release.mjs` gains them so the three can never diverge again.

## Decisions taken here (recorded, not escalated)

- **Env var name `KANMER_NODE`.** A new public knob. Chosen over `KANMER_NODE_BIN`
  / `KANMER_ELECTRON` because it names what the slot *is* (the Node-compatible
  runtime), not what one happens to put in it. Reversible; documented in FRD-012
  R6 and the README.
- **`ELECTRON_RUN_AS_NODE: "1"` is set unconditionally** in both manifests, not
  only when the override is used. Safe: research F1a shows plain Node receives it
  and ignores it (`versions_electron: null`). A conditional would need expansion
  in `env`, which codex does not have.
- **The two manifests stay different.** Research F4: `cwd: "."` is required by
  codex and breaks grok's handshake outright. Unifying them was considered and is
  provably impossible.

## Parked (explicitly deferred)

- **agy's plugin-supplied MCP server cannot launch, under any manifest content.**
  agy 1.1.13 reads `plugins/kanmer/.mcp.json` (not `mcp/claude.mcp.json`, which
  corrects MCP-009 Finding 4a), copies it verbatim, expands no token, and joins
  relative paths to the *session* cwd. Broken today and unchanged by this ticket
  — `cwd: "."` is a strict improvement, fixing codex while leaving agy exactly as
  it was. Needs its own ticket; overlaps [[MCP-015]]'s ownership of Antigravity.
  Recorded in research F5 with the literal `Cannot find module …\${PLUGIN_ROOT}\…`
  error as proof.
- **Plugin install scope.** `claude plugin install` defaults to scope `user`,
  leaking Kanmer's skills into every project on the machine, against ADR-0007's
  project-scoping. MCP-009 Finding 9 raised it; nobody owns it. Not this ticket.
- **[[MCP-013]]'s marketplace root**, in all four of its parts. Re-encountered
  and worked around, never fixed here.
