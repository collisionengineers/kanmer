# Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/providers.ts` | opencode and antigravity `install` become `copySkills` scope `project`, dir `.agents/skills`. |
| `apps/gui/src/main/providers.test.ts` | Assert both share the tree and that Grok does not. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `connect.ts` `installSkills` | The copy + `.kanmer-skills-version` stamp; unchanged, which is why this item is two strings and its tests. |
| `connect.ts` `removeBundledSkillsOnly` | Disconnect removes only the folders Kanmer owns, so a user's own skills in the same tree survive — newly important now that the tree is shared. |
