# Research — DOC-013 provider-neutral remote-access manual

## Documentation objective

The manual must let an operator configure and verify one secure remote Kanmer endpoint without understanding the internal transport implementation. It must also let support/reviewers trace every instruction to the accepted FRD/ADR and to actual GUI/CLI/doctor behavior.

The common manual must distinguish concepts from the first provider implementation:

- **Kanmer remote host** — the local one-project Streamable HTTP MCP server.
- **Application bearer token** — Kanmer authentication credential required on every MCP request.
- **Tunnel adapter/provider** — publishes the already authenticated loopback host.
- **Provider credential** — authorizes the local tunnel agent to the provider; it is not the Kanmer bearer.
- **Public endpoint** — configured HTTPS hostname.
- **Connector doctor** — read-only layered verification.

Cloudflare-specific account/tunnel/DNS/credential steps belong in a named provider appendix. The main flow refers to “selected tunnel provider” and remains usable when another adapter is added.

## Audience and paths

Support two documented operating paths:

1. **GUI-managed** — recommended for desktop users. OS-backed bearer persistence, per-project controls, start/stop/status/doctor/rotation, and application-lifecycle ownership.
2. **Headless** — explicit CLI/process path for systems that must run without the GUI. Uses protected token/config files or approved inherited secret channels and operator-owned process supervision.

Do not imply that GUI-owned tunnels survive a true application quit. Do not imply that headless and GUI may own the same project/tunnel concurrently.

## Required manual structure

### 1. Overview and security boundary

- What remote access provides and what it does not.
- One project/fingerprint per endpoint/process.
- Existing stdio remains separate.
- Bearer possession grants the approved remote board-tool authority; background dispatch is excluded.
- Public TLS is provided by the tunnel, but Kanmer bearer auth is still mandatory.
- No OAuth/per-user identity in v1.

### 2. Before you begin

A checkable prerequisites table:

- supported Kanmer/Electron/MCP server release;
- healthy project/board and expected fingerprint;
- accepted operating platform;
- selected provider adapter/executable version;
- operator-provisioned named tunnel and HTTPS hostname;
- protected provider credential reference;
- secure bearer storage path/backend;
- ability to update the remote MCP client with endpoint and bearer;
- no duplicate GUI/headless owner.

Every prerequisite links to the exact doctor config check that validates it.

### 3. Concepts and architecture diagram

Use a small provider-neutral diagram:

```text
Remote MCP client
  → HTTPS tunnel provider
  → cloudflared/adapter process
  → loopback authenticated Kanmer HTTP host
  → one Kanmer project/tool registry
```

Explain connected versus publicly verified and local/tunnel/public status dimensions.

### 4. GUI quick start

Numbered, exact UI labels matching GUI-095:

1. Open Remote Access and choose the registered project.
2. Configure provider/executable/named tunnel/public hostname/provider credential reference.
3. Generate and securely deliver the Kanmer bearer once.
4. Save/review full project fingerprint and endpoint.
5. Start; observe local then tunnel readiness.
6. Run public doctor.
7. Configure the remote MCP client.
8. Confirm expected project and approved tool surface.

Include exact confirmation/rotation/app-quit behavior and no screenshots unless the repository has a maintained screenshot process. Text/UI labels are less likely to become stale.

### 5. Headless quick start

Use only commands/scripts that exist after MCP-021/025/026/027 implementation. The documentation ticket must execute every command in a disposable environment before publishing it. Cover:

- safe token-file creation without overwrite;
- protected remote config/provider reference;
- starting the one-project remote host;
- machine-readable readiness/status;
- config/local/public doctor commands;
- process stop/shutdown and cleanup;
- log/status redaction;
- service supervision as operator-owned and outside Kanmer v1, if applicable.

Never document a raw token command-line argument or plaintext settings value.

### 6. Configure a remote MCP client

Provide a generic contract and clearly labelled examples only for clients whose current format is verified during implementation:

- endpoint is the exact HTTPS `/mcp` URL or the client-expected base URL according to MCP SDK/client semantics;
- standard `Authorization: Bearer <token>` header;
- ordinary MCP initialization;
- expected Kanmer project fingerprint checked after connection.

