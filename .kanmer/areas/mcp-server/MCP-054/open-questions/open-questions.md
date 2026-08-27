# Open questions — MCP-054

None blocking. Decisions taken from FRD-029 / HZN-008 context and the auto-run brief, recorded so the plan does not silently assume them.

- Registry location: `KANMER_ENDPOINT_REGISTRY` (absolute path, set by the spawning operator/GUI) else `~/.kanmer/endpoints.json`, mirroring `KANMER_DISPATCH_LOG_DIR`/`~/.kanmer/dispatch`. Never a tool argument (FRD-029 AC5).
- Read surface is one new read-only tool `list_projects` (roster 38 → 39) rather than a `get_status` sub-block: `get_status` is "this board"; the FRD's registry is a distinct observational surface and GUI-144 needs it addressable. Exposed on stdio and remote HTTP (read-only, not dispatch).
- Scope fits one PR: registry module + tool + readiness `project_id` + tests/smoke/docs. GUI-side registry writing is left to GUI-144 (which already `blocks` on this ticket); this PR exports the writer helper so GUI-144 does not redefine the file shape.
- `policy` in a registry entry is an operator-declared free-form string echoed back (CORE-116 will define delivery policy); the registry does not validate it beyond type.

## Parked (explicitly deferred)

- [ ] Should `list_projects` also report per-endpoint HTTP/remote liveness (listening port, tunnel state)? That state lives in GUI-owned managers (`remoteAccess/manager.ts`), not on disk; deferred to GUI-144 or a later MCP ticket.
- [ ] Should the registry file be moved into the GUI's `settings.json` envelope instead of a standalone file? Standalone keeps it operator-editable without the GUI and readable by a headless server; revisit if GUI-144 finds double bookkeeping.
