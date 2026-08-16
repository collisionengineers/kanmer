# Plan

Two `install` specs change from `agentsOnly` to `project` + `.agents/skills`.
Everything downstream — the copy, the version stamp, the update-offer flow, the
disconnect cleanup — already handles project scope, so there is no new
machinery.

The AGENTS block is still written for every provider. It is the universal
orientation layer (ADR-0009 layer 3), not a fallback that skills replace.

Grok deliberately keeps `.grok/skills`.
