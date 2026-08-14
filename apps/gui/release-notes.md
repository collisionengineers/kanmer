# Release notes

The **top section names the version being released**. `scripts/release.mjs`
refuses to publish unless this file mentions that version, which is the guard
against shipping the previous release's notes. electron-builder reads this file
from the app directory (`projectDir` is `apps/gui` when the packer is invoked
there) and uses it as the GitHub release body.

## 0.2.0

First published release. `0.1.0` was built and packaged but never actually
published to GitHub Releases — this is the first version any installed client
can see. Includes the Kanban board, the MCP server shipped inside the app for
agent integration (codex, Claude, any MCP client), and the self-updater
(GitHub Releases feed, update banner, restart gated on unsaved work and live
agent sessions).

## 0.1.0

First packaged release: the Kanban board, the MCP server shipped inside the app,
and the auto-updater.
