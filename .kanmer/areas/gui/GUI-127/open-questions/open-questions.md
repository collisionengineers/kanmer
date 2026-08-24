# Open questions — GUI-127

## Resolved

- [x] Is the failure a known global Vitest timeout? No. The test bodies already use a 30-second scoped timeout; the failing lifecycle hook remains at the default bound.
- [x] Is a production Git subprocess leak proven? No. No `git` process remained after the failure, so production code is inspect-only unless later evidence contradicts this.
- [x] May pre-existing `kanmer-git-*` temporary roots be removed as part of this ticket? No. Only roots created by controlled GUI-127 runs may be removed; existing user/system temp data is out of scope.
