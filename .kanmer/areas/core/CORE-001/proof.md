# Proof

**Scope note:** gathered on the working branch `v3-phase-minus-1-prework` at `cbb7b3d`, not on
merged `main`. This repo's v3 work is running as a single branch rather than one PR per ticket,
so "merged main" is not yet a distinct state. Stated plainly rather than implied.

## 1. The reported failure no longer reproduces

Before the fix, against this repo's real board:

    create_item(refs: ["docs/functional/frd/FRD-002-requirement-profiles.md"])
    -> Error: Referenced document "..." does not exist under the project root.

After, against the same board:

    projectRoot: C:\Users\PC\Documents\GitHub\kanmer\.worktrees\kanmer
    repoRoot   : C:\Users\PC\Documents\GitHub\kanmer   (derived)
    refs before: []
    refs after : ["docs/functional/frd/FRD-012-connect.md",
                  "docs/architecture/adr/ADR-0007-codex-project-config.md"]

GUI-002 now carries real governing-doc refs instead of `docs_todo`.

## 2. The shipped bundle honours both tiers, over real stdio

Not the source build — `plugins/kanmer/mcp/kanmer-mcp.cjs`, the committed artifact that plugin
installs actually run, driven over stdio with a real `initialize` handshake and a `tools/call`
setting a ref that exists **only in the source checkout**:

    derived  (--root only)      : ACCEPTED
    explicit (--root --repo-root): ACCEPTED

The derived case is the one that matters for existing users: it is an MCP server registered
before this flag existed, working with no reconnect.

## 3. The gate it exists to satisfy actually opens

Covered by the core regression test — a ticket whose only governing-doc evidence is a ref
resolved through the derived repo root moves `backlog → researching`, which is the leave-Backlog
boundary. Previously unreachable except via `docs_todo`.

## 4. Regression coverage added

`packages/core/src/docs.test.ts`, three cases: derived repo root accepts a repo-only ref and
opens the gate; explicit `repoRoot` is honoured and a ghost ref is still rejected; a colocated
board falls back to `projectRoot` unchanged.

## 5. Full rail

| Check | Result |
|---|---|
| `npm test` | 109 core (+3) · 95 GUI |
| `npm run typecheck -w @kanmer/gui` | clean |
| `npm run build && plugin:build && plugin:check` | 24 tools match, bundle bytes match |
| `node packages/mcp-server/src/smoke.mjs` | 85/85 |
| `npm run smoke:protocol` | 26/26 |
| `npm run verify:agents-block` | 26/26 |

## What is not proven here

The **GUI's** explicit `repoRoot` path (`main/index.ts`) and the `--repo-root` argument
`connect.ts` now writes are exercised by typecheck and by the bundle probe above, but not by a
running packaged app — that needs a `dist` + reinstall, which force-kills live agent MCP
sessions (AGENTS.md §8 gotcha 10). Deferred to the next release rather than done mid-session.
The derivation tier means the GUI path is a precision improvement, not the thing that makes the
fix work, so nothing depends on it landing first.
