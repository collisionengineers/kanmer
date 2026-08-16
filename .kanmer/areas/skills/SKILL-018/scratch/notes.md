## Antigravity Guidance from agy-customizations (Skills Spec)

### YAML Frontmatter Parsing in Antigravity
- **Failure Analysis**: Antigravity (`agy` CLI & Language Server) parses `SKILL.md` frontmatter using strict Go YAML parsing. In plain YAML scalars, an unquoted colon followed by space (`": "`) is treated as a mapping separator, causing `mapping values are not allowed in this context` errors and skipping the skill.
- **Specification Requirements**:
  - `name`: Must be lowercase and hyphenated (e.g. `kanmer-report`).
  - `description`: The agent matches user prompts against this description. For descriptions containing colons, quotes, or multi-line text, use the YAML folded block scalar `>-` or wrap in double quotes `"..."`.
- **Recommended Fix Pattern for `kanmer-report/SKILL.md`**:
```yaml
---
name: kanmer-report
description: >-
  Report a Kanmer board state or history — a standup (in-flight / taken / blocked) or a retro.
---
```
- **Verification Rail**: Add a frontmatter lint check to `npm run plugin:check` / CI that strictly parses all `plugins/kanmer/skills/*/SKILL.md` files to prevent regressions across all supported agents.
