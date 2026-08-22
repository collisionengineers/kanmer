# CORE-038 open questions

All implementation choices are resolved by the ticket and repository constraints:

- [x] Use a built-in Node launcher rather than add a glob dependency; the scripts rail is explicitly dependency-free and supports Node >=20.
- [x] Enumerate only direct scripts/*.test.mjs files in deterministic filename order; nested helper files are outside the suite.
- [x] Preserve the child Node test runner's exit status, errors, and signals; a launcher failure must remain a failure.

No operator-only decision remains.
