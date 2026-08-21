# Independent review — GUI-105

## Changes

The PR exposes the existing core/MCP documentPaths inventory through an accessible per-type selector. It groups known pipeline paths without adding a renderer filesystem scan, keeps the conventional index fallback, and preserves exact nested/custom paths across load, save, preview, checklist/conflict handling, and dirty-switch confirmation. Scratch, references, and assets remain outside the pipeline selector.

## Comments and dispositions

- No blocking findings. The implementation is scoped to GUI-105 and has no unrelated changes.
- Manual visual proof is unavailable in this headless review; this limitation is explicitly retained and is not claimed as PASS.

## Verdict

PASS. Focused Editor suite 15/15, full GUI suite 37 files/348 tests, workspace typecheck, and git diff --check all passed. Commit d64000dd1d84138a54ff952ed1c80f18d23c8055 was reviewed against main.
