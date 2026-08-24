## Live two-profile verification — 2026-08-24

- Created/validated a second non-secret local profile with a distinct loopback health port; the existing profile retained its original port.
- Both profiles passed `tunnel-client doctor --explain` using environment references only, then ran concurrently with `ELECTRON_RUN_AS_NODE=1` inherited by their tunnel-client processes. Both local `/readyz` endpoints returned HTTP 200.
- The first profile’s packaged MCP `get_status` resolved the live Kanmer board (8 Verifying / 294 Done). The second resolved the isolated disposable verification board (1 Review / 7 Verifying / 294 Done). This demonstrates distinct roots and avoids a profile collision; the second board is test-only and has no production data.
- The signed-in ChatGPT workspace has developer mode enabled. Its developer-app form lists both OpenAI tunnel endpoints. No ChatGPT app was created or selected: the final Create action would establish a persistent write-capable connector and requires explicit operator confirmation. No runtime key or tunnel identifier was written to the repository, board documents, or this note.
- OpenAI’s current guide confirms that a developer-mode app is the remaining external integration: choose Tunnel, select the intended tunnel, then create and test while the client is running.

Disposition: local lifecycle and two-board boundary are PASS; ChatGPT app creation/tool-call proof remains PENDING explicit confirmation.
