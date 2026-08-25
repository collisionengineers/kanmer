# Plan — GUI-136

## Objective

Preserve the authenticated loopback endpoint across the packaged remote child protocol so the GUI can run truthful local and public doctor checks after Cloudflare connects.

## Starting state

The exact packaged runtime starts its loopback server and Cloudflare connector, but `remote-cli` labels the public URL as the ready event's `endpoint`. The GUI rejects it as non-loopback, reaches a misleading ready state with no local endpoint, and doctor fails.

## Required changes

- Extend `KanmerRemoteHost.start()` additively to return both the existing public `endpoint` and a `localEndpoint` captured from the actual HTTP listener.
- Emit `localEndpoint` as the ready protocol `endpoint` used by the GUI; optionally name the public URL separately for diagnostics without changing the GUI trust decision.
- Add regression assertions at the remote-host contract and GUI manager protocol boundary.

## Expected files

Only the files named in the files document.

## Do not modify

Cloudflare credentials, DNS/account resources, bearer format/storage, updater paths, board files, or unrelated runtime code.

## Constraints

- No new dependencies.
- The GUI must never accept a public or non-loopback URL as the local origin.
- Existing public endpoint callers keep their meaning.
- Errors remain surfaced and tests are not weakened.

## Governing docs

FRD-025 requires an authenticated loopback origin, explicit Cloudflare forwarding, and end-to-end doctor checks. Separating the two endpoint identities directly restores that contract.

## Ordered steps

1. Add `localEndpoint` to the remote host start result while retaining public `endpoint`.
2. Update the child ready event to carry the loopback origin in the GUI-consumed field.
3. Extend remote-host/smoke tests and GUI manager protocol coverage.
4. Run focused MCP and GUI tests, typecheck, build, and diff checks.
5. Write the report, commit, push, open a PR with `Kanmer: GUI-136`, and stop in Review.

## Acceptance checks

- Remote host result contains canonical loopback `localEndpoint` and unchanged HTTPS public `endpoint`.
- Packaged-manager ready parsing stores the loopback endpoint.
- Doctor receives that endpoint.
- Focused tests and typecheck pass.

## Commands

- `npm run build`
- `node --test packages/mcp-server/src/remote-host.test.mjs`
- `npm exec vitest run -- src/main/remoteAccess/manager.test.ts` from `apps/gui`
- `npm run typecheck`
- `git diff --check`

## Failure and deviation rules

Preserve every failure. If the required fix needs files outside the declared scope or changes the public endpoint contract, stop and revise the ticket packet.

## Stop condition

Stop after the implementation is committed and pushed, the PR is open with all required checks, the post-implementation report is written, and GUI-136 is in Review for independent review.
