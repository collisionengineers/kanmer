// This binary is intentionally a safe placeholder rather than a listener
// which accepts a port but rejects every request. MCP-026 owns the bearer
// resolver/injection contract; until it exists, starting an HTTP process would
// advertise an endpoint that cannot authenticate a real client.
process.stderr.write(
  "kanmer-mcp-http fatal: no production HTTP authorizer is configured; install the MCP-026 bearer authorizer integration.\n",
);
process.exit(1);
