# Open questions — MCP-036

## Resolved

- Project resolution must precede listener binding.
- The fix belongs in MCP-025's HTTP host; no bearer/tunnel/GUI code is needed.
- A failed start rethrows the original error after cleanup; it does not synthesize a misleading HTTP response.

## Parked (explicitly deferred)

None.
