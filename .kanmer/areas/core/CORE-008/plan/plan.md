# Plan

Store a group as a folder, `groups/<ID>/<ID>.md`, so shared context documents
have somewhere to live beside it. Frontmatter is kind/title/archived plus
timestamps; the body is the goal.

`deriveMembers` is pure and takes the item list, so it is testable without the
filesystem and callable from anywhere that already has items loaded.

Archived members are **listed but not counted**. Listing them means nothing
silently disappears from a group's history; excluding them from progress means
progress reads as "of the work still live", which is the number anyone actually
wants.

Group ids reuse `nextPrefixNumber` with the group folder's own maximum as the
floor. Groups live outside `areas/`, so the ticket scan cannot see them, and
counters must stay purely derived.

`assertGroups` validates membership on write. There is no second place to catch
a dangling id — membership exists only on the ticket — so an unvalidated write
would surface as a chip pointing at nothing.

No add/remove-member tool: membership rides on `update_item(groups: [...])`,
matching labels and blocks. A dedicated verb would imply the group owns the
list.
