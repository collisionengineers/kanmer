# Post-implementation report

Requirements are now a property of the work. The engine is one function that
MCP, the GUI and skills all call, which is what lets ADR-0009's "skills derive,
never restate" actually hold — a skill that described gates in prose would go
per-ticket wrong the moment profiles make requirements vary.

**For review:** the v2 `requires` chain *between document types* (plan needed
research+impact first) is gone. Profiles express ordering as boundary
requirements instead, so a document can be written whenever it is useful rather
than only after its prerequisite. That is a deliberate loosening: the old chain
blocked an agent from jotting a plan while researching, which is a normal thing
to want.
