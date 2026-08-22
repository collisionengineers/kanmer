# GUI-106 open questions

All implementation choices within this bounded runtime lane are resolved below; unresolved real-host evidence is explicitly parked.

- [x] Where is the stable runtime boundary? Use a real byte-copied Electron runtime under %LOCALAPPDATA%\Kanmer\mcp\<version> with a stable current boundary, as documented by archived MCP-005 research.
- [x] How are provider registrations preserved? Keep GUI-099's fixed launcher path and GUI-100's provider bytes unchanged; do not rewrite provider files or absorb MCP-015/GUI-101/GUI-102.
- [x] What remains for legacy absolute registrations? Keep the existing install-root executable/bundle and path-prefix stop guard as a bounded compatibility/safety net; do not silently claim all old registrations have migrated.
- [x] When is provisioning performed? Installer-owned provisioning after the complete package payload is present, before the fixed launcher registry target is activated.
- [x] Is a new package dependency allowed? No. Use existing Electron files, NSIS primitives, Node built-ins and current test rails.

## Parked (explicitly deferred)

- Real packaged update with a live active MCP session, registry/file/process census, and post-update tool call — unavailable safe installed host/feed; GUI-101/102 integration proof remains INCONCLUSIVE.
- Junction behavior on redirected/non-NTFS %LOCALAPPDATA%, concurrent installers, AV/SmartScreen, disk-full and interrupted-copy recovery — requires a disposable Windows environment.
- Automatic sweep/rewrite of every historical provider config and long-term removal of the legacy install-root payload — outside this bounded lane; preserve old behavior and surface as later integration work.
- Non-Windows runtime delivery, code signing/SmartScreen policy, remote transports/tunnels, and MCP-015 provider work — out of scope.
