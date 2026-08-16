# 1.3 The publish block

**File:** `apps/gui/electron-builder.yml`

Append (order in the file: after `extraResources`, before `win:`):

```yaml
# Auto-update feed. owner/repo are explicit because neither package.json has a
# `repository` field, so electron-builder's auto-detection has nothing to read.
# releaseType MUST NOT be the default `draft`: GitHubProvider reads
# releases.atom and /releases/latest, and neither lists drafts — a draft release
# is invisible to every installed client, silently.
publish:
  - provider: github
    owner: collisionengineers
    repo: kanmer
    releaseType: release
```

**No `files:` change.** Do not add `node_modules/electron-updater/**/*` — it is cargo-culting and the debug output already proves it.
