# Open questions — MCP-015

GUI-073 resolved the material uncertainty. The remaining work is implementation and executable validation.

- [x] **Does Antigravity read project skills/MCP?** — Yes, on `agy` 1.1.13, but only in a session explicitly bound to the folder.
- [x] **What binding should background dispatch use?** — `--add-dir <sourceRoot>` because it binds for one session and persists nothing. Do not use bare cwd, `--new-project` or a stored `--project` id.
- [x] **Is `agy -p` dispatchable?** — Yes; piped print mode was repeatedly measured successful. Final acceptance still requires a Kanmer tool call, not PONG.
- [x] **Does Connect establish binding for every future bare `agy` session?** — No supported persistent mechanism is owned by Kanmer. Connect installs the plugin and verifies it with a bound session; UI/manual instruct interactive CLI users to use `--add-dir` or their own bound project. The IDE is not claimed.
- [x] **What owns Antigravity installation?** — Its user-scoped native plugin lifecycle, reusing MCP-014’s plugin-managed provider shape.
- [x] **Does new Connect still write `.agents/mcp_config.json` or copy `.agents/skills`?** — No. Those become legacy cleanup inputs after functional plugin proof. Cleanup must preserve any content/paths still owned by another provider.
- [x] **Which MCP descriptor is shipped?** — Antigravity’s documented root `plugins/kanmer/mcp_config.json`, using only variable/runtime syntax proven by `agy plugin validate/install` and a real tool call. Never re-add `.mcp.json`.
- [x] **What runtime is assumed?** — Prefer the exact `node` + `${PLUGIN_ROOT}` form proven by Antigravity. Preflight Node; do not copy Claude-only variable assumptions or persist PATH/environment. If real evidence proves another portable form, pin that form and update docs/tests before implementation.
- [x] **How is plugin functionality proven?** — Validate/install/inspect plus a fresh `agy --add-dir <clean-project> -p ...` session invoking `get_status`, with no competing project/global Kanmer registration.
- [x] **When is legacy project state removed?** — Only after the bound real tool call succeeds. Failure leaves the old working config/skills intact.
- [x] **How does Disconnect behave?** — Warn/confirm global user scope, uninstall through `agy`, verify absence and clean only owned residual legacy state. It does not delete shared `.agents` data still used by another provider.
- [x] **When is `dispatch:true` set?** — In the same change that adds exact bound args and passes real task/tool proof; never as a standalone flag flip.
- [x] **Where are dispatch args owned?** — MCP-020’s shared dispatch-provider SSOT if landed; otherwise introduce the shared location required by that approved plan and make GUI consume it. Do not duplicate bare/bound variants.
- [x] **What happens to the no-dispatch badge?** — It disappears from the provider-derived flag. Connect copy gains plugin scope/binding instructions without hardcoded contradictory capability tiers.
- [x] **Does this claim Antigravity IDE support?** — No. Evidence is for `agy` CLI 1.1.13 on Windows; the manual states that boundary.
- [x] **What if plugin validate/install processes zero MCP after MCP-016?** — Add/repair only documented `mcp_config.json`, rerun positive controls and tool call; do not restore deleted `.mcp.json`.

## Parked (explicitly deferred)

- [ ] Persistent creation/management of Antigravity project ids — unnecessary for `--add-dir`; reopen only if host startup UX demonstrates repeated demand.
- [ ] Automatic Node/PATH/environment installation — global ownership risk; separate measured ticket if users cannot satisfy runtime prerequisite.
- [ ] IDE automation/verification — requires a real GUI-driving environment and a separate claim.
- [ ] Non-Windows/version-wide support — add only after measured provider-version matrix.
