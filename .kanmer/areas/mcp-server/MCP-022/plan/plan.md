# Plan — MCP-022: `expected_project` fingerprint and structured error codes

## Objective

Add an optional session-local project token to every MCP mutation so writes can be refused before touching the wrong board, and expose exactly three machine-readable error codes without changing existing human-readable error text.

## Starting state

- Eighteen write tools share `write()`, which currently calls `ensureInit()` before each handler.
- Write schemas do not declare `expected_project`; Zod would strip it.
- `guard()` flattens all thrown errors into text-only `isError` results.
- Core conflict/gate wording is already tested and must remain stable.
- `get_status` identifies roots/build but provides no reusable project token or capability advertisement.

## Governing constraints

- EPIC-009: project safety and structured errors only; no mandatory-token rollout or separate server.
- MASTERPLAN S-05 / Appendix A: exact hash payload/key order/path rules, all-write inventory, pre-init comparison, `create_items` call-level field, exact three codes, optional compatibility window, plugin rebuild.
- DOC-011 will add ADR/FRD text. Keep `docs_todo` until that ticket links the governing refs.

## Required changes

### 1. Project identity helper

1. Add `packages/mcp-server/src/project-identity.ts`.
2. Implement `canonicalProjectPath(input)`:
   - `path.resolve(input)`;
   - replace `\` with `/`;
   - lowercase only an initial Windows drive letter (`C:` → `c:`);
   - remove trailing `/` unless the value is `/` or a drive root such as `c:/`;
   - do not lowercase the rest, call `realpath`, inspect Git, or use cwd-derived alternative roots.
3. Implement `projectIdentity({boardRoot, format, repoRoot, boardSource})` that constructs the object in code order:

   ```ts
   const payload = {
     boardRoot: canonicalProjectPath(boardRoot),
     format,
     repoRoot: canonicalProjectPath(repoRoot),
   };
   ```

4. Hash exactly `JSON.stringify(payload)` with SHA-256 hex and return token `kanmer-proj-v1:<hex>`.
5. Return/display `boardRoot`, `format`, `repoRoot`, `boardSource`, and `fingerprint`; never include `boardSource` in payload.
6. Add deterministic unit-like smoke vectors for POSIX paths, Windows drive casing, mixed separators, trailing separators, key order, and source independence.

### 2. Error helper

7. Add `packages/mcp-server/src/errors.ts`.
8. Define `KanmerErrorCode` as exactly:
   - `WRONG_PROJECT`
   - `REVISION_CONFLICT`
   - `GATE_BLOCKED`
9. Define `KanmerError extends Error` with readonly `code` and an option indicating whether supplied text already has the compatibility prefix.
10. Implement classification of caught errors:
    - explicit `KanmerError` retains its code;
    - messages beginning `Conflict:` classify `REVISION_CONFLICT`;
    - known gate/collapsed-pipeline errors from store classify `GATE_BLOCKED` using narrowly tested message signatures, not a broad `/blocked/` guess;
    - all other errors remain uncoded ordinary failures.
11. Implement the single `isError` result builder:
    - compatibility text is unchanged for `Conflict:` messages;
    - non-prefixed messages become `Error: <message>` exactly as today;
    - coded failures include `structuredContent: { error: { code, message } }` where `message` is the unprefixed logical message or documented full compatibility message consistently;
    - uncoded failures use the same builder without inventing an error code.
12. Remove/replace the old independent `fail()` and caught-error result paths so all `isError` responses use this builder, including explicit not-found/cancelled results.

### 3. Schema helper and write wrapper

13. In `index.ts`, define one `expectedProjectField` Zod schema with an optional string and compatibility description.
14. Define `withProject(shape)` returning `{ ...shape, expected_project: expectedProjectField }` while preserving inferred handler types.
15. Apply it to every one of the 18 write tool input schemas listed in `files.md`.
16. For `create_item`, use `withProject(createFields)` but keep `expected_project` outside the object passed to `store.createItem`.
17. For `create_items`, define:

    ```ts
    inputSchema: withProject({
      items: z.array(z.object(createFields)).min(1).max(50)
    })
    ```

    Never add the field to `createFields` or `items[]`.
18. Ensure `migrate_board`, `delete_item`, destructive column tools, group docs, scratch, link tools, and all other writes receive the field; add an inventory assertion/test so a future write registration cannot omit it silently.
19. Refactor `write()` so the first argument’s parsed input is treated as an object, and:
    - extract `expected_project` into a local;
    - produce a shallow clean input without that key;
    - compute current project identity before `ensureInit()` using `store.detectFormat()`, current roots, and board source read without initialization;
    - if a supplied token differs, throw `KanmerError("WRONG_PROJECT", ...)` immediately;
    - only after successful/omitted comparison set actor, call `ensureInit()`, and invoke the handler with the clean input plus unchanged MCP extra/context args.
20. If computing board source would require a write, use existing read-only `getBoardWithSource()`; a synthesized default is permitted and its source is display-only.
21. Ensure dry-run `migrate_board` still accepts/checks the token because it is a mutating tool surface, even though a dry run may not write after initialization. The mismatch path must still initialize nothing.
22. Ensure destructive elicitation occurs only after token validation.
23. Do not add `expected_project` to core input types or activity entries.

### 4. `get_status`

24. During `get_status`, compute the project identity from the already-read format/source and store roots.
25. Add:

    ```json
    "project": {
      "fingerprint": "kanmer-proj-v1:…",
      "boardRoot": "…",
      "format": 3,
      "repoRoot": "…",
      "boardSource": "file"
    },
    "compat": {
      "expectedProject": "optional"
    }
    ```

26. Keep current `projectRoot`, `repoRoot`, `rootSource`, `repoRootSource`, and other status fields intact.
27. Update `get_status` description to explain that clients sniff compatibility before sending and that the fingerprint is machine-local.

### 5. Smoke/protocol proof

28. Extend smoke orientation assertions to recompute the exact hash independently and compare it.
29. Assert changing only `boardSource` does not change the token; differing format/root does.
30. On a fresh root, capture a recursive byte/file listing, call a write with a deliberately wrong token, and assert:
    - `isError === true`;
    - text begins `Error:` and names current/expected project sufficiently to recover;
    - `structuredContent.error.code === "WRONG_PROJECT"`;
    - `.kanmer` remains absent and file listing is unchanged.
31. Repeat mismatch coverage for representative schema categories and specifically `create_items` and `migrate_board`; add schema/tool-list inspection covering all 18 tools.
32. Call writes with no token and assert existing-client behaviour succeeds.
33. Call a write with the exact token and assert success.
34. Inspect resulting ticket/group/frontmatter bytes and assert `expected_project` never appears.
35. Trigger stale `expected_updated` or `expected_version`; assert compatibility text still begins `Conflict:` and structured code is `REVISION_CONFLICT`.
36. Trigger a real document gate refusal via `move_item`; assert existing text and code `GATE_BLOCKED`.
37. Use `smoke-protocol.mjs` to assert raw JSON-RPC includes structured content if the high-level client normalizes it.
38. Assert unrelated validation/not-found errors do not masquerade as one of the three codes.

### 6. Documentation and bundle

39. Update `plugins/kanmer/tool-reference.md` in its existing field-semantics/status sections:
    - optional field on writes;
    - call-level placement for `create_items`;
    - sniffing rule;
    - project/compat status block;
    - exact three coded failures.
40. Do not add a tool row or change the tool count.
41. Run typecheck, build, standard smoke, protocol smoke, and discovery smoke.
42. From the normal main checkout, rebuild the plugin bundle and run sync check; commit generated bytes.
43. Confirm old client calls in existing tests need no edits beyond assertions for added output fields.

## Expected files

Add:
- `packages/mcp-server/src/project-identity.ts`
- `packages/mcp-server/src/errors.ts`

Modify:
- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/smoke.mjs`
- `packages/mcp-server/src/smoke-protocol.mjs` if raw-result coverage is required
- `plugins/kanmer/tool-reference.md`
- `plugins/kanmer/mcp/kanmer-mcp.cjs` (generated)

