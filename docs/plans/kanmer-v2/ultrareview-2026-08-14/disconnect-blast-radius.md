# disconnectAgent has wrong blast radius: rm -rf whole skills dir + drops shared AGENTS.md block

- **Severity:** normal
- **PR:** #9 (Phase 6: agents connect)
- **File:** `apps/gui/src/main/connect.ts:230-235`
- **Source bug ids:** bug_005, bug_013 (merged)

## Follow-up verdict — validated

Both destructive paths are present exactly as reported. Installation copies the
contents of `plugins/kanmer/skills` into the provider's shared directory and adds
one Kanmer marker; disconnect removes the directory itself recursively. The
managed AGENTS block is provider-neutral, installed idempotently for opencode,
Grok and Antigravity, then dropped unconditionally after disconnecting any one of
them. Config unmerge preserves other keys but does not check the other providers
before shared instruction cleanup.

## Summary

`disconnectAgent` for a `copySkills` provider is destructive in two ways that don't mirror its idempotent `ensure` counterpart:

1. The `.grok/skills` cleanup path does `rm -rf` on the *whole* directory, but that folder is grok's canonical skills location — a user or another plugin can legitimately place `.grok/skills/mycompany-review/` there and Disconnect will silently obliterate it with no warning or recovery.
2. `dropAgentsBlock(projectRoot)` is called unconditionally on any copySkills disconnect, but the managed block is a single shared "Kanmer operating instructions" body every copySkills host reads (opencode, grok, antigravity) — so disconnecting opencode drops the block that a still-connected antigravity is depending on.

## Detail

Both problems stem from treating install as one indivisible thing to unwind rather than the layered install `installSkills` actually performs. The install side is careful: `ensureAgentsBlock` uses `applyManagedBlock`, which is idempotent (byte-identical rewrite when the block is already there); the copy uses `cp(pluginRoot()/skills, dest, {recursive:true})`, which drops *individual* subfolders into `.grok/skills` alongside whatever else is there. The disconnect side is not symmetric — it `rm -rf`s the whole `skillsDir` and drops the shared block unconditionally.

### Bug 1 — silent data loss on `.grok/skills`

`providers.ts` declares grok's install as `{ kind: "copySkills", skillsScope: "project", skillsDir: ".grok/skills" }`. That directory is grok's canonical, documented skills location — not a kanmer-owned subdirectory. `installSkills` at `connect.ts:111` does `cp(pluginRoot()/skills, dest, {recursive:true})`, so kanmer's on-disk footprint is a set of subfolders inside `.grok/skills` (`kanmer-tickets/`, `kanmer-plan/`, …) plus a `.kanmer-skills-version` stamp. On Disconnect, `connect.ts:232` does `rm(join(projectRoot, ".grok/skills"), {recursive:true, force:true})` — no attempt to distinguish kanmer's subfolders from foreign ones. This directly contradicts the pattern the config-file providers use: `opencodeUnmerge`/`mcpServersUnmerge` remove only the `kanmer` key and preserve everything else in the JSON — skills disconnect is the outlier.

### Bug 2 — shared AGENTS.md block dropped while other providers still need it

`agentsBlock.ts:11` defines one `BLOCK_BODY` ("Kanmer operating instructions") with no per-provider distinction. `installSkills` at `connect.ts:107` always calls `ensureAgentsBlock` for any copySkills provider (idempotent). But `disconnectAgent` at `connect.ts:234` unconditionally calls `dropAgentsBlock` for any copySkills provider — with no check whether other copySkills providers are still connected. Three copySkills providers ship: opencode, grok, antigravity. Users are actively invited to connect several of them.

### Step-by-step proof (both bugs, one user session)

1. User has their own `.grok/skills/mycompany-review/` with an in-house code-review skill.
2. `connectAgent("opencode", root)` → `installSkills` writes the AGENTS.md block (opencode is `skillsScope: "agentsOnly"`, so no folder copy).
3. `connectAgent("grok", root)` → `ensureAgentsBlock` is idempotent, `cp` drops `kanmer-*` subfolders into `.grok/skills` alongside `mycompany-review/`.
4. `connectAgent("antigravity", root)` → `ensureAgentsBlock` idempotent again.
5. `disconnectAgent("grok", root)` → hits `connect.ts:230-235`: `rm -rf .grok/skills` deletes `mycompany-review/` (Bug 1), then `dropAgentsBlock` removes the block from `AGENTS.md`.
6. opencode and antigravity are still registered in `opencode.json` / `.agents/mcp_config.json` and still appear "connected" in Settings, but AGENTS.md now has no Kanmer instructions — the sole skill-discovery mechanism for `agentsOnly` scope providers. Agents opening the repo see a project with no Kanmer context despite the Settings UI claiming otherwise (Bug 2).

### Impact

Bug 1 is irrecoverable silent data loss on a user-invoked action with no confirmation dialog and no undo. Bug 2 is silent config breakage of a still-active connected feature. Both trip on the intended path (three shipping copySkills providers, one canonical grok skills directory).

## Fix

Two small, symmetric changes:

- **(a)** In the copySkills `project` branch, list `pluginRoot()/skills` subdirectory names and `rm` only those + `SKILLS_VERSION_FILE`, leaving unknown entries intact; if the folder is empty afterwards, `rmdir` it. Symmetric with the config unmerges.
- **(b)** Before calling `dropAgentsBlock`, scan the other copySkills providers' config files (via each provider's `register` spec) for a `kanmer` entry — only drop when none is found. Alternative: maintain a small manifest of connected providers in `.kanmer/` and reference-count.

## Resolution plan

1. Add a helper in `connect.ts` that enumerates the immediate bundled skill
   directory names from `pluginRoot()/skills`; remove only those names and
   `.kanmer-skills-version` from the configured destination. Validate every name
   as a direct child before removal. Remove the destination directory only if a
   subsequent `readdir` proves it empty.
2. Add a read-only `isRegistered(provider, projectRoot)` helper for each register
   kind: inspect the provider's config-file merge target for the `kanmer` entry;
   for CLI providers use their supported list/read command without mutation.
3. After unregistering the requested provider, evaluate all *other*
   `copySkills` providers. Call `dropAgentsBlock` only when none remains
   registered. A failed or indeterminate check must preserve the block.
4. Keep cleanup ownership explicit: marketplace providers never participate;
   project-scope skill deletion and shared AGENTS-block deletion are separate
   operations with separate result text.
5. Add `connect.test.ts` temporary-project tests: preserve an unknown Grok skill
   and file; remove every bundled Kanmer skill and marker; retain AGENTS when
   opencode or Antigravity remains; remove it only after the last dependent host;
   preserve it when registration detection fails.

Illustrative ownership diff:

```diff
-await rm(join(projectRoot, provider.install.skillsDir), { recursive: true, force: true });
+await removeBundledSkillsOnly(projectRoot, provider.install.skillsDir);
...
-await dropAgentsBlock(projectRoot);
+if (!(await hasRegisteredCopySkillsPeer(id, projectRoot))) {
+  await dropAgentsBlock(projectRoot);
+}
```

Acceptance requires byte-identical preservation of foreign skills/config keys and
the correct shared-block lifetime across every disconnect order.

## Remediation evidence

Remediated on PR #9 (`91906b2`, replayed at `9fae897`): bundled-skill deletion
is ownership-scoped and malformed peer registration retains the shared block. Focused GUI tests and typecheck passed.
