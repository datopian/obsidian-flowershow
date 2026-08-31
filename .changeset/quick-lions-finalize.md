---
"flowershow": patch
---

Wait for the server to finish finalizing a publish or unpublish before reporting it complete. Uploading a file to R2 (or deleting one) only stages the change — the server processes blobs asynchronously — so the publish status view briefly showed just-published files as still "New" (and just-unpublished files as still present) until processing caught up, making it look as if the operation had stalled. The plugin now waits for finalization before refreshing status: publishes poll the site status endpoint until nothing is pending, and unpublishes poll a dry-run sync until the removed paths are gone. Files now land in the correct section immediately, without needing to close and reopen the modal.
