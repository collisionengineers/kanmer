# Open questions — SKILL-024

## Resolved

- [x] Which skeleton is authoritative? DOC-014’s `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md`; setup must reference it, never duplicate it.
- [x] What counts as a required section? Commands, Architecture map, Conventions, Gotchas, and Verification, recognized as case-insensitive Markdown headings outside the managed marker span.
- [x] What happens for an existing partial guide? Report only the missing labels; preserve all human-authored bytes and do not attempt completion.
- [x] How is the documentation follow-up idempotent? After a board exists, search for a stable `Source: AGENTS.md skeleton created by kanmer-setup` marker before creating a single backlog documentation ticket.

## Parked (explicitly deferred)

- None.
