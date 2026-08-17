# Proof — SKILL-019

## Verified artifact

- Verified on merged `main` at `db7ed679368a222d59f5b589d35b246468f51cf4`.
- GitHub PR #63 is merged; merge time: 2026-08-17T04:47:07Z.
- Source commits: `3e0a530`, `cc0974c`.

## Merged-main evidence

### Type safety

Command: `npm run typecheck`

Result: exit 0. Core, MCP server, UI, and GUI workspace typechecks all passed.

### Test suites

Command: `npm test`

Result: exit 0.

- Manual: up to date, 19 chapters.
- Core: 11 files, 249 tests passed.
- GUI: 24 files, 277 tests passed.
- Script suites: 46 tests passed.

The merged GUI results include 63 provider tests and 21 connect tests. The merged core results include 39 staleness tests.

### Build

Command: `npm run build`

Result: exit 0. Core ESM/types, MCP ESM, and standalone CJS bundle built successfully.

### Skill and AGENTS release rails

Commands:

- `npm run verify:skills`
- `npm run verify:agents-block`

Results: exit 0. All skill checks passed; AGENTS block verification passed 28/28.

### Direct destination evidence

Command:

```text
rg -n -A 1 -B 1 'skillsDir: "\.opencode/skills"|skillsDir: "\.agents/skills"' apps/gui/src/main/providers.ts
```

Merged-main output identifies:

- `providers.ts:740` — OpenCode: `.opencode/skills`
- `providers.ts:803` — Antigravity: `.agents/skills`

The main checkout remained clean and aligned with `origin/main` after verification.

## Acceptance result

PASS. OpenCode's Connect-owned roster is isolated in its native directory, Antigravity's destination remains unchanged, disconnect isolation is tested in both directions, and staleness recognizes the new destination. The remaining Codex/Antigravity duplicate is explicitly deferred and is not claimed resolved.
