# Open questions — GUI-095

## Resolved decisions

- **Project scope?** Remote access is configured independently for every registered project fingerprint; one endpoint/process never hot-switches projects.
- **Can multiple projects run concurrently?** Yes, one runtime generation per project with bounded global auto-start concurrency (initially two) and failure isolation.
- **Where does runtime ownership live?** Electron main process. Renderer reload/window lifecycle cannot spawn, own, or kill children.
- **What happens when the application truly quits?** Stop every GUI-owned tunnel and HTTP host with bounded graceful/forced cleanup. A separate headless CLI is required for operation without the GUI.
- **How is an existing headless owner handled?** Detect and refuse duplicate ownership; show its state/repair path where possible. Do not kill or force takeover.
- **Where is the Kanmer bearer stored?** Electron official `safeStorage` encrypted record under app data, keyed by opaque secret id, only when encryption is available and the selected backend is not an unsafe plaintext fallback.
- **What if secure storage is unavailable/unsafe?** Block persistent and auto-start GUI remote access. Do not silently use plaintext settings; direct the user to the approved protected headless/manual flow.
- **Where are cloudflared credentials stored?** Keep the operator/provider protected credentials file external; persist only its reference and safe metadata.
- **Does the renderer normally receive the raw bearer?** No. Only an explicit short-lived one-time generation/rotation delivery response/modal may contain it.
- **Can a token be revealed later from routine settings?** No. Ordinary UI shows only fingerprint/timestamps. A future explicit credential-store reveal is not included; rotate when the token is lost.
- **Clipboard behavior?** Copy only from the one-time modal; attempt clear after 60 seconds only if clipboard still exactly equals the token, so a user's newer clipboard value is untouched.
- **How is token delivery made to the child?** Main derives/passes the verifier through protected local IPC/anonymous pipe or the MCP-026-approved non-authenticating verifier mechanism. Raw token never enters argv; doctor runs trusted/in-process or through a protected channel.
- **How are provider/process operations implemented?** Call the canonical MCP-021 remote-host adapter/library/CLI; do not spawn or parse cloudflared separately in GUI.
- **How is health displayed?** Three dimensions: local MCP, tunnel/provider, and public doctor verification. Connected is not the same as verified.
- **Does start automatically run public doctor?** After provider-connected, run or strongly prompt the public doctor according to accepted UX; only a successful doctor may set `verified`.
- **What does auto-start persist?** Desired enabled/auto-start configuration only. On app launch, revalidate project/config/secrets and start in deterministic order; never trust persisted runtime status/PID.
- **Can two projects reuse the same hostname/tunnel id/secret record?** No. Validate uniqueness before save/start.
- **What if a project path moves?** Allow explicit reconciliation only when the full fingerprint matches. A different fingerprint is a different project and cannot inherit silently.
- **What concurrency protects actions?** Per-project serialized operation queue/mutex plus generation/version checks; global bounded auto-start semaphore.
- **How are stale events handled?** Ignore any event whose project/config/runtime generation does not match the current record.
- **Does the GUI create Cloudflare resources or download cloudflared?** No.
- **Does this change MCP tool surface/plugin?** No.

## Deferred explicitly

- `[deferred]` Always-on OS service, tray redesign, headless ownership handoff/reattach protocol.
- `[deferred]` Additional tunnel-provider UI and provider account APIs.
- `[deferred]` OAuth/per-user credentials/multiple active bearer tokens.
- `[deferred]` Secret recovery/history/sync.
- `[deferred]` Automatic cloudflared download/update/signature management.

No unresolved implementation questions remain.

## Resolved roadmap amendment — 2026-08-21

- **Which GUI provider belongs here?** Cloudflare named Tunnel only.
- **What happens to OpenAI tunnel-client profiles?** They are independently tracked by [[GUI-104]].
- **Does GUI configure Access, DNS or Cloudflare accounts?** No.
