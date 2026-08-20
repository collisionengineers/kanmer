# Open questions — GUI-075

All product and architecture choices are resolved. Exact CLI model flags remain implementation-time measurements and may leave a provider on CLI default if unsupported.

- [x] **What axis controls models?** — Machine-local provider default plus optional provider×task overrides. Resolution: task override → provider default → no flag/CLI default.
- [x] **Are there per-project or per-ticket overrides?** — No in v1. Model/login availability is machine-specific; project policy would require a separate governed design.
- [x] **What prompt customization is allowed?** — One machine-local append-only suffix per provider. It cannot replace/interpolate the built-in task prompt.
- [x] **Are prompt suffixes task-specific?** — No. Task specificity already lives in core prompts; per-task text would recreate a grid and another prompt authority. Model overrides provide the task-level cost/quality control.
- [x] **How is the prompt combined?** — Built-in prompt unchanged, then a fixed delimiter and trimmed suffix. Empty suffix returns exactly the original string.
- [x] **Can instructions override safety/deliverable/stop conditions?** — No. UI/delimiter explicitly state those built-in clauses remain authoritative; Kanmer does not attempt LLM semantic policing.
- [x] **Where are settings stored?** — Electron `userData/settings.json` in a sanitized `dispatch.providers` section. They never enter `.kanmer`, source control or ticket documents automatically.
- [x] **How are secrets handled?** — UI warns that settings are plaintext and must contain no secrets. No credential field, environment injection or redaction scheme is added.
- [x] **How are model names validated?** — Opaque trimmed identifiers with syntax/length/control-character validation. Do not hardcode a model catalogue or make network calls.
- [x] **How is provider support decided?** — Optional model-option builder in shared dispatch-provider SSOT, backed by exact supported CLI help/positive-control evidence and tests.
- [x] **What if a provider has no verified flag?** — It remains dispatchable on CLI default; UI shows read-only “model override not verified” and no model input.
- [x] **What if configured model is rejected by the CLI?** — Show failed dispatch with selected model and safe stderr/exit. Do not retry without the model.
- [x] **What happens on upgrade with no settings?** — Byte-identical current prompt/argv: no model flag and no suffix.
- [x] **What providers appear?** — Only current shared-registry providers with `dispatch:true`. Antigravity appears only after MCP-015’s bound dispatch is landed; model field only after separate flag verification.
- [x] **Does MCP-020 remote dispatch use these settings?** — No automatic coupling. Electron GUI settings configure GUI launches; MCP server has its own explicit operator policy/config. Shared provider arg capability is reused.
- [x] **What metadata is visible?** — Effective model or `cli-default` and `promptCustomized` boolean in local status/report; never full suffix/prompt in ticket scratch or remote output.
- [x] **How are stale provider/task keys handled?** — Tolerant read ignores them for effective behavior and clean write omits them; settings load never crashes.
- [x] **What are limits?** — Model max 200 single-line non-control chars; suffix max 4,000 chars with internal newlines, no NUL. Exact constants shared between validation/UI/tests.

## Parked (explicitly deferred)

- [ ] Project/team prompt policy in repository documents — separate governance/security design after real demand.
- [ ] Model discovery/drop-down/pricing/context-window metadata — provider APIs change and require network/auth; text id is sufficient.
- [ ] Per-ticket/ad-hoc override at dispatch time — increases accidental cost/scope and bypasses reviewable settings.
- [ ] Remote MCP model/prompt configuration — MCP-020 policy boundary owns future work.
