# Plan — SKILL-019: Stop Codex loading duplicate repo-local and plugin Kanmer skills

## Approach

Keep the plugin-installed, plugin-qualified roster as Codex’s single Kanmer skill surface, because OpenAI documents plugins as the reusable distribution mechanism and explicitly documents that `.agents/skills` duplicates are not merged. Move non-plugin hosts to their own supported project skill locations rather than trying to suppress duplicates through machine-global Codex configuration. Make the change as a reconciliation: prove the alternative paths against installed binaries first, update the provider registry, migrate only Kanmer-owned stamped folders from the legacy shared tree, and keep user-authored skills untouched. This beats “write Codex disables” (absolute, user-global, non-portable) and “remove the Codex plugin” (abandons the intended distribution/update path and leaves Codex behavior dependent on which other provider happened to Connect).

## Governing docs

- **FRD-012 Connect — Modifies, pending explicit user authorization.** R2 currently celebrates one `.agents/skills` write serving several hosts. The official Codex discovery rule proves that layout conflicts with R2’s simultaneous Codex plugin install. Update the matrix and acceptance criteria to require one visible Kanmer skill surface per host and provider-private copy destinations where plugins are not used.
- **FRD-023 Agent skills system — Modifies, pending explicit user authorization.** Preserve the roster and atomic-sibling constraint, but clarify that “install matrix per FRD-012” must not expose the same roster twice to one host.
- **ADR-0009 — Modifies or supersedes, pending explicit user authorization.** Retain the method clause and contract hierarchy. Replace the narrow convergence consequence that recommends `.agents/skills` with the newly measured Codex collision and the provider-private placement decision. If the project treats this as a new architectural choice rather than a correction, write and link a new ADR through `kanmer-docs` instead.

Because those linked documents currently prescribe the conflicting layout, implementation must not start until the user authorizes their update.

## Steps

1. Run positive-control probes against the installed opencode and Antigravity binaries to prove the exact provider-private skill directories they load (`.opencode/skills` and `.agent/skills`, respectively). Record commands and outputs in ticket scratch. Stop and revise the plan if either path does not work.
2. With explicit user authorization, update FRD-012, FRD-023, and ADR-0009 (or create a superseding ADR) so governance defines one visible Kanmer skill surface per host and names the migration behavior.
3. Change `PROVIDERS` so Codex remains marketplace/plugin-installed while opencode and Antigravity copy to the verified private destinations; retain Grok’s existing private destination.
4. Extend Connect reconciliation to detect a stamped legacy `.agents/skills` tree, remove only the roster Kanmer recorded as owned, preserve user-authored siblings byte-for-byte, and remove the stamp/directory only when safe. Make disconnect/peer logic destination-specific under the new registry.
5. Update core staleness discovery to report the new canonical copied destinations and give a useful reconciliation finding for a legacy Kanmer-owned `.agents/skills` install without treating unrelated user skills as drift.
6. Update unit tests for provider destinations, fresh Connect, upgrade reconciliation, disconnect, shared/legacy ownership, staleness, and exact gitignore coverage. Add a regression assertion that no Codex-scanned `.agents/skills/kanmer-*` tree is produced by the supported provider matrix.
7. Update `.gitignore`, AGENTS.md, and setup/connect prose that names generated destinations; keep plugin manifests, marketplace names, and canonical skill content unchanged.
8. Run focused GUI/core tests and typechecking, then the full skill/plugin/release rails appropriate to touched files. Perform a fresh-session manual Codex check showing only plugin-qualified Kanmer skills, plus positive invocation checks in opencode and workspace-bound Antigravity.

## Verification

Capture: installed-binary probe output for both alternative directories; focused Vitest results for `providers`, `connect`, and `staleness`; root `npm test` and `npm run typecheck`; `npm run verify:skills`, `npm run verify:agents-block`, and `npm run plugin:check` from the main checkout after the required build. For behavioral evidence, use a disposable repository with the legacy stamped tree, run reconciliation, prove user-authored siblings survive, then start a new Codex session and record that the Kanmer roster appears only from the plugin. Invoke one Kanmer skill in each supported copied-skill host rather than relying on a listing alone.

## Risks / open questions

- Antigravity’s singular compatibility path may not behave identically to its primary plural path in the installed version; step 1 is a hard validation gate.
- Destination migration is destructive to Kanmer-owned generated folders. Ownership must come from the stamp roster, never from a `kanmer-*` glob alone.
- A project may have opencode and Antigravity connected together. Separate destinations duplicate bytes on disk, intentionally, to avoid duplicate capabilities inside Codex; reconciliation and disconnect must handle each independently.
- Governing-doc edits are required and await explicit user authorization.
