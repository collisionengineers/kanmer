# Checklist

- [ ] Split invocation construction so Codex can use a provider-specific portable command without changing other providers.
- [ ] Add unit tests proving Codex TOML has no absolute path, root flag, or machine-specific environment and remains idempotent.
- [ ] Add the minimal installed `kanmer-mcp` executable that locates sibling packaged artifacts and preserves cwd/stdin/stdout/stderr/exit status.
- [ ] Add launcher failure diagnostics and tests for missing executable or bundle.
- [ ] Integrate launcher install, discoverability, upgrade, custom-directory, and uninstall behavior into NSIS packaging.
- [ ] Change Codex Connect to emit only the portable launcher command and add a resolvability preflight.
- [ ] Preserve TOML merge/unmerge, trust guidance, reconnect, and unrelated-key behavior.
- [ ] Update legacy global-registration classification so old root-pinned entries remain safely drainable with a rootless project replacement.
- [ ] Add two differently located Git/board-worktree fixtures using one byte-identical project config.
- [ ] Invoke `get_status` through real Codex in both fixtures and assert board root, repo root, and discovery provenance.
- [ ] Add the missing-launcher negative integration case.
- [ ] Extend packaged-product checks to launch the MCP through the installed launcher, not only check file presence.
- [ ] Amend FRD-012 R1/R1c/R7 and acceptance criteria; update ADR-0012 or create/link a focused launcher ADR if required.
- [ ] Revisit only the Codex config ignore rule after portability proof; retain machine-local provider ignores.
- [ ] Add the consumer upgrade note for reconnecting and separately untracking/recommitting existing configs.
- [ ] Run `npm test` and `npm run typecheck`.
- [ ] Run `npm run dist`, packaged launcher smoke, and `npm run dist:check` when release prerequisites permit.
- [ ] Write the post-implementation report with the two-location tool-call evidence and exact verification outputs.
