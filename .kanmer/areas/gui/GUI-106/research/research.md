# GUI-106 research

## Question

What is the smallest update-safe delivery boundary that keeps the registered Kanmer MCP launcher usable while an installed app is replaced, without changing provider registration semantics or board discovery?

## Findings

1. The residual lock is the Electron runtime, not the MCP bundle. apps/gui/src/main/connect.ts currently launches packaged MCP as process.execPath (Kanmer.exe) with ELECTRON_RUN_AS_NODE=1; the bundle is an argument under $INSTDIR/resources. The GUI-064 updater proof and archived MCP-005 research identify $INSTDIR-relative icudtl.dat and v8_context_snapshot.bin as the files that make NSIS rename fail. Moving only kanmer-mcp.cjs cannot solve this.

2. The existing stable provider boundary is reusable. GUI-099 owns %LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd and HKCU\Software\Kanmer\InstallDir; GUI-100 serializes Codex to that fixed launcher and preserves inherited cwd/std streams. Runtime relocation can change the launcher's target while leaving provider config bytes, trust, and discovery order unchanged. ADR-0012 requires the provider workspace cwd to reach the child.

3. A copied Electron runtime is sufficient and preserves the no-Node contract. MCP-005 research measured that Kanmer.exe plus icudtl.dat and v8_context_snapshot.bin runs with ELECTRON_RUN_AS_NODE=1; the copied PE can be named kanmer-mcp.exe. The standalone kanmer-mcp.cjs must accompany it. This is a real byte copy outside $INSTDIR, not a hardlink.

4. A stable path is required. A versioned runtime path in provider config would require migration on every release. Archived research recommends %LOCALAPPDATA%\Kanmer\mcp\<version>\ plus a stable current directory junction, retargeted after the versioned payload is complete. The fixed GUI-099 shim should resolve the stable external runtime; existing provider registrations then remain valid.

5. Install-time ownership is the safe provisioning boundary. installer.nsh already validates the install-root shim/MCP payload, updates the fixed shim atomically, and writes HKCU only after validation. Extending this hook to copy the three runtime files and bundle into a versioned external directory, then atomically retarget current, keeps a fresh install's --probe useful without waiting for app startup. The old install-root MCP payload must continue shipping for legacy absolute registrations until the later integration contract retires them.

6. Current stop/warning behavior becomes a legacy safety net. mcp-sessions.ts queries MCP command lines but parseSessions filters executable paths under the current $INSTDIR; external-runtime sessions therefore stop appearing in update warnings/kill rounds, while old absolute registrations remain visible and protected. The updater gate in updater.ts can stay unchanged. Comments/tests need to distinguish migrated external sessions from legacy install-root sessions.

7. Real lifecycle proof is unavailable here. Deterministic launcher/package checks and GUI tests exist, but no safe installed Kanmer feed/user profile is available for a genuine update, active external session, registry census, junction behavior, or AV/SmartScreen result. Those claims must remain INCONCLUSIVE until GUI-101/102-style packaged evidence is run.

8. Provider migration is bounded out. This ticket must not rewrite arbitrary provider files or touch MCP-015/GUI-100 serialization. The fixed launcher path is the preservation mechanism; legacy registrations remain supported by the old install payload and existing stop guard. Full reconnect/update/uninstall lifecycle proof remains an integration disposition, not silent source migration.

## Implications

Implementation is limited to the external runtime payload, stable launcher target, installer ownership/cleanup, package/static rails, and truthful updater/session comments/tests. It must not add dependencies, change MCP server code, alter board discovery, or rewrite provider configurations.
