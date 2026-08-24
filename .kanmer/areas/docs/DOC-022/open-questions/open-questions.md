# Open questions — DOC-022

- [x] **Does tag-triggered verification publish a release after CORE-097?** No. It packages and checks with explicit `--publish never`; the workflow remains read-only.
- [x] **Who performs actual release publication?** The governed local publisher after its protected-main preparation and merge boundary; this documentation change does not run or alter it.
- [x] **May this note imply that v0.3.4 became public?** No. The failed v0.3.4 publication remains a separate historical record and is not asserted as released.

## Parked (explicitly deferred)

- [ ] Exact v0.3.5 publication and asset evidence are deferred to [[CORE-098]] after authorized release preparation and publication; reopening requires that ticket's merged/published evidence.
