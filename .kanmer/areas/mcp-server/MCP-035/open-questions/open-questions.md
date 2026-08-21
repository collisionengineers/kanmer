# Open questions — MCP-035

- [x] Should validation be duplicated in the MCP handler? — No. Both single and batch forms already delegate to the shared core reader; validating once in core keeps one safety contract.
- [x] Should legacy safe reads change their response shape? — No. Preserve the existing all-missing records for valid document paths.
- [x] Should getDoc/getDocWithVersion or migration behavior change? — No. The remediation is limited to getDocsWithVersions, which is the MCP-019 shared path.

## Parked (explicitly deferred)

None.
