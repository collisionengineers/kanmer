# Research — MCP-022: project fingerprint and coded write failures

## Questions

1. How can a client prove it is writing to the board it just read without breaking 0.3.3 clients/servers?
2. Where must the optional token be declared and removed so it never reaches stored YAML?
3. How can existing error text remain stable while exposing machine-readable codes?

## Findings

### Current write path

- All 18 mutating MCP tools are registered in `packages/mcp-server/src/index.ts` and wrapped by `write()`: `create_group`, `update_group`, `set_group_doc`, `create_item`, `create_items`, `update_item`, `move_item`, `take_ticket`, `set_ticket_doc`, `append_scratch`, `link_doc`, `link_items`, `add_column`, `update_column`, `remove_column`, `reorder_columns`, `migrate_board`, and `delete_item`.
- `write()` currently sets the activity actor, calls `ensureInit()`, then invokes the handler under `guard()`. A wrong-project comparison after `ensureInit()` would already create `.kanmer`, violating the zero-write requirement.
- Zod object schemas strip undeclared keys. An `expected_project` value sent to a tool is unavailable to the handler unless each write schema explicitly declares it.
- `create_item` uses the shared `createFields` shape directly. `create_items` embeds `z.object(createFields)` for each entry. The project token is call metadata, not ticket data: it belongs beside `items`, never in `createFields` or individual entries.
- Handler destructuring/spreading can leak transport-only fields. `serialiseItem` intentionally preserves unknown frontmatter keys, so a leaked `expected_project` can become durable YAML.

### Fingerprint contract

- The fingerprint input is exactly `JSON.stringify({boardRoot, format, repoRoot})` in that key order.
- `boardRoot` is the resolved MCP `projectRoot`; `repoRoot` is `store.paths.repoRoot`; `format` is `await store.detectFormat()`.
- Path canonicalization is load-bearing: absolute/resolved, `/` separators, lowercase Windows drive letter, no trailing slash except a filesystem root. Do not lowercase the remaining path and do not resolve symlinks.
- Hash with SHA-256 hex and prefix with `kanmer-proj-v1:`. `boardSource` is displayed in the status project block but excluded from the hash so initialization/repair does not invalidate a token for the same physical roots/format.
- The token is intentionally machine-local and session-oriented because absolute paths are part of it.

### Compatibility

- Existing 0.3.3 clients omit the field and must continue to write successfully.
- Existing 0.3.3 servers reject unknown fields because generated MCP schemas use `additionalProperties: false`; therefore updated skills/clients must first read `get_status.compat.expectedProject` and send the token only when it is reported.
- This ticket advertises `compat.expectedProject: "optional"`; it does not make the field mandatory. Mandatory enforcement is deferred until at least the release after sending clients/skills ship.

### Error model

- `guard()` currently turns every thrown error into text `Error: <message>` and `isError: true`.
- Optimistic concurrency errors from core start with `Conflict:`; smoke/tests match that wording. Gate refusals are ordinary thrown errors whose message identifies document gates. Text must remain unchanged for compatibility.
- Introduce a `KanmerError` carrying one of exactly three codes:
  - `WRONG_PROJECT`
  - `REVISION_CONFLICT`
  - `GATE_BLOCKED`
- `failCoded` should be the sole `isError` result builder and return both:
  - existing text content (`Conflict: …` unchanged; otherwise `Error: …`);
  - `structuredContent: { error: { code, message } }`.
- Classification may wrap existing errors at the MCP boundary without changing core wording:
  - message begins `Conflict:` → `REVISION_CONFLICT`;
  - known gate refusal/collapse messages → `GATE_BLOCKED`;
  - explicit token mismatch throws `KanmerError(WRONG_PROJECT, …)`.
  Errors outside these three remain ordinary protocol-visible failures through a non-coded fallback path, not invented new codes.

## Decisions

- Add isolated helpers for path canonicalization/fingerprint and coded errors rather than expanding the already-large registry logic inline.
- Change `write()` to receive parsed input, extract/strip `expected_project`, compute/compare before actor mutation and `ensureInit()`, then pass a clean input object to handlers.
- Use one `withProject()` schema helper on every mutating input shape; special-case `create_items` at call level.
- Add `get_status.project` with the token plus roots/format/source, and `compat.expectedProject: "optional"`.
- Prove mismatch causes zero bytes by snapshotting a fresh root before/after and by asserting `.kanmer` is still absent.

## Remaining unknowns

None. DOC-011 will formalize the compatibility window; this ticket implements the already-adopted S-05 contract and keeps `docs_todo` until that governing document lands.
