# Plan — CORE-049

1. Read CORE-046/047 packets and inspect the existing bounded rename helper and test seam.
2. Route quarantine rename through that helper while preserving ownership checks and concurrency results.
3. Add deterministic transient-error retry tests plus inherited IO/source/plugin rails.
4. Regenerate the standalone artifact when required; update CORE-046 cumulative report and exact commit list through MCP; disposition the fixed PR thread.
5. Request fresh independent review of the cumulative CORE-046 head and stop before merge.
