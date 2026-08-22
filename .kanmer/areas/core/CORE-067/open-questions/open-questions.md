# Open questions

## Resolved

- [x] Should a symlink be followed? No; reconciliation must never redirect writes.
- [x] Should the target be overwritten? No; return an actionable failure and preserve the board root.

## Parked (explicitly deferred)

- Symlink behavior on external filesystems beyond the local Windows fixture remains unverified.
