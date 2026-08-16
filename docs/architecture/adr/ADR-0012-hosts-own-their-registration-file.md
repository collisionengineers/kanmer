---
status: draft
---

# ADR-0012 — A host is registered in a file that host alone owns

## Context

Connect registers Kanmer's MCP server with five agent hosts. Two of them landed on the same file: grok's provider merged `mcpServers.kanmer` into the project `.mcp.json`, which is exactly what `claude mcp add kanmer -s project` writes — same file, same key. The consequences were symmetric and both live:

- **Disconnecting grok unregistered Claude.** `mcpServersUnmerge` deletes the `kanmer` key unconditionally, and it could not tell whose entry it was deleting.
- **A Claude-only project reported grok as connected.** `isRegistered` read the same key to answer "is grok registered here?", so `hasRegisteredCopySkillsPeer` kept the shared AGENTS.md block alive for a host that had never been connected.

Three rules were considered and two were rejected as heuristics that have to keep being right. A **marker** (stamp what Kanmer writes, unmerge only stamped entries) is correct going forward but turns grok's disconnect into a no-op for every already-registered user — the defect inverted for one release. A **shape fingerprint** (Claude writes `"type": "stdio"`, grok's merge does not) needs no migration but is an inference about another tool's output format, and it breaks silently the day either tool changes what it writes.

## Decision

**Kanmer registers a host only in a file that host alone owns, and unregisters only from files it owns.** Ownership is structural, not inferred: there is no rule to get right at runtime because there is no shared file.

grok moves from `.mcp.json` to **`<root>/.grok/config.toml`**, `[mcp_servers.kanmer]`. Established against the installed binary per ADR-0009's method clause (2026-08-16), with the commands recorded: `grok mcp add --help` documents `-s, --scope` as `user (~/.grok/config.toml) or project (./.grok/config.toml)`, and grok's shipped `docs/user-guide/07-mcp-servers.md` gives the MCP source merge order as `config.toml` > Claude > Cursor > `.mcp.json`, with `.mcp.json` "loaded unless you have imported or dismissed the Claude import prompt". So `.grok/config.toml` is grok's *native project scope and highest-priority source*, while `.mcp.json` was a conditional, lowest-priority compat source. The move is a reliability improvement as well as a de-collision. `.mcp.json` is left to Claude; **no Kanmer provider merges or unmerges it.**

The read moves with the write. "Does this file register Kanmer with this host?" becomes a third pure function on the provider registry (`register.registrationState`) beside `merge`/`unmerge`, answered by the provider that owns the file. It is tri-state — `registered` / `absent` / `indeterminate` — because "I cannot read this file" is not "no", and the two callers want opposite defaults for it: disconnect keeps the shared AGENTS.md block, and the legacy codex sweep treats it as no proven replacement and refuses to drain.

**Existing grok users reconnect once.** Kanmer does not auto-migrate them by rewriting `.mcp.json`, because reaching into a file another host owns is the defect, not the fix. Their old entry keeps working through grok's compat path meanwhile, so the failure mode is a stale duplicate, not a dead host.

## Alternatives considered

(a) Marker field — inverts the defect for existing users. (b) Shape fingerprint — an inference about another tool's output, silently wrong when it changes. (c) `grok mcp add --scope project` (a `kind: "cli"` provider) — surgical and comment-preserving, but a CLI provider has no config text to answer `registrationState` from, so grok would silently drop out of the AGENTS.md peer check: a cosmetic gain for a functional loss.

## Consequences

The collision cannot recur, and any host added later has to name a file it owns. One accepted cost: the TOML merge parses and re-serialises, so a hand-written `.grok/config.toml` loses its comments the first time Connect touches it — the same tradeoff ADR-0007 accepted for `.codex/config.toml`, on a file more likely to be human-authored and committed. Two hosts now share the same TOML merge/unmerge pair, which is a simplification, not a coupling: the `[mcp_servers.<name>]` shape is genuinely identical. And one release's worth of grok users see Kanmer's tools disappear until they click Connect — recorded in FRD-012's upgrade note and in the shipping ticket's outcome.

Related: FRD-012 R1/R1a/R4 · ADR-0007 · ADR-0009 (the method clause this decision's provider facts were established under).
