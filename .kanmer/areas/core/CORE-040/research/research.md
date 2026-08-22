# CORE-040 research

The CORE-039 fixture now makes board discovery hermetic, but release-notes.mjs still resolves --since v0.3.2 through git. GitHub Actions checks out a shallow branch without that historical tag, so resolveSince throws before reading the fixture. An ISO cutoff is already a supported input and removes this test-only repository-history dependency without changing production behavior.
