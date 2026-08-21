# Plan — GUI-068: Verify the automatic update path on the next release

## Approach

Use two published packaged builds to exercise the updater exactly as a user does. Capture three independent claims—automatic success with a live MCP session, actionable refusal for an uncleared holder, and measured respawn timing—and make source changes only if those measurements disprove the shipped behavior.

## Governing docs

- **Meets FRD-021 R1/R2** — exercise the visible update surface and the live-session restart/refusal gate.
- **Meets FRD-021 R3/R4** — use real release assets and verify the installed registration path remains valid after the update.
- FRD-021 is not modified unless measured behavior proves its as-built description false.

## Steps

1. Create an isolated Windows test environment and install the earliest available released build containing GUI-064; record version, install path, update feed, and baseline process/lock state.
2. Start a real agent MCP session from that installation, initiate the newer published update from Kanmer's GUI, and capture the pre-installer process/lock probe.
3. Verify the application stops its MCP child, installs without a manual installer launch, restarts on the newer version, and retains a working project registration.
4. Start a controlled Electron-as-Node holder that the owned-session predicate cannot clear, initiate the update, and capture the refusal dialog showing the affected project and actionable reason; confirm no installer starts.
5. In a separate measurement, terminate a live installed MCP server and timestamp polling for any replacement process under the installation directory until the current retry window expires.
6. Compare the observed timing with `STOP_ROUNDS` and `SETTLE_MS`. If invalid, correct the constants/logic, add regression tests, build a new packaged pair, and repeat steps 2–5.
7. Run the full verification rail and record screenshots, redacted logs, installer exit codes, versions, and registrations in proof.

## Verification

Evidence must include the visual refusal, numerical respawn timing, automatic installer exit/result, before/after versions, zero blocked files at install, and a working post-update MCP call. Run `npm test`, root `npm run typecheck`, `npm run dist:check`, and the packaged smoke if source changes.

## Risks / open questions

- A published update may not be offered because the test pair or feed is wrong; fail the run rather than substituting a manual install.
- Security tools may introduce unrelated locks; identify the holding process and classify the result separately.
- No unresolved product questions.
