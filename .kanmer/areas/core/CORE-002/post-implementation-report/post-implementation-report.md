# Post-implementation report

Stages are constants. `board.yml` no longer carries `statuses`, and no code
path can add, remove, rename or reorder a stage.

**For review:** the deletion of `assertFinalStageGates` is the one change that
removes a safety check rather than moving it. It was sound to delete — the guard
existed solely because a board write could promote a different stage into the
final slot, and that is now impossible — but it deserves a second pair of eyes,
so the reasoning is left as a comment where the function used to be.

`statuses` stays optional in the schema rather than being removed outright, so
an unmigrated board still parses and can be read before the user chooses to
migrate.
