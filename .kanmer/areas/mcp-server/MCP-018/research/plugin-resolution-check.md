# Research — MCP-018 packaged plugin module resolution

## Defect

A plugin verification command can pass for the wrong reason when it executes the MCP entry point from the repository worktree. Node then has access to the monorepo's source tree, workspace links, root `node_modules`, current working directory, and development environment. A dependency accidentally omitted from the bundle/package may resolve locally but fail after the plugin is installed elsewhere.

`plugin:check` must test the **shipped artifact as an isolated consumer sees it**, not merely run bytes located under the source checkout.

## Required isolation model

1. Build or compare the committed plugin artifact using the existing canonical build path.
2. Copy the exact installable plugin payload to a fresh OS-temporary directory outside the repository.
3. Resolve the MCP command/entry file from the plugin manifest or canonical packaging metadata, not a duplicated hard-coded source path.
4. Launch it with `cwd` set to an unrelated empty directory.
5. Remove/neutralize repository-specific resolution aids (`NODE_PATH`, workspace cwd, source-map/source imports, inherited development loader flags).
6. Exercise a minimal MCP initialization/list-tools handshake so top-level and lazy imports both resolve.
7. Fail if any loaded module path escapes the copied plugin payload, except Node built-ins and explicitly allowed runtime locations.
8. Clean the temporary installation on success and failure.

The check should prove both **artifact synchronization** and **runtime self-containment**. If the existing `plugin:check` already compares freshly built bytes against committed bytes, retain that comparison and add isolated execution; do not replace one with the other.

## What “module resolution” means

- The manifest-selected entry point exists in the copied package.
- Every runtime dependency needed during server startup and tool discovery is bundled or included in the payload.
- No import resolves to `packages/*/src`, monorepo `dist`, root `node_modules`, the current worktree, or a globally installed package.
- The process works with a path containing spaces and from a cwd unrelated to the plugin.
- CJS/ESM format and executable arguments match the actual provider registration.

Use a child process with an explicit environment and argument array. Do not invoke through a shell. Capture stdout/stderr and include the isolated plugin path in diagnostics.

## Resolution tracing

Prefer structural isolation over fragile log scraping. Because the copied bundle should be self-contained, launching outside the repo with a sanitized environment is the primary proof. If an escape check is required, instrument the child in a test-only way (for example a preload resolver hook compatible with the output format) and compare realpaths against the allowed plugin root. Do not modify shipped bundle behavior to expose test hooks.

## Determinism and portability

- Use `fs.mkdtemp` under OS temp.
- Copy only files included by the installable plugin contract.
- Normalize paths for Windows and POSIX.
- Avoid symlinked workspace dependencies in the isolated copy.
- Set a bounded startup/handshake timeout and terminate the child on failure.
- Test with spaces in the parent path.
- Never depend on an installed Kanmer app or developer-global provider configuration.

## Verification

A negative regression fixture should prove the check detects an external dependency. The safest form is a test-only miniature plugin/bundle that requires a module available only in the fixture repository, then assert isolated check failure. Do not deliberately corrupt the committed real plugin.

Run `plugin:build` from the normal main checkout as required by the repository, then `plugin:check`, root verification, and a real plugin discovery smoke.

## Non-goals

- No change to MCP protocol behavior.
- No plugin-format migration.
- No provider installation/connect changes.
- No global package installation.
- No weakening of byte-for-byte bundle synchronization.
