# Checklist

- [x] `priority` off the item schema and out of `KEY_ORDER`
- [x] `priorities` optional on the board schema, never written
- [x] `defaultPriority` deleted; create/update/filter drop the field
- [x] passthrough verified: a hand-added `priority:` survives an edit
- [x] clean writes omit it
