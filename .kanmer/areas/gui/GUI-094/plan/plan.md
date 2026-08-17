# Plan — make Codex Connect registrations portable across machines

## Chosen approach

Give Codex a stable, OS-resolvable `kanmer-mcp` launcher and make the project registration contain only that command. The launcher, installed with Kanmer, locates the Electron binary and bundled server relative to its own installed location, sets `ELECTRON_RUN_AS_NODE=1`, preserves the caller's cwd and stdio, and forwards process exit behavior. Codex Connect omits `--root` and `--repo-root`; ADR-0012 discovery resolves the canonical board worktree and derives the source checkout.

This is preferred over a relative bundle path because the bundle is not in the project and official OpenAI documentation does not establish a config-file-relative path base for MCP arguments. It is preferred over continuing to gitignore generated config because that only hides the portability defect and leaves already tracked registrations broken. It is preferred over an environment-variable placeholder because Codex plugin evidence already shows host-dependent expansion and the official stdio config contract does not promise arbitrary interpolation.

The first implementation step must choose and prove the Windows launcher build form. The target is a real executable, not an assumed `.cmd` execution path. If a small native executable cannot fit the existing build/release toolchain without introducing disproportionate machinery, stop and record that as a design issue rather than silently falling back to an unproved shim.

## Ordered implementation steps

1. **Add a provider-specific invocation model.**
   - Split the current one-size-fits-all `Invocation` construction so Codex can receive `{ command: "kanmer-mcp", args: [], env: {} }` while other providers retain their established registrations.
   - Keep the provider registry as the owner of config shape and preserve one-host/one-file behavior.
   - Update pure unit tests to prove the Codex merge contains no absolute path, root flag, or machine-specific environment requirement and remains byte-stable/idempotent.

2. **Build the installed launcher.**
   - Add a minimal `kanmer-mcp` executable to the packaged product.
   - Resolve `Kanmer.exe` and `resources/mcp/kanmer-mcp.cjs` relative to the launcher's own location, not cwd.
   - Set `ELECTRON_RUN_AS_NODE=1` only for the child; forward arguments, stdin/stdout/stderr, signals where supported, and exit code.
   - Emit an actionable stderr error when the sibling executable or bundle is absent.

3. **Make the launcher discoverable and lifecycle-safe.**
   - Extend NSIS packaging/install so the command is resolvable for the installing user regardless of the chosen install directory.
   - Ensure upgrade changes point to the current installation and uninstall removes only Kanmer's own launcher/PATH contribution.
   - Document whether a new terminal/Codex process is required after install because environment changes may not reach existing processes.

4. **Change Codex Connect output.**
   - Write `command = "kanmer-mcp"` with no install path, bundle path, `--root`, `--repo-root`, or `ELECTRON_RUN_AS_NODE` in the project file.
   - Preserve unrelated TOML tables/keys, trust guidance, reconnect idempotence, unmerge behavior, and legacy cleanup.
   - Give Connect a preflight that distinguishes “launcher not installed/resolvable” from malformed TOML and reports a copy-paste diagnostic.

5. **Adapt legacy-registration classification safely.**
   - Audit `legacyCodexEntries` and the machine-wide sweep: it currently identifies projects from `--repo-root` or `--root`.
   - Keep classification of old absolute global entries working.
   - Treat the new rootless project registration as a valid replacement based on the project file being inspected, without inventing a root from its args or allowing deletion of another project's only registration.

6. **Prove workspace discovery end to end.**
   - Create two isolated Git fixtures at different absolute paths, each with a source checkout and `.worktrees/kanmer/.kanmer`.
   - Start Codex from each trusted project using the same byte-identical portable `.codex/config.toml`.
   - Call Kanmer `get_status`, not merely `codex mcp list`, and assert the server answers, `rootSource` is discovery-based, `projectRoot` is that fixture's board worktree, and `repoRoot` is that fixture's source checkout.
   - Add a negative case where `kanmer-mcp` is unavailable and verify the surfaced error.

7. **Extend packaged-product and release rails.**
   - Assert the built/installed launcher exists and can start the packaged MCP bundle.
   - Run the smoke through the launcher with a fresh user-data/test environment and confirm stdio remains clean.
   - Cover custom install directory, upgrade, and uninstall behavior proportionately; do not accept a file-presence-only package check.

8. **Update governing docs and sharing policy.**
   - Amend FRD-012 R1 to specify the portable Codex shape and R7 to make Connect consume discovery.
   - Replace R1c's current “gitignored because absolute” decision with: Codex project config may be shared only after the portable launch proof passes. Retain precise ignores for other provider artifacts whose invocation remains machine-specific.
   - Amend ADR-0012 to name Codex Connect as a discovery consumer. If the launcher/installer contract introduces a durable architectural dependency beyond ADR-0012, create and link a focused ADR rather than overloading it.
   - Add an upgrade note: reconnect rewrites future configs, but consumer repos must separately untrack/recommit already tracked files such as Pegasus.

## Verification and proof strategy

Pre-merge:

- GUI unit tests for provider-specific invocation, TOML preservation, idempotent reconnect, unmerge, and legacy sweep.
- Root/discovery tests remain green.
- Launcher unit/integration tests cover sibling resolution, missing artifacts, cwd preservation, env setup, stdio, and exit code.
- Full `npm test` and `npm run typecheck`.
- `npm run dist` plus packaged launcher smoke; run `dist:check` when its updater requirements are available.
- Two-location Codex integration invokes `get_status` through the actual host.

Post-merge proof should capture the two byte-identical configs, their different checkout roots, both `get_status` results, packaged launcher identity, and the full test/typecheck/package command outputs.

## Risks and mitigations

- **PATH changes are not visible to a running Codex process.** Surface restart guidance and test a newly launched host.
- **A native launcher adds build/release complexity.** Keep it single-purpose and dependency-minimal; include it in package integrity checks.
- **Changing shared Invocation breaks other providers.** Split Codex behavior explicitly and leave provider fixtures intact.
- **Removing root flags exposes cwd assumptions.** The real Codex tool-call test is mandatory; no inference from TOML parsing or MCP listing.
- **Legacy cleanup loses project identity.** Preserve parsing of old absolute entries and derive replacement state from the project file context.
- **Prematurely committing configs spreads a broken launcher contract.** Do not relax `.gitignore` until packaged, relocated-checkout proof passes.

## Governing docs

- **FRD-012 Connect:** this plan intentionally amends its current R1/R1c/R7 absolute-path contract. The end state remains project-scoped, trusted Codex configuration with pure/idempotent merge and provider ownership; only the invocation becomes portable and shareable.
- **ADR-0012 Board discovery order:** the plan consumes the accepted discovery algorithm exactly as designed and removes Connect's special root pinning. Any change to discovery order is out of scope.
- If implementation proves that OS launcher installation is a new long-lived architectural decision not adequately governed by these documents, use `kanmer-docs` to add a focused ADR and link it before review.

## Deliberately out of scope

- Editing Pegasus or any consumer repository.
- Implementing a Codex plugin-owned MCP server.
- Making every provider's registration portable in the same change.
- Changing remote transport or the board storage model.
