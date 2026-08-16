# Proof

Branch `v3-phase-minus-1-prework` at `41f9ee6`.

**Against the real global config** (46 `[projects.…]`, 3 existing servers, mixed
quote styles, lowercased Windows paths):

    projects   : 46 -> 46 OK
    mcp_servers: openaiDeveloperDocs,node_repl,kanmer-pegasus -> …,kanmer
    top-level  : preserved
    kanmer set : OK   (ELECTRON_RUN_AS_NODE present)
    idempotent : OK
    unmerge    : restores the original value exactly
    trust kept : trusted

**Unit tests** (14 new): the table is written with command/args/env; unknown
tables, unknown keys and other servers survive; re-merge is byte-identical;
unmerge removes only kanmer and drops an emptied `mcp_servers`; an unparseable
file comes back unchanged; the legacy remove command is retained.

**Trust detection**: exact match across both quote styles and separator forms;
a trusted parent reports `maybe-via-ancestor`, never `trusted`; unlisted and
explicitly-untrusted both report `untrusted`; a missing or unparseable config
reports `unknown` rather than guessing.

**Packaging**: the built `out/main/index.js` contains smol-toml inline with
**zero** external requires, so the packaged app will not need it at runtime.

Full rail: 116 core / 112 GUI, typecheck, GUI build, boot smoke exit 0.

**Not proven here:** a live `codex` session picking the registration up. That
needs the packaged app and a codex run, which is release-time verification.
