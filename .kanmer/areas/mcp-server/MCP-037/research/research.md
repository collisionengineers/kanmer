# MCP-037 research

## Finding

The independent review of MCP-036 (PR #108) reproduced a lifecycle leak. `KanmerHttpHost.start()` resolves `projectFingerprint()` before its rollback `try/catch`. When root/board resolution rejects, no listener is bound, but the constructor-created unref'd sweep interval remains live and is not destroyed.

## Evidence

The reviewer probed PR #108 and observed `httpServer.listening === false` while `sweepTimer._destroyed === false`. MCP-037 therefore blocks MCP-036. The defect is independent of HTTP auth or tunnel behavior.

## Scope

Move project resolution into the startup rollback boundary (or explicitly roll back before rethrow), and add a regression proving failed startup leaves no timer/listener and repeated close remains safe. Preserve the pre-bind ordering fix from MCP-036.

## Non-goals

No bearer authentication, tunnel adapter, API shape, or unrelated HTTP lifecycle changes.
