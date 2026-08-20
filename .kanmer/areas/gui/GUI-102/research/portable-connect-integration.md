# Research — GUI-102: Portable Connect integration verification

## Purpose

Define the final, non-overlapping end-to-end acceptance run for the Portable Codex Connect epic after GUI-099, GUI-100 and GUI-101 have individually implemented and proven the launcher, registration and packaging/update contracts.

## Findings

- This is an integration ticket, not another implementation owner. It should not rewrite launcher, Connect or packaging code unless the final run exposes a tightly scoped integration defect that cannot be returned to its owning ticket.
- The epic outcome has four independent claims that must hold in one continuous packaged lifecycle: stable installer ownership; canonical machine-portable project registration; update continuity; safe uninstall cleanup.
- GUI-101 may already contain two-location and update evidence. GUI-102 must reuse that evidence but still execute one clean happy path from a fresh environment so the final proof is not assembled from unrelated partial runs.
- The strongest acceptance environment is a disposable Windows VM/user with no prior Kanmer state. The run should use a real signed/test installer and updater feed when available. If signing is unavailable, use the actual NSIS package and controlled update path while clearly recording that publisher trust was outside the claim.
- Before the run, snapshot absence/presence of `%LOCALAPPDATA%\Kanmer`, `HKCU\Software\Kanmer`, project `.codex/config.toml`, global Codex registrations and running Kanmer/MCP processes. This makes cleanup and ownership claims auditable.
- Fresh install must prove the fixed shim and registry value are created from zero state. A repair of a pre-existing installation cannot substitute for this step.
- Registration must be produced through the normal GUI Connect action, not hand-authored. Its bytes must match GUI-100's canonical fixture and contain no local identity.
- The tool-level proof must invoke `get_status`, not merely list the registration. It must establish the project/board roots and installed server identity from both source checkout and a linked worktree.
- The update must be applied through the real app updater/NSIS path. A live MCP session should exercise the stop/refusal mechanism. After successful update, a fresh Codex host must use the unchanged project file and reach the new server build.
- Uninstall must remove only installer-owned shim/HKCU/install payload state. The project file is repository/user-owned and must remain; unrelated files/registry values must remain; a post-uninstall tool launch must fail actionably rather than finding a stale or different executable.
- Existing users require one reconnect because their current owned project entry contains absolute paths. That migration note is part of epic acceptance: update, reconnect, review/commit the portable file, restart host. No automatic Git mutation or migration of unrelated Codex servers.
- Every attempt uses typed outcome language. A failed update followed by success remains in the proof with cause; `INCONCLUSIVE` is not promoted to PASS.

## Integration verdict criteria

PASS requires all of the following in the same clean lifecycle:

1. Fresh package install creates exact fixed launcher/HKCU ownership.
2. GUI Connect writes canonical bytes and preserves unrelated config.
3. Source and linked-worktree `get_status` calls identify the right project.
4. Real update handles live session safely and completes.
5. Unchanged config launches the new packaged server afterward.
6. Disconnect/reconnect remains idempotent and surgical.
7. Uninstall removes owned launcher/install state and preserves project/unrelated state.
8. Post-uninstall launch fails clearly; reinstall restores operation without changing canonical bytes.
9. Migration/manual/release documentation is accurate.
10. Full deterministic verification rail is green and cleanup is complete.

## Open questions

None. The final environment, evidence and failure choreography are resolved in `open-questions.md`.
