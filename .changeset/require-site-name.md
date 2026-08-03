---
"flowershow": minor
---

Require an explicit site name before publishing. Previously an empty site name silently fell back to the vault name, and the existing settings validation was never actually run. The plugin now validates settings at every publish entry point (single note, publish all, and the publish status modal) and blocks publishing with a clear notice until a site name is set.
