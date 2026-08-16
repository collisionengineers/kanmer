# Post-implementation report

Priority is gone from the model. A legacy value rides along harmlessly until the
migration strips it.

**For review:** `priorities` is still accepted on `BoardConfigSchema` (optional)
purely so an unmigrated board parses. It is never written, and the migration
deletes it. Worth confirming nobody reintroduces a read of it.
