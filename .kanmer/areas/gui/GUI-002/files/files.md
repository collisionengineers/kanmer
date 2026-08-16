# Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/providers.ts` | codex `register` becomes `configFile` at `.codex/config.toml`; `codexTomlMerge`/`codexTomlUnmerge`; `removeCommands` added to the `configFile` variant; `codexTrustFromConfig`/`codexTrustNote`. |
| `apps/gui/src/main/connect.ts` | Run `removeCommands` for configFile providers on connect and disconnect; append the trust note for codex. |
| `apps/gui/package.json` | `smol-toml` as a **devDependency**. |
| `apps/gui/src/main/providers.test.ts` | 14 new tests. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `providers.ts` `opencodeMerge`/`mcpServersMerge` | The existing pure merge/unmerge shape the TOML pair must match, so the same test style applies. |
| `connect.ts` `serverInvocation` | The exact command/args/env trio the table must carry — `env` is not optional, since the command is the Electron binary. |
| `AGENTS.md` §8 gotcha 5 | Why the dependency must be a devDependency and must not be externalised. |
| `~/.codex/config.toml` | The real-world fixture: 46 project entries, mixed quoting, lowercased paths, live servers. |
