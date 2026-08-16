# Checklist

- [x] `groups/<ID>/<ID>.md` storage with frontmatter + body
- [x] board `groupKinds` with prefixes; shipped epic/EPIC and horizon/HZN
- [x] item `groups: []`, validated against existing ids on create and update
- [x] `deriveMembers` — pure, members + per-stage progress
- [x] archived members listed but excluded from counts
- [x] ids from the per-prefix machinery with an on-disk floor
- [x] free-form shared documents, with the group's own file protected
- [x] archive rather than delete
- [x] `groupsForItem` for the read-everything duty
