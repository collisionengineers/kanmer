# Research — DOC-024: v0.3.7 release-note wording

## Question

What one-file v0.3.7 release-notes entry accurately explains the merged deterministic Windows artifact contract, the continuing strict verifier, and the non-publishing tag workflow without treating v0.3.6 as a success or changing release behaviour?

## Findings

- `apps/gui/release-notes.md` begins with the version being released; `scripts/release.mjs` refuses to publish when the required version is absent. The v0.3.7 section must therefore be the new top section.
- [[CORE-100]] is merged and verified. It explicitly sets Electron Builder's Windows artifact pattern to `Kanmer-Setup-<version>.exe`, matching the local installer, `latest.yml`, GitHub upload name, and existing strict verifier.
- [[CORE-100]] deliberately leaves verifier protection unchanged: missing assets, byte mismatches, and manifest mismatches remain failures. Its read-only v0.3.6 recheck retained all four historical errors; v0.3.6 must not be described as successful.
- The existing v0.3.6 release notes establish the required division of responsibility: the governed local publisher performs publication, while the tag-triggered workflow performs explicit non-publishing package verification and never creates or repairs a release or assets.
- `scripts/release-notes.test.mjs` is the focused release-notes script rail; final review also needs a one-file diff check because the test does not assert this prose verbatim.

## Implications

Add a concise top-level `## 0.3.7` section to the existing release-notes file. Say the filename is explicitly deterministic and matches the updater manifest; say strict verification still rejects missing, mismatched, and mixed artifacts; and say tag-triggered verification remains non-publishing. State none of the historical v0.3.6 release outcome claims. No source/config/workflow/version/release mutation belongs in this ticket.

## Open questions

No planning question remains; the ticket provides the required wording and [[CORE-100]] provides the merged factual basis.