## Acceptance checks

- Exact fingerprint vectors pass and key/source rules are proven.
- Every write schema advertises optional `expected_project`.
- `create_items` accepts it only at call level.
- Wrong token is refused before initialization/elicitation/store mutation and changes zero bytes.
- Missing and correct tokens both preserve existing write behaviour.
- Transport metadata never reaches stored YAML or handler inputs.
- `get_status` returns project identity and optional capability without deleting/renaming existing fields.
- Exactly three structured codes are possible; conflict/gate/wrong-project each have smoke proof.
- Existing `Conflict:` / `Error:` text remains compatible.
- Tool count is unchanged, reference is updated once, and plugin bytes synchronize.

## Verification commands

```bash
npm run typecheck
npm run build
node packages/mcp-server/src/smoke.mjs
npm run smoke:protocol
npm run smoke:discovery
```

From a normal main checkout:

```bash
npm run build
npm run plugin:build
npm run plugin:check
git diff --check
git status --short
```

## Risks / deviation rules

- A token check after `ensureInit()` fails the principal requirement even if the requested mutation is refused.
- An undeclared schema field is silently stripped; inventory every write registration.
- Adding the field to `createFields` corrupts bulk entry semantics and risks YAML leakage.
- Broad error-text matching can miscode validation failures; use narrow, tested classification.
- Do not make the field mandatory, create a portable project ID, hash board source, modify core error text, or add more codes.
- Do not merge or begin MCP-023.

## Stop condition

Stop when all 18 write tools accept the optional call-level token, wrong-project requests demonstrably leave a fresh root byte-for-byte untouched, project identity is independently reproducible from `get_status`, the three coded failure paths retain compatibility text, plugin/reference artifacts are synchronized, and the PR is ready for independent review. Do not merge or start MCP-023.
