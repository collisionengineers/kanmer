# Research — MCP-036 startup ordering

## Finding

The MCP-025 review reproduced that `KanmerHttpHost.start()` calls `listen()` before `projectFingerprint()`. Root/board resolution can therefore fail after a TCP listener and sweep timer exist.

## Contract

FRD-025 RA-PROJECT-1/2 and ADR-0017 require one immutable project/root to be resolved and validated before binding. Failed startup must not leave a listener, timer, or socket.

## Evidence

PR #107's independent review reproduced a no-board temporary-cwd failure after bind and filed this blocking ticket. The fix must preserve ready metadata and successful listener behavior, and add a regression that proves failed start leaves no bound address/resource.
