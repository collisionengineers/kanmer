# GUI-106 plan

## Objective

Keep the agent MCP runtime outside the installer directory, or behind an equivalent update-safe boundary, so an installed-app update does not invalidate live MCP sessions. Preserve the existing fixed Codex launcher contract, provider registration behavior, cwd-based board discovery, packaged identity, uninstall ownership, and the existing update stop/warning gate.

## Governing documents and constraints

- FRD-012 requires the fixed installer-owned launcher, inherited cwd, and rootless discovery for the canonical Codex registration.
- FRD-021 requires update-time live-session detection and a refusal when sessions cannot be stopped; this ticket does not weaken that gate.
- ADR-0012 requires provider cwd discovery and forbids adding provider-specific cd or root flags.
- ADR-0018 and EPIC-011 establish the stable launcher and installer ownership boundary.
- Archived MCP-005 research supplies the three-file Electron runtime relocation evidence and records the unavailable host proof.

## Design

1. Keep the registered launcher path and its probe, argument, environment, cwd, stdio, and exit behavior stable. Make it prefer a complete version-independent runtime at LOCALAPPDATA/Kanmer/mcp/current, with the existing InstallDir payload as a compatibility fallback for legacy or incomplete installs.
2. During install, stage the Electron executable runtime files (Kanmer.exe, icudtl.dat, v8_context_snapshot.bin) and the standalone MCP bundle into a versioned per-user runtime directory. Activate current only after the payload is complete. Retain the install-root bundle and launcher payload for legacy registrations and rollback safety.
3. During a normal uninstall, remove only the runtime directories and junction owned by Kanmer, while preserving update-time skip behavior and the existing registry/shim ownership checks. Do not claim cleanup or update success beyond static evidence.
4. Update deterministic package/launcher rails and session comments/tests to distinguish external current-runtime sessions from legacy install-root sessions. Keep updater stop behavior unchanged.
5. Update the bounded governing/release notes where wording would otherwise claim that every session is killed by an installer update. Do not modify provider serialization, MCP connection/provider files, remote/tunnel behavior, GUI-101/102 integration, or MCP-015 scope.
6. Run focused rails, the relevant package/build/type checks, and shared verification as feasible. Record exact commands/exits, including any first failures. Real packaged update, active-session survival, junction behavior, AV behavior, and uninstall proof are INCONCLUSIVE without the required disposable Windows host.

## Risks and mitigations

- A partial runtime copy must never become current; stage then activate only after all required files exist.
- Legacy registrations must continue to resolve; retain and test the old InstallDir fallback.
- Junction/quoting behavior is Windows-specific; static assertions and local rails cannot replace packaged-host proof.
- No provider inventory rewrite is attempted; that is outside this bounded ticket and remains a follow-up concern.
