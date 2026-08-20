# Checklist — MCP-022

## Project identity

- [ ] Add `project-identity.ts` using only Node path/crypto.
- [ ] Canonicalize absolute roots to `/`, lowercase only Windows drive letter, remove non-root trailing slash.
- [ ] Build payload in exact key order `boardRoot`, `format`, `repoRoot`.
- [ ] Hash exact `JSON.stringify(payload)` with SHA-256 and prefix `kanmer-proj-v1:`.
- [ ] Keep `boardSource` display-only and prove it does not affect the hash.
- [ ] Add deterministic POSIX/Windows/key-order/source-independence vectors.

## Errors

- [ ] Add `KanmerError` and exact code union: `WRONG_PROJECT`, `REVISION_CONFLICT`, `GATE_BLOCKED`.
- [ ] Make one builder own all `isError` results.
- [ ] Preserve existing `Conflict: …` text exactly.
- [ ] Preserve existing `Error: …` text shape for non-conflict failures.
- [ ] Add structured content only with the exact classified code/message.
- [ ] Narrowly classify real gate errors; do not code unrelated validation errors.

## Write schemas/wrapper

- [ ] Add one optional `expected_project` schema and `withProject()` helper.
- [ ] Cover all 18 write tools listed in `files.md`.
- [ ] Put `create_items.expected_project` beside `items`, never in `createFields` or entries.
- [ ] Strip the token before every handler/store call.
- [ ] Compare supplied token before actor mutation, `ensureInit()`, elicitation, or writes.
- [ ] Keep omitted token valid.
- [ ] Keep exact token valid.
- [ ] Ensure `migrate_board` and destructive tools are covered.
- [ ] Assert no stored file/frontmatter/activity contains `expected_project`.

## Status and compatibility

- [ ] Add `get_status.project` with fingerprint, canonical roots, format, and board source.
- [ ] Add `compat.expectedProject: "optional"`.
- [ ] Preserve all existing status fields.
- [ ] Update description with sniff-before-send and machine-local semantics.

## Proof

- [ ] Independently recompute and match the status token in smoke.
- [ ] Wrong token on a fresh root returns `WRONG_PROJECT` and leaves `.kanmer` absent/bytes unchanged.
- [ ] Cover wrong token for `create_items` and `migrate_board`.
- [ ] Inventory all write schemas for the field.
- [ ] Old-client write without token succeeds.
- [ ] Correct-token write succeeds.
- [ ] Stale revision returns `REVISION_CONFLICT` with unchanged conflict text.
- [ ] Real gate refusal returns `GATE_BLOCKED` with unchanged text.
- [ ] Raw protocol result contains structured content.
- [ ] Unrelated error has no invented code.

## Docs/build/scope

- [ ] Update existing tool-reference field/status semantics; no new tool row or count.
- [ ] Run typecheck, build, standard/protocol/discovery smokes.
- [ ] From normal main checkout run plugin build/check and commit generated bundle.
- [ ] Confirm no core error/frontmatter change, mandatory rollout, extra code, project UUID, or dependency.
- [ ] Open PR with `Kanmer: MCP-022` and name `write()`/`get_status` as production callers.
- [ ] Keep `docs_todo` until DOC-011 links governing docs.
- [ ] Stop at review readiness; do not merge or begin MCP-023.

## Progress notes

Record the independently calculated payload/hash, all 18 schema names, fresh-root before/after listing, and exact JSON-RPC error results.
