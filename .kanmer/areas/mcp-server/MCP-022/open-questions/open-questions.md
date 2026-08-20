# Open questions — MCP-022

All load-bearing decisions are resolved by MASTERPLAN S-05.

- [x] **What exactly is hashed?** — `JSON.stringify({boardRoot, format, repoRoot})` in that key order after canonical path normalization.
- [x] **How are paths canonicalized?** — Resolved absolute paths, `/` separators, lowercase Windows drive letter, no trailing slash except root; preserve remaining case and do not resolve symlinks.
- [x] **Is `boardSource` hashed?** — No. It is displayed only.
- [x] **Is the token portable across machines?** — No; it is deliberately machine-local because absolute roots are included.
- [x] **Is `expected_project` required now?** — No. Advertise `compat.expectedProject: "optional"`; missing field remains valid.
- [x] **Where is the field declared?** — On every write tool through `withProject()`; for `create_items` at call level only.
- [x] **When is it compared?** — Before actor mutation, `ensureInit()`, confirmation prompts, store reads that may initialize, or any write.
- [x] **Does the field reach store/frontmatter?** — No. Strip it before every handler; tests assert it never appears in YAML.
- [x] **Which error codes exist?** — Exactly `WRONG_PROJECT`, `REVISION_CONFLICT`, `GATE_BLOCKED`.
- [x] **Does coded output replace existing text?** — No. Existing `Conflict: …` and `Error: …` text remains; structured content supplements it.
- [x] **How do new clients interoperate with 0.3.3 servers?** — Read `get_status.compat.expectedProject`; omit the unknown field when capability is absent.
- [x] **When may the field become mandatory?** — No earlier than the release after compatible sending skills/clients have shipped; not in this ticket.

## Parked (explicitly deferred)

No questions are parked.
