# Plan — SKILL-034

## Objective

Make the command prescribed by kanmer-setup runnable from the installed plugin layout by shipping the canonical writer and body with the plugin, and make plugin verification reject any future omission or drift.

## Starting state

The repository owns `scripts/agents-block.mjs` and `scripts/agents-block-body.mjs`, and setup instructs agents to reach them via `../../scripts` from the skill directory. The v0.3.7 installed plugin contains skills but no version-root `scripts` directory, so the command cannot run. The skill's hand-edit fallback works but defeats repeatable tool-owned reconciliation.

## Governing docs

FRD-013 requires setup to be safe, repeatable reconciliation. Shipping the existing canonical writer—rather than duplicating its logic—makes the installed path perform the same idempotent, marker-safe operation as the source checkout.

## Required changes

1. Extend `build-plugin.mjs` to copy the canonical writer and body into `plugins/kanmer/scripts/` after ensuring the destination exists.
2. Commit the copied artifacts, consistent with the existing committed MCP bundle model.
3. Extend `plugin:check` to compare both plugin script bytes against their canonical sources and fail when either is missing or stale.
4. Add a staged installed-layout regression: copy/build the plugin to a temporary version-root shape, execute `node <skill-dir>/../../scripts/agents-block.mjs <repo>` twice, assert the first reconciliation is correct and the second changes no bytes, and retain malformed-marker refusal.
5. Clarify setup prose only if necessary so agents resolve the command from the actual SKILL.md directory without machine paths.
6. Update AGENTS.md for the new plugin packaging/check convention.

## Expected files

Only the files named in the files document; no dependencies.

## Do not modify

Managed block text, GUI Connect's imported writer, board data, provider registrations, release scripts, or unrelated skills.

## Commands

- `npm run build && node scripts/build-plugin.mjs`
- `npm run plugin:check`
- `npm run verify:agents-block`
- `npm run test:scripts`
- `npm run verify:skills`
- `git diff --check`

## Acceptance checks

- A fresh plugin build contains both scripts at the path the installed skill resolves.
- The copied files are byte-identical to canonical sources.
- The exact installed-layout command exits 0 and reconciles a stale block.
- Running the exact command twice leaves the target byte-identical on the second run.
- Missing or modified packaged scripts fail `plugin:check`.
- Malformed markers still refuse without mutation.

## Failure and deviation rules

Stop if correctness requires duplicating block logic, introducing a package dependency, changing managed block content, or relying on the source checkout. Preserve any first failure. A plugin cache mutation is not proof; tests must construct a disposable installed layout.

## Stop condition

Stop after the bounded change is committed/pushed, its PR includes `Kanmer: SKILL-034`, post-implementation report exists, and the ticket is in Review. The author does not review or merge.
