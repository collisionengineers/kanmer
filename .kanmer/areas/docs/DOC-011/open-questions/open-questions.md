# Open questions — DOC-011

- [x] **Why an ADR plus FRD deltas rather than one new FRD?** — The compiled workflow is a cross-cutting architecture decision; each durable feature behavior belongs in its existing FRD.
- [x] **How many stages/readiness predicates exist?** — Six fixed stages and four boundary predicates: approval, execution/dispatch, review, completion.
- [x] **What happens to `enter-verifying`?** — It remains a reserved evaluator boundary with no injected requirement.
- [x] **Are review/proof contents new hard gates?** — No. Existing document-existence gates remain; skills/GitHub checks consume structured content.
- [x] **Is `expected_project` mandatory?** — No. Optional compatibility period; clients sniff status and omit for older servers. Mandatory is explicitly deferred.
- [x] **Is custom profile prohibited by code?** — No. Policy says backfill/import only for new work; ungated creation remains a feature.
- [x] **Does the ADR add hierarchy, stages, document types, leases, GitHub App, auto-merge, or prose scoring?** — No; list them as settled non-goals.
- [x] **Which ticket refs are updated?** — Exact five-ticket mapping in files/research; set `docs_todo:false` only after successful links.
- [x] **May `docs/contributing/doc-structure.md` be corrected manually?** — No. It is generated; use its generator only or leave/report it.
- [x] **What if ADR-0016 is taken before implementation?** — Allocate the next free ADR number, rename all planned references in the same work, and pass numbering check; never duplicate.
- [x] **Does DOC-011 change product code?** — No.

## Parked (explicitly deferred)

No questions are parked.
