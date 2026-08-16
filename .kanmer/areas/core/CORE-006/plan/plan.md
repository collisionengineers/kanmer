# Plan

Follow the `due` removal precisely, including its test shape.

The key stays in **passthrough**, so a v2 file that still carries `priority:`
loads without error and the value survives an agent edit untouched. Nothing
reads it; the migration strips it. That ordering matters — removing the schema
field and the stored value in one step would mean a board that is briefly
neither v2 nor v3.
