# 2.2 Changed signatures

- **`set_ticket_doc` / `get_ticket_doc`** — `doc` param `z.enum([...])` (`index.ts:143`) → `z.string()`; validation + the "valid ids" error move to core (§1.3). Description points at the board's per-area doc types.
- **`move_item`** — enforces per-area hard gates; on failure returns a clean `isError` naming the missing doc(s)/repo-doc and the boundary (§1.2).
- **`create_item` / `create_items`** — accept `refs` + `docs_todo` (establish the governing PRD/FRD/ADR link at creation, request #13) and `commits`/`prs`/`deployment` where relevant (request #16).
- **`update_item`** — add `refs`, `commits`, `prs`, `deployment`; **remove `due`**. `summarise()` (`index.ts:121`) drops `due`, adds `refs`/`deployment`.
- **`list_items`** — remove `due_before`/`overdue` params (`index.ts:239-246`); `get_status`/`list_board` surface the per-area doc types + gate config + whether deployment tracking is on, so skills learn the doc model without a bespoke call.
