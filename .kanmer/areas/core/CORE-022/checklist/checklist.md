# Checklist

## Core — the retry
- [ ] `renameWithRetry` retries only `EPERM` / `EBUSY` / `EACCES`
- [ ] backoff `10, 25, 60, 150, 300` ms
- [ ] non-transient codes throw on the first attempt
- [ ] temp removed in a `finally`, success or failure
- [ ] success path is still a single `rename` — no added cost
- [ ] rename injectable for tests, documented as a test seam

## Core — convergence
- [ ] `migrateToV3` skips the rewrite when the ticket already has a profile and no priority
- [ ] doc-move loops untouched
- [ ] `resumed` on `V3Report`, plus a note
- [ ] `writeVersion` stays last

## Core — hygiene
- [ ] stale `.tmp-*` swept, older than 60 s only
- [ ] swept count in the report
- [ ] `ensureIgnore` covers the temp pattern

## GUI
- [ ] `CH.migrate` stops the watcher and sync timer
- [ ] both restored in a `finally`, including on throw
- [ ] restored watcher is stored back on the context

## Tests
- [ ] injected EPERM clearing on the third attempt
- [ ] non-transient code fails fast
- [ ] no temp left after permanent failure
- [ ] re-run rewrites zero tickets; `resumed` true
- [ ] real-board fixture: completes, 48 migrate, 194 untouched, 47 remapped, 0 needs-restage, 5 temps swept, version → 3
- [ ] second fixture run is a clean `alreadyV3` no-op

## Docs and rail
- [ ] FRD-007 M4 corrected
- [ ] `npm test`, both smokes, typecheck, GUI build, boot smoke
- [ ] `plugin:build` + `plugin:check`
