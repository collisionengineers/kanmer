# Open questions — GUI-093

- [x] **Can recovery package again?** — No. [[GUI-092]] established that a second NSIS package can make latest.yml describe a different installer; recovery uploads only files from the single completed local package.
- [x] **May a publisher 422 be treated as success?** — Yes, only when the existing remote verifier proves all expected assets are uploaded and byte-identical. External asset evidence outranks the publisher exit code; incomplete assets still require the bounded exact-file repair and re-verification.

## Parked (explicitly deferred)

- [ ] **Real next-release acceptance** — owned by [[GUI-068]] because it needs an authorized published release and an installed prior-version client; this ticket supplies deterministic release-rail evidence only.
