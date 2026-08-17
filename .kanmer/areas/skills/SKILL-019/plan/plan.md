# Plan — SKILL-019: Stop Codex loading duplicate repo-local and plugin Kanmer skills

## Approach

Preserve each host’s primary supported installation model instead of forcing a fake provider-private path. Antigravity remains on its documented .agents/skills workspace location; OpenCode moves to its native .opencode/skills location; Codex retains the plugin-qualified roster and its trusted project .codex/config.toml gains exact disabled entries for Kanmer-owned local skills under .agents/skills. This removes the mixed-host duplicate while leaving unrelated repository skills visible to Codex. It beats moving Antigravity to a legacy compatibility directory, abandoning the Codex plugin, or mutating the user-global Codex config. All config and copied-skill changes are reconciled idempotently and preserve user-owned content.

## Governing docs

- **FRD-012 Connect — Modifies, pending explicit user authorization.** Correct R2’s shared-tree claim: Antigravity owns .agents/skills, OpenCode owns .opencode/skills, and Codex’s project config suppresses only Kanmer-owned Antigravity copies while plugin skills remain canonical. Extend acceptance criteria with mixed-provider connection-order cases.
- **FRD-023 Agent skills system — Modifies, pending explicit user authorization.** Keep the roster and release rail unchanged; add the invariant that the install matrix must expose each Kanmer workflow once per host even where hosts intentionally share discovery standards.
- **ADR-0009 — Modifies or supersedes, pending explicit user authorization.** Preserve the contract hierarchy and installed-binary evidence method. Correct the convergence consequence using the official Codex and Antigravity discovery evidence; record selective Codex project suppression as the cross-host resolution.

No governing document will be edited and implementation will not start without that authorization.

## Steps

1. Build disposable positive-control fixtures against the installed Codex binary to establish whether skills.config.path takes a skill folder or SKILL.md, whether absolute paths work in trusted project .codex/config.toml, and whether disabling the local copy leaves the same-named plugin-qualified skill enabled. Record exact commands and outputs in ticket scratch; revise the design if selective suppression does not work.
2. Confirm the installed OpenCode binary loads a Kanmer-shaped SKILL.md from .opencode/skills and that the same fixture is absent after removing that directory. Retain the already documented/proven Antigravity .agents/skills mechanism and workspace-binding caveat.
3. With explicit user authorization, update FRD-012, FRD-023, and ADR-0009 or write a superseding ADR, linking any new ADR to the ticket before code changes.
4. Change the provider registry so OpenCode copies to .opencode/skills, Antigravity remains at .agents/skills, Grok remains at .grok/skills, and Codex remains marketplace-installed.
5. Extend the project TOML merge/unmerge model with Kanmer-owned skills.config entries for every bundled Antigravity-path skill. Use the path representation proven in step 1; preserve unrelated arrays/tables byte-semantically, make reconnect idempotent, and remove only exact owned entries on Codex disconnect.
6. Make connection order safe: Codex-first preconfigures its disables; Antigravity-first writes .agents skills that a later Codex connect suppresses; OpenCode and Antigravity coexist in separate destinations; disconnecting one host never removes another host’s skills or unrelated user config.
7. Reconcile legacy OpenCode ownership from the stamped .agents/skills tree to .opencode/skills without deleting the same roster still required by connected Antigravity. Base cleanup on provider registration state and the recorded stamp roster, never on name globs.
8. Update staleness detection, update prompts, gitignore rules, unit tests, and governing/supporting prose for the corrected destination/config matrix. Add a regression assertion covering the actual duplicate: a mixed Codex+Antigravity fixture exposes local Kanmer paths as disabled while the plugin roster remains available.
9. Run focused GUI/core tests and workspace typechecks, then full tests and the skill/plugin/AGENTS release rails. Perform fresh-session behavioral checks in Codex, OpenCode, and workspace-bound Antigravity.

## Verification

Capture the Codex path-shape/selective-disable probe, OpenCode native-directory probe, and mixed-provider fixture output. Run focused providers/connect/staleness suites, npm test, npm run typecheck, npm run verify:skills, npm run verify:agents-block, and the required build plus npm run plugin:check from the main checkout. In a disposable project, test Codex-first and Antigravity-first connection order, restart Codex, and prove the selector contains the plugin-qualified Kanmer roster without unqualified Kanmer duplicates while a non-Kanmer .agents skill remains visible. Invoke a Kanmer skill in OpenCode and workspace-bound Antigravity; do not accept listings alone as proof.

## Risks / open questions

- The official Codex pages disagree on whether skills.config.path names the folder or SKILL.md and omit relative-path semantics. Step 1 resolves this before implementation.
- Project config is trust-gated. Connect already surfaces that caveat for MCP; the same trust condition governs suppression, so the UI/status evidence must not claim duplicates are fixed in an untrusted project.
- TOML array-of-table merging can accidentally rewrite or delete user entries. Tests must start with unrelated skills.config records and prove round-trip preservation.
- If plugin and local skill enablement cannot be distinguished by exact path in the installed Codex build, stop: the fallback design choice is whether Codex Connect should use the shared local roster instead of the plugin, and that requires a new user decision and plan revision.
- Governing-doc edits remain authorization-gated.
