# Checklist — GUI-079

- [ ] 1. Rename `codexTomlMerge`/`codexTomlUnmerge` → `tomlMcpServersMerge`/`tomlMcpServersUnmerge`, docblock covering both hosts
- [ ] 2. Point grok's register at `.grok/config.toml` with that TOML pair; replace the stale `.mcp.json` comment with the verified facts
- [ ] 3. Add `isRegistered(existing)` to the `configFile` RegisterSpec + the three pure predicates (json mcpServers / opencode mcp / toml mcp_servers)
- [ ] 4. `connect.ts` `isRegistered` delegates to `provider.register.isRegistered`, keeping the missing→false / unreadable→true bias
- [ ] 5. Pure `legacyCodexEntries(globalConfigToml)` — parse for listing only, `kanmer-*` keys, root from `--repo-root ?? --root`
- [ ] 6. Pure `classifyLegacyCodexEntry(entry, probe)` — drainable / no-replacement / untrusted / orphaned / unknown-root, with `removable` + `recommended`
- [ ] 7. `scanLegacyCodexRegistrations()` in `connect.ts` — read `~/.codex/config.toml`, probe each project root, classify
- [ ] 8. `drainLegacyCodexRegistrations(names)` — re-scan and intersect with `removable`, then per-entry `codex mcp remove`, no swallowed failures, copy-paste command per result
- [ ] 9. `shared/ipc.ts` — two channels, the finding/scan/drain types, two `KanmerApi` methods (no `projectId`)
- [ ] 10. `preload/index.ts` bridges + `main/index.ts` handlers beside `CH.listProviders`
- [ ] 11. `Settings.tsx` sweep UI — hidden when empty; checkboxes only on removable rows; refusal rows visually distinct and unremovable; one confirm; per-entry results; hint copy tightened
- [ ] 12. `providers.test.ts` — grok path/TOML, the three predicates, and the sweep describe (pegasus fixture, unparseable, url-only, no `--root`, colliding basenames, orphaned, untrusted, second-run no-op)
- [ ] 13. `connect.test.ts` — grok disconnect leaves Claude's `.mcp.json` byte-intact; a Claude-only `.mcp.json` no longer counts grok as a registered peer
- [ ] 14. Amend ADR-0007 Consequences — the drain's real precondition, and the sweep as what drains the pile
- [ ] 15. Amend FRD-012 — R1 grok path + sweep, R4 ownership rule, new AC, grok Upgrade note
- [ ] 16. Write ADR-0012 (hosts own their registration file) and `link_doc` it into refs
- [ ] 17. Record the grok reconnect-once note in the ticket's `## Outcome` (release-notes source)
- [ ] 18. Verification run: `npm test`, `npm run typecheck`, `npm run verify:agents-block`, `npm run check:manual`, plus the recorded `codex mcp remove` fixture transcript (this box produces proof.md)

## Progress notes
