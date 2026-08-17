# Files — SKILL-019

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/providers.ts` | Change opencode and Antigravity from the Codex-visible shared `.agents/skills` destination to provider-private supported locations; keep Codex on the plugin path. |
| `apps/gui/src/main/connect.ts` | Reconcile and disconnect legacy Kanmer-owned `.agents/skills` content safely when destinations change; preserve user-authored neighboring skills. |
| `apps/gui/src/main/providers.test.ts` | Replace the shared-tree assertion with provider-private destination and no-Codex-collision assertions. |
| `apps/gui/src/main/connect.test.ts` | Prove migration/reconciliation removes only Kanmer-owned legacy folders and that disconnect behavior remains safe. |
| `packages/core/src/staleness.ts` | Update copied-skill destinations and stale-path reporting to the new canonical layout while recognizing legacy owned installs. |
| `packages/core/src/staleness.test.ts` | Pin healthy, behind, legacy, and user-authored-skill behavior for the new destinations. |
| `.gitignore` | Ignore each provider-private generated skill directory and revise the rationale. |
| `docs/functional/frd/FRD-012-connect.md` | Modify R2 and acceptance criteria: the shared `.agents/skills` convergence is incompatible with Codex plugin installation. This governing-doc modification requires explicit authorization before implementation. |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Align the install-matrix reference and acceptance language with one skill surface per host. |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | Amend the convergence consequence and record the discovery evidence/decision, or supersede that narrow placement decision with a new ADR if review prefers an immutable decision trail. |
| `AGENTS.md` | Update repo-map or provider-install prose if it still claims the shared `.agents/skills` layout after the governing docs change. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `plugins/kanmer/.codex-plugin/plugin.json` | Codex’s intended Kanmer distribution is plugin skills, not copied project skills. |
| `.agents/plugins/marketplace.json` | Defines the Codex marketplace and explains why the repository itself contains an `.agents` subtree unrelated to project skill discovery. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Reconciliation ownership and managed-block rules that cleanup must preserve. |
| `docs/functional/frd/FRD-013-setup-as-reconciliation.md` | Reconciliation, rather than overlay or manual cleanup, is the product model. |
| `scripts/verify-skill-prose.mjs` | Release rail for skill prose; destination changes must not accidentally alter the canonical plugin roster. |
| `scripts/check-plugin-sync.mjs` | Pins plugin packaging and marketplace assumptions; confirms this ticket should not remove Codex’s plugin install. |
| OpenAI Build skills docs | Establishes `.agents/skills` scanning and duplicate-name behavior: https://learn.chatgpt.com/docs/build-skills. |
| OpenAI configuration reference | Establishes path-specific `skills.config` overrides and why they are not the portable fix: https://learn.chatgpt.com/docs/config-file/config-reference. |

## Ripple effects

Connect status text, update-skills prompts, disconnect peer detection, staleness reporting, generated-directory cleanup, packaged Connect behavior, and provider installation documentation all depend on the destination registry. Verification must exercise both fresh installs and upgrades from an existing stamped `.agents/skills` tree. The provider capability claims must be checked against installed binaries, not inferred solely from docs.

## Out of scope

The Kanmer MCP registration paths, plugin MCP limitations, plugin marketplace names, the skill roster/content, unrelated user-authored skills, and global Codex plugin management are unchanged. This ticket does not implement a general Codex duplicate-name resolver.
