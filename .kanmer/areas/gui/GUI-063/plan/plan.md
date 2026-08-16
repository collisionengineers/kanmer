# 8.4 `README.md`

New `## Updates` section after "Install — the easy way":
- Kanmer checks GitHub Releases ~30 s after launch and every 6 hours, downloads in the background, and shows a banner when an update is ready.
- **Restart now** installs immediately; **Later** costs nothing — it installs the next time you quit.
- **An update closes any agent MCP session running from the installed app** (the installer stops every process in the install folder, and the MCP server is the app's own binary). Kanmer tells you how many are open before it restarts, and asks again if you quit with an update staged. Your board is safe — `.kanmer/` writes are atomic; it is the agent's connection that drops, and it reconnects against the new server.
- The installer is **unsigned**, so SmartScreen warns on a *manual* download — but not on an auto-update, which is spawned by an already-trusted process with no Mark-of-the-Web. The friction is paid once, on first install.
- **To go back one version:** re-run `%LOCALAPPDATA%\@kanmergui-updater\installer.exe` — the previously installed installer keeps a copy of itself there. There is no automatic rollback; the normal remedy for a bad release is a higher version.

New `### Release (maintainers)` block under "Verify end-to-end":
```bash
# edit apps/gui/release-notes.md first — the script refuses stale notes
GH_TOKEN=<pat with repo scope> npm run release 0.2.0
```
with a line naming what it does: verifies everything, bumps `apps/gui/package.json`, builds, checks the package, tags `v0.2.0`, publishes a **non-draft** GitHub release with the installer + blockmap + `latest.yml`, and re-fetches `/releases/latest` to prove clients can see it.

---
