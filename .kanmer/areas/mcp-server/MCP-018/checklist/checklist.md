# Checklist — MCP-018

## Artifact contract

- [ ] Read canonical build/check scripts and root script routing.
- [ ] Read actual plugin manifest/entry metadata.
- [ ] Identify exact installable payload.
- [ ] Preserve committed-vs-fresh file/byte comparison.
- [ ] Reuse/extract one pure payload metadata helper only if needed.
- [ ] Reject payload paths escaping plugin root.

## Isolated installation

- [ ] Create OS-temp parent containing a space.
- [ ] Copy only installable payload.
- [ ] Keep copied root outside repository.
- [ ] Use unrelated empty child cwd.
- [ ] Resolve entry from copied manifest.
- [ ] Assert entry remains inside copied plugin root.
- [ ] Do not copy root node_modules/source/.git/.kanmer/cache.

## Process environment and handshake

- [ ] Remove `NODE_PATH`.
- [ ] Remove development `NODE_OPTIONS`/loaders.
- [ ] Remove repository-specific resolution variables.
- [ ] Set noninteractive deterministic environment.
- [ ] Spawn with argument array, no shell.
- [ ] Reuse canonical MCP protocol client.
- [ ] Complete initialize sequence.
- [ ] Complete `tools/list`/canonical discovery assertion.
- [ ] Use only a disposable board/root if a tool call is needed.
- [ ] Enforce bounded timeout.
- [ ] Terminate child/process tree on failure.
- [ ] Capture entry/cwd/stdout/stderr diagnostics.
- [ ] Close client/streams and await exit.
- [ ] Remove temp payload on success and failure.

## Regression tests

- [ ] Real plugin isolated success test.
- [ ] Path-with-spaces success test.
- [ ] Missing manifest/entry failure test.
- [ ] External-only dependency fixture fails in isolation.
- [ ] Timeout fixture terminates cleanly.
- [ ] Cleanup is asserted after failures.
- [ ] No shipped behavior/test hook was added solely for tracing.

## Rail and verification

- [ ] Keep one `plugin:check` script.
- [ ] Ensure root `verify` calls it exactly once.
- [ ] Ensure no pre-check build overwrites drift.
- [ ] Add no separate Actions job.
- [ ] Run scripts/check tests.
- [ ] Run `npm run plugin:check` from normal main checkout.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Run Windows PR job.
- [ ] Confirm passing check leaves working tree clean.
- [ ] Run `git diff --check` and `git status --short`.
- [ ] Record isolated-path/handshake/negative-fixture evidence.
- [ ] Stop before merge.
