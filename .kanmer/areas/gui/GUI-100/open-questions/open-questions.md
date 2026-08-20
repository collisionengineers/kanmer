# Open questions — GUI-100

All implementation decisions are resolved by the adopted Portable Codex Connect contract.

- [x] **What exact registration is canonical?** — Project-scoped `.codex/config.toml` with `command = "cmd.exe"` and args `[/d, /s, /c, "\"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd\""]`; no env/cwd/root/repo/install/server path fields.
- [x] **Where is the canonical invocation defined?** — One pure immutable descriptor/helper in the provider layer, consumed by Connect and tests; do not duplicate the command string in several branches.
- [x] **Do Codex and Grok still share the TOML serializer?** — Yes. The serializer writes command/args and includes `env` only when non-empty. Provider-specific invocation selection, not a forked serializer, distinguishes them.
- [x] **When is launcher health checked?** — Before any Codex project-config read/write side effect, by executing the same fixed launcher with `--probe` from the project root.
- [x] **What happens when probe fails?** — Return `ok:false` with the exact/manual probe command and repair/reinstall guidance; write zero config bytes and never generate an absolute fallback.
- [x] **How are existing project absolute entries migrated?** — Reconnect merges the canonical `mcp_servers.kanmer` entry over the owned table while preserving unrelated TOML. No separate migration file or format is required.
- [x] **How are legacy global entries handled?** — Preserve the existing surgical/best-effort `codex mcp remove kanmer-<project>` and sweep logic. The new trusted rootless project entry counts as a valid replacement.
- [x] **How does disconnect behave?** — Pure `unmerge` removes only `mcp_servers.kanmer`, drops an empty parent table, preserves all unrelated content and retains existing legacy cleanup behavior.
- [x] **Does Codex trust behavior change?** — No. Connect continues to inspect global trust and append the existing contextual note when the project is not demonstrably trusted.
- [x] **Do other providers receive the shim invocation?** — No. Claude/OpenCode/Grok/Antigravity retain their exact existing invocation, config, install and dispatch contracts.
- [x] **Is `.codex/config.toml` made committable now?** — No. Keep it ignored until GUI-101/102 prove the same bytes on real packaged installations/machines and own the migration note.
- [x] **Does core staleness need production changes?** — Expected no. Add the exact portable TOML regression; rootless entries are already intentionally current/discovery-based.
- [x] **What governing docs are updated?** — FRD-012 exact behavior and ADR-0012 consumer note; consume GUI-099's launcher ADR when it lands and clear `docs_todo`/link it before implementation review.

## Parked (explicitly deferred)

- [ ] **Making consumer Codex config a tracked repository file** — safe to defer until GUI-101/102 provide real-host portability/update evidence. Reopen there.
- [ ] **Non-Windows portable launchers** — safe to defer because the approved launcher/install contract is Windows-only. Reopen when a supported non-Windows package exists.
