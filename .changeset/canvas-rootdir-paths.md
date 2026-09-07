---
"flowershow": patch
---

Fix broken canvas images when publishing from a subfolder. Canvas (`.canvas`) files are now rewritten on publish so their `file`/`text` node references drop the configured rootDir prefix, matching the stripped blob keys the plugin already uploads. Previously canvas files uploaded as raw binary and kept the prefix, so published canvases pointed at paths that 404'd.
