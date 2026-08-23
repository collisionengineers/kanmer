# Research — MCP-046

## Current behavior

The native Antigravity plugin package at plugins/kanmer/mcp_config.json launches cmd.exe with /d, /s, /c and an argument containing JSON-escaped embedded quotes around the installer-owned launcher path. On agy 1.1.19, a real bound session reports that the quoted string (including the escaped quote characters) is not recognized as a command, so initialize fails before Kanmer starts.

## Evidence

With the exact merged package and a temporary installer-owned launcher present, agy --add-dir <project> --print failed with the shipped descriptor. A disposable descriptor variant that removed only the embedded escaped quotes installed through agy plugin install and the same bound session invoked the real Kanmer get_status tool, returning KANMER_AGY_GET_STATUS_OK with exit 0. The variant changed no command, path, environment, skills, or board behavior.

## Scope and reuse

The fix belongs in the provider-neutral plugin descriptor and its existing plugin:check contract. GUI provider registration and the installer launcher are separate contracts and remain unchanged. Add a sync assertion for the exact Antigravity argv shape so a future regeneration cannot restore the incompatible quoting.

## Risks

The command must remain shell-safe for a path containing spaces and must retain the percent-variable form for per-machine expansion. The regression assertion must reject absolute paths, extra arguments, cwd/root flags, and embedded quote characters without changing the existing Claude/Grok descriptor.
