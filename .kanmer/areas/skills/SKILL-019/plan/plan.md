# Plan — SKILL-019: Stop Codex loading duplicate repo-local and plugin Kanmer skills

## Approach

Make .agents/skills the single project-local Kanmer roster shared by Codex and Antigravity. Codex Connect copies and reconciles this roster instead of installing the global Codex plugin; Antigravity continues using its primary documented project location. Move OpenCode to its native .opencode/skills directory and leave Grok at .grok/skills. Keep the Codex plugin distributable for users who deliberately choose the plugin route, but never have Connect install both routes. Existing plugin users receive a one-time, explicit migration path rather than permanent per-project negative configuration.

## Governing docs

- **FRD-012 Connect — Modifies, pending explicit authorization.** Change Codex’s Connect install from marketplace plugin to project copySkills at .agents/skills, shared with Antigravity; move OpenCode to .opencode/skills; document optional plugin distribution and migration.
- **FRD-023 Agent skills system — Modifies, pending explicit authorization.** Preserve the roster/release rail and add one-surface-per-host as an install invariant.
- **ADR-0009 — Modifies or supersedes, pending explicit authorization.** Preserve its contract hierarchy and evidence method while correcting the convergence decision from current provider documentation and observed duplication.

Implementation and governing-doc edits do not start without authorization.

## Steps

1. Verify against the installed Codex CLI how to list, disable, and uninstall the global Kanmer plugin, including whether the supported operation is CLI, plugin-browser-only, or both. Record exact output and do not infer an unsupported command.
2. Verify a fresh Codex session discovers the complete Kanmer roster from project .agents/skills with no plugin installed; verify Antigravity discovers the same stamped tree in a workspace-bound session; verify OpenCode discovers the roster from .opencode/skills.
3. With explicit authorization, update FRD-012, FRD-023, and ADR-0009 or create/link a superseding ADR.
4. Change the provider registry so Codex and Antigravity are project copySkills peers at .agents/skills, OpenCode copies to .opencode/skills, Grok remains at .grok/skills, and Claude remains marketplace-installed.
5. Remove Codex marketplace installation from Connect while retaining marketplace packaging and independent plugin validity. Update Connect output to explain that project Connect and global plugin installation are alternative skill routes.
6. Add existing-install migration behavior: detect an enabled global Kanmer Codex plugin, report that it would duplicate the project roster, and offer or display the exact supported one-time disable/uninstall action. Require confirmation before any global mutation.
7. Reconcile connection order and ownership: either Codex or Antigravity can create/update the shared tree; disconnect keeps it while the peer remains and removes only Kanmer-owned stamped content after the last peer leaves. Move legacy OpenCode ownership to .opencode/skills without disturbing the shared tree.
8. Update staleness detection, update prompts, gitignore, provider/connect tests, packaged-resource assertions, and governing/supporting prose. Add regressions that Connect never installs both Codex routes and never writes per-project skills.config suppression.
9. Run focused and full automated rails, then fresh-session behavioral checks for Codex, workspace-bound Antigravity, OpenCode, and the one-time existing-plugin migration.

## Verification

Capture installed-Codex plugin-management output and fresh-session skill discovery from .agents/skills. Test Codex-first, Antigravity-first, both disconnect orders, OpenCode migration, user-authored sibling preservation, and an already-installed global plugin. Run focused providers/connect/staleness suites, npm test, npm run typecheck, npm run verify:skills, npm run verify:agents-block, and the required build plus npm run plugin:check from the main checkout. Invoke skills in each host; listings alone are insufficient.

## Risks / open questions

- Existing global plugin users remain duplicated until they complete the one-time migration. Connect must make that state explicit without silently breaking other projects.
- A user may intentionally prefer the global plugin. The UI must present project Connect and plugin installation as alternatives, not label one universally wrong.
- Shared-tree cleanup is destructive only for Kanmer-owned generated content. Ownership comes from the stamp roster, never name globs.
- Removing Codex marketplace commands from Connect must not accidentally remove the marketplace artifacts from packaging or release verification.
- Governing-doc edits remain authorization-gated.
