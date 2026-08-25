# Files — MCP-050

- `packages/mcp-server/src/remote-host.test.mjs`: create a disposable `.kanmer` root and bind it explicitly for remote-host tests that start the production HTTP host.
- `packages/mcp-server/src/doctor.test.mjs`: give the spawned packaged CLI test its own disposable board root.

Production code, global test configuration, release scripts, and assertions are out of scope.
