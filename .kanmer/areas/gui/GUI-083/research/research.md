# Research — GUI-083: gitignore the Connect artifacts

## Question

Which paths does Connect actually write to a project checkout, and which of
those are currently untracked-and-unignored? What is the right call on
`.codex/config.toml`, which is arguably legitimate project config rather than
a pure install artifact?

## Findings

- `apps/gui/src/main/providers.ts` is the single source of truth for what
  Connect writes. Two relevant shapes:
  - `InstallSpec` with `kind: "copySkills"` carries a `skillsDir`. Two
    providers use it: `opencode` → `.agents/skills`, `grok` → `.grok/skills`.
    `antigravity` also uses `copySkills` with `skillsDir: ".agents/skills"` —
    same destination as opencode (R2 in FRD-012: "one project-scoped write to
    `.agents/skills/` therefore serves three hosts").
  - `RegisterSpec` with `kind: "configFile"` carries a `configPath`. Four
    providers use it: `codex` → `.codex/config.toml`, `opencode` →
    `opencode.json`, `grok` → `.mcp.json`, `antigravity` →
    `.agents/mcp_config.json`. `claude` uses `kind: "cli"` (`claude mcp add`),
    which writes no repo file directly.
- Measured in this checkout right now (`git status --porcelain
  --untracked-files=all .agents .codex .grok opencode.json`): `.agents/mcp_config.json`,
  the full `.agents/skills/` tree (12 skill folders + `.kanmer-skills-version`),
  and `.codex/config.toml` are untracked. `.grok/skills` and `opencode.json`
  don't exist on disk in this checkout (those providers weren't Connected this
  session) but are equally reachable via the same `copySkills`/`configFile`
  code paths.
- `git ls-files .agents .codex .grok` shows exactly one tracked file:
  `.agents/plugins/marketplace.json` — a real repo file (Claude/codex
  marketplace manifest), not a Connect-written artifact. `.gitignore` must not
  swallow it, so `.agents/` cannot be blanket-ignored.
- `.gitignore` (line 40) already ignores `.mcp.json` (grok's `configFile`
  destination), with a comment explaining why: it "hardcodes absolute paths to
  this machine's Kanmer install." That is the existing precedent for how this
  repo treats a Connect-written config file — machine-specific content means
  ignored, with the reason recorded in the comment. Nothing analogous exists
  yet for `.codex/config.toml`, `.agents/mcp_config.json`, `opencode.json`, or
  either `skills` tree.
- `codexTomlMerge` (providers.ts:220-249) and `mcpServersMerge`/`opencodeMerge`
  all write the same `Invocation` shape into their config file: `command`
  (absolute path to the local Electron binary), `args` (absolute path to the
  local MCP server script + `--root <projectRoot>`), and `env`. So
  `.codex/config.toml`, `opencode.json`, and `.agents/mcp_config.json` all
  carry the same class of machine-specific absolute paths that `.mcp.json`
  already does — none of them is portable between machines today.
- ADR-0007 (referenced by the `codexTomlMerge` comment and FRD-012 R1) is about
  *project-scoped* codex config being the architecturally correct place for
  the registration (vs. codex's global `~/.codex/config.toml`), not about
  whether the resulting file's absolute-path content is fit to commit. Those
  are separate questions the ticket asks me to keep separate.
- Session context (from the ticket body and the mission): a comparable mistake
  already happened in a sibling project this session — pegasus committed a
  `.mcp.json` hardcoding `C:\Users\Alex\...` on a `C:\Users\PC` machine, which
  was simply inert for anyone else. That is the concrete cost of committing a
  Connect-written config file as-is.
- `apps/gui/src/main/providers.test.ts` is the existing test file for
  `providers.ts` (vitest, run via `npm run test -w @kanmer/gui`). No test in
  the repo currently reads `.gitignore` (`grep -rn "readFileSync(\".gitignore\""`
  → no hits). The closest precedent for a "generated/derived artifact stays in
  sync with source" check is `scripts/verify-agents-block.mjs`, a standalone
  Node script (not vitest) checked in `package.json`'s
  `verify:agents-block`. That script's own last check (step 7) is the same
  shape of check this ticket wants — but it's a standalone `.mjs` runner
  because AGENTS.md verification needs to run outside a single workspace's
  vitest process. `providers.ts`'s consumers are all inside `apps/gui`, and
  `apps/gui`'s vitest already runs in CI via the root `npm test`, so adding
  the check to `providers.test.ts` runs it automatically with no new wiring.

## Implications

- The `.gitignore` rules must target exactly: `.agents/skills/`,
  `.agents/mcp_config.json`, `.grok/skills/` (net-new), plus `.codex/config.toml`
  and `opencode.json` pending the judgement call below — never a blanket
  `.agents/` or `.codex/` ignore, and `.mcp.json` stays as-is (already ignored).
- The judgement call: `.codex/config.toml` should be treated the same as
  `.mcp.json` — ignored, for the same documented reason (machine-specific
  absolute paths) — even though ADR-0007 says project-scoped codex config is
  *architecturally* the right place for the registration. Those are different
  axes: *where* the registration lives (ADR-0007, settled, not touched here)
  vs. *whether today's Invocation-shaped content is fit to commit* (it isn't,
  because `Invocation.command`/`args` are always this machine's absolute
  paths). `opencode.json` carries the identical problem and gets the identical
  treatment, for symmetry with `.mcp.json` and `.codex/config.toml` — the
  ticket only names `.agents/`, `.grok/`, `.codex/` explicitly, but the Method
  section's instruction to derive from *all* `configFile` destinations, not a
  guessed list, reaches `opencode.json` too. This decision must be written
  into FRD-012, not just the ignore rule, per the mission's explicit
  instruction.
- The regression check belongs in `apps/gui/src/main/providers.test.ts`: read
  `PROVIDERS`, filter `install.kind === "copySkills"`, collect the (deduped)
  `skillsDir`s, read the repo-root `.gitignore`, and assert each dir has a
  matching `<dir>/` line. This must be demonstrated failing first (temporarily
  add a fake `copySkills` destination with no ignore rule, see it fail, then
  remove the fake destination) before trusting it.

## Open questions

None outstanding — the one judgement call the ticket flags (`.codex/`) is
resolved above and will be recorded in FRD-012 with its reasoning.
