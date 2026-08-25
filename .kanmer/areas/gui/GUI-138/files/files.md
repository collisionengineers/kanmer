# Files — GUI-138

| File | Change |
|---|---|
| `apps/gui/src/main/remoteAccess/manager.ts` | Serialize an allowlisted owned tunnel snapshot into the doctor child environment. |
| `apps/gui/src/main/remoteAccess/manager.test.ts` | Capture doctor spawn environment and prove the snapshot matches the running record. |

Context: `packages/mcp-server/src/doctor-cli.ts`, `packages/mcp-server/src/doctor/index.ts`, FRD-025. Out of scope: provider/DNS mutation, endpoint/secret changes, direct Cloudflare API calls.
