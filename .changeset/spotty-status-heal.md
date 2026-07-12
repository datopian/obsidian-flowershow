---
"flowershow": patch
---

Fix published files always showing as "Changed" in the publish status view. The plugin computed a plain `SHA-1` of file content, but the server stores and compares a **git blob** SHA-1 (`SHA-1("blob " + byteLength + "\0" + content)`, matching the CLI and `git hash-object`). The two never matched, so every published file was reported as changed forever. Both `calculateFileSha` and `calculateTextSha` now produce the git blob SHA. No republish is needed after updating — the next status refresh reconciles automatically.
