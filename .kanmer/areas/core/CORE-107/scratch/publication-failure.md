## v0.3.9 publication attempt — FAIL

- Exact merged release commit: `1034f6cfde7a61348da5dcc4db8bd8691bde0c7b`.
- Canonical publisher built one Windows package, passed the complete verification rail and eight updater-package checks, pushed immutable tag `v0.3.9`, created a draft, and uploaded the four canonical assets.
- Strict draft verification then exited non-zero: authenticated `GET /repos/collisionengineers/kanmer/releases/tags/v0.3.9` returned 404.
- Independent read-only inspection proved draft release id 376364285 exists and contains `kanmer-0.3.9.mcpb`, `Kanmer-Setup-0.3.9.exe`, its blockmap, and `latest.yml`, all in uploaded state with SHA-256 digests. GitHub exposes draft asset URLs under an `untagged-*` path.
- Root cause: the tag-specific REST lookup does not expose the unpublished draft; the publisher must identify its draft through an authenticated draft-capable route or captured release identity before verification.
- v0.3.9 remains unpublished and unchanged as failed evidence. Do not overwrite, retag, or present it as a successful release. A higher successor version is required after the verifier fix.
