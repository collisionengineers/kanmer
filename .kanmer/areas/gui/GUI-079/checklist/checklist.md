# Checklist — GUI-079

- [x] 1. Rename `codexTomlMerge`/`codexTomlUnmerge` → `tomlMcpServersMerge`/`tomlMcpServersUnmerge`, docblock covering both hosts
- [x] 2. Point grok's register at `.grok/config.toml` with that TOML pair; replace the stale `.mcp.json` comment with the verified facts
- [x] 3. Add `registrationState(existing)` to the `configFile` RegisterSpec + the three pure predicates (json mcpServers / opencode mcp / toml mcp_servers)
- [x] 4. `connect.ts` `isRegistered` delegates to `provider.register.registrationState`, keeping the missing→false / indeterminate→true bias
- [x] 5. Pure `legacyCodexEntries(globalConfigToml)` — parse for listing only, `kanmer-*` keys, root from `--repo-root ?? --root`
- [x] 6. Pure `classifyLegacyCodexEntry(entry, probe)` — drainable / no-replacement / untrusted / orphaned / unknown-root, with `removable` + `recommended`
- [x] 7. `scanLegacyCodexRegistrations()` in `connect.ts` — read `~/.codex/config.toml`, probe each project root, classify
- [x] 8. `drainLegacyCodexRegistrations(names)` — re-scan and intersect with `removable`, then per-entry `codex mcp remove`, no swallowed failures, copy-paste command per result
- [x] 9. `shared/ipc.ts` — two channels, the finding/scan/drain types, two `KanmerApi` methods (no `projectId`)
- [x] 10. `preload/index.ts` bridges + `main/index.ts` handlers beside `CH.listProviders`
- [x] 11. `Settings.tsx` sweep UI — hidden when empty; checkboxes only on removable rows; refusal rows visually distinct and unremovable; one confirm; per-entry results; hint copy tightened
- [x] 12. `providers.test.ts` — grok path/TOML, the three predicates, and the sweep describe (pegasus fixture, unparseable, url-only, no `--root`, colliding basenames, orphaned, untrusted, second-run no-op)
- [x] 13. `connect.test.ts` — grok disconnect leaves Claude's `.mcp.json` byte-intact; a Claude-only `.mcp.json` no longer counts grok as a registered peer
- [x] 14. Amend ADR-0007 Consequences — the drain's real precondition, and the sweep as what drains the pile
- [x] 15. Amend FRD-012 — R1 grok path + R1a/R1b, R4 ownership rule, AC-6/AC-7, grok Upgrade note
- [x] 16. Write ADR-0012 (hosts own their registration file) and `link_doc` it into refs
- [x] 17. Record the grok reconnect-once note in the ticket's `## Outcome` (release-notes source)
- [ ] 18. Verification run on merged main: `npm test`, `npm run typecheck`, `npm run verify:agents-block`, `npm run check:manual`, plus the recorded `codex mcp remove` fixture transcript (this box produces proof.md)

## Progress notes

**Q5 proven before writing a line of the sweep.** `codex mcp remove` was run
against a synthetic `CODEX_HOME` fixture carrying `startup_timeout_sec = 120.0`,
two literal-quoted `[projects.'c:\…']` headers, a top-of-file comment and a
second MCP server. `diff -u` against the pre-image is a single deletion hunk —
the `[mcp_servers.kanmer-pegasus]` block and its own comment. Everything else is
byte-identical. Delegating removal is safe; the round-trip research warned about
is not.

**grok's target file was chosen from the installed CLI, not from memory**
(FRD-012 R5). `grok mcp add --help` documents `--scope project` →
`./.grok/config.toml`, and `~/.grok/docs/user-guide/07-mcp-servers.md` gives the
MCP source merge order as `config.toml` > Claude > Cursor > `.mcp.json`. So
`.mcp.json` was never grok's primary path — it was a compat source grok reads
only until the Claude import marker is set, and it is the *lowest* priority.
The move is a reliability improvement, not just a de-collision.

**Course correction: the predicate had to be tri-state.** The plan had
`register.isRegistered(): boolean`, which silently dropped the existing
"malformed configuration → keep the shared AGENTS.md block" bias — the caller
could no longer tell "no kanmer entry" from "I could not parse this". The
existing peer-safety test caught it. It is now
`registrationState(): "registered" | "absent" | "indeterminate"`, which the two
callers read in opposite directions: disconnect keeps the block on
indeterminate, the sweep refuses to drain on it. Plan and ADR-0012 updated to
match.

**`npm test` — 4 pre-existing failures in `kanmerGit.test.ts`, unrelated.**
5-second timeouts and `EPERM` on Windows temp directories during `git worktree`
operations. Confirmed environmental by stashing the entire change and running
the same file on the unmodified base commit: it fails there too. The
connect/providers suites are green (62 tests), as are typecheck,
`verify:agents-block` (26/26) and `check:manual`.