Do not publish unsupported provider-specific configuration guesses. If client formats vary, link to maintained client sections and state the tested version/date.

### 7. Operate and maintain

- start/stop and true application quit;
- auto-start behavior for multiple projects;
- connected versus verified/stale verification;
- run doctor after configuration, restart, hostname/tunnel/token/project changes;
- rotate bearer and update every client; old sessions disconnect immediately;
- lost token recovery by rotation, not plaintext retrieval;
- move/reconcile project only with matching full fingerprint;
- remove/revoke config without deleting provider credentials silently;
- update cloudflared executable through operator/provider process because Kanmer v1 does not auto-update it.

### 8. Troubleshooting by doctor check

Create a complete table for every MCP-027 check id:

- check id and layer;
- pass requirement;
- likely causes;
- exact safe repair steps;
- which logs/status to inspect;
- when to rerun config/local/public mode;
- when not to retry (wrong project, insecure storage, deterministic config, provider credential failure).

Do not tell users to disable TLS verification, put tokens in URLs, widen listener bind, use Quick Tunnels as production, or copy raw logs containing secrets.

### 9. Cloudflared provider appendix

Keep provider-specific steps isolated:

- install/locate a supported cloudflared executable through official provider distribution;
- create/provision a named tunnel and stable hostname outside Kanmer;
- obtain/protect the supported credentials reference;
- configure project fields in GUI/headless config;
- no Quick Tunnel production path;
- no Kanmer account/DNS automation;
- version/readiness/config/credential doctor errors;
- safe update/replacement and rollback.

Use official Cloudflare documentation titles and verify current commands/flags/version behavior at implementation. Do not embed account tokens or a real hostname.

### 10. Security and limitations

Explicitly list:

- bearer is a possession credential with no per-user attribution;
- one token active per project endpoint in v1;
- OS secure storage/platform limitations and blocked plaintext fallback;
- provider and local host trust boundaries;
- no remote background dispatch, OAuth, multi-board router, browser API, managed relay, persistent sessions, Quick Tunnel production, or executable auto-download;
- expected-project and Kanmer stages/doc/review/proof gates remain relevant;
- diagnostics are redacted but users must still avoid publishing raw third-party logs/credentials.

## Command and UI accuracy

Documentation must be written after consuming actual accepted implementations, not from ticket-proposed filenames alone. For every command/UI label:

- derive it from package scripts/help/preload/renderer source or built output;
- execute/click it in a disposable setup;
- capture version/platform/date in a verification matrix;
- avoid commands that require a source checkout if the user path is an installed app/packaged CLI;
- distinguish required from optional flags;
- show placeholders with a consistent syntax and never use realistic secret values.

## Secret-safe examples

Use obviously synthetic placeholders such as:

- `<PROJECT_FINGERPRINT>`
- `<PUBLIC_HOSTNAME>`
- `<TOKEN_FILE>`
- `<CLOUDFLARED_PATH>`
- `<TUNNEL_ID>`
- `<CREDENTIALS_FILE>`
- `<KANMER_BEARER_TOKEN>` only in a warning-labelled client configuration slot.

Never include an actual generated token, account id, credential JSON, local user path, public hostname, session id, or project board contents. Add a secret-pattern/canary scan to docs verification.

## Validation strategy

- trace every FRD requirement and doctor check to a manual section;
- execute all shell/PowerShell commands on supported platforms with disposable project/config/secrets;
- walkthrough GUI path with fake provider/local integration and current labels;
- run Markdown/link/anchor/code-fence/terminology/secret validators;
- verify provider-neutral main sections do not embed cloudflared flags except cross-links;
- peer review by a user unfamiliar with the architecture using only the manual;
- use MCP-028's final public report as evidence, not as a secret-bearing screenshot/log dump.

## Non-goals

- No implementation changes, provider account automation, screenshot-heavy tutorial, OAuth design, system-service instructions presented as Kanmer-owned, or unsupported client/provider recipes.
