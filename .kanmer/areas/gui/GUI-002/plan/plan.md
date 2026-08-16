# Plan

Parse → mutate → serialise, like the JSON merges. Comments are lost by a
value-level round-trip; that is accepted, and it is why the *unmerge* is
surgical about touching only `mcp_servers.kanmer` rather than rewriting intent.

An unparseable file is not ours to repair. On merge, start clean rather than
half-writing something we could not read; on **unmerge**, return the input
untouched — deleting from a file we cannot parse is how a config gets destroyed.

Legacy cleanup runs *after* the merge succeeds, best-effort. The registration is
already correct at that point, so a stale or missing codex binary must not fail
the connect.

Trust: read the global config, match the project path case-insensitively with
separators normalised (real keys are lowercased and quoted inconsistently).
Report a trusted ancestor as `maybe-via-ancestor` — whether codex matches the
nearest ancestor is undocumented, and an exact-match-only check would wrongly
call trusted folders untrusted, while claiming "trusted" on a guess would be
worse still.
