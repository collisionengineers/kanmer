# GUI-114 checklist

## Packet and design

- [ ] Re-read GUI-114, GUI-113 merge packet, HZN-007 context, FRD-012,
  ADR-0016, finding 3836808787 and live gates.
- [ ] Record the argv boundary, provider ownership, and no-native-plugin scope.
- [ ] Write research, files, plan and resolved questions.

## Shell-safe registration

- [ ] Add a provider-owned argv builder for CLI registrations.
- [ ] Execute Claude registration through `execFile`/argv in production.
- [ ] Keep the copy-paste command safe for shell metacharacters.
- [ ] Preserve Codex/OpenCode file registrations and GUI-113 native plugin
  staging unchanged.

## Tests and evidence

- [ ] Add exact Claude argv and hostile `team&whoami` regression coverage.
- [ ] Add Connect production seam proving no shell execution and one argv value.
- [ ] Run focused and relevant GUI tests with exact exits.
- [ ] Run workspace typecheck/build, manual/docs/agents/skills/scripts/diff rails;
  preserve failures and unavailable plugin/host evidence.
- [ ] Mark hosted protection and real Claude host proof INCONCLUSIVE.

## Handoff

- [ ] Write post-implementation report.
- [ ] Commit/push, record exact PR/commit, and move one boundary to Review.
- [ ] Append/read back HZN-007 current/run and ticket/gates.

## Stop condition

Stop at Review for independent review; do not self-review or merge.
