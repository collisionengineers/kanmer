# Checklist — MCP-030

- [ ] Reproduce the main-checkout plugin-bundle mismatch and record its generated-path-only diff.
- [ ] Regenerate the standalone plugin bundle from the canonical main checkout.
- [ ] Confirm the tracked diff is restricted to the expected generated artifact.
- [ ] Run plugin consistency, MCP smoke, and whitespace checks.
- [ ] Commit the artifact update and open a PR.
- [ ] Write the post-implementation report with the canonical-build rationale.
