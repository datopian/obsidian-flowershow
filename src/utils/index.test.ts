import { describe, it, expect } from "vitest";
import { calculateFileSha, calculateTextSha } from "./index";

/**
 * The server stores Blob.sha as a *git blob* SHA-1
 * (`SHA-1("blob " + byteLength + "\0" + content)`), computed by the Cloudflare
 * worker's computeGitBlobSha() and matched by the Go CLI's sha1Hex(). The
 * plugin sends its own SHA to the /sync and /files endpoints, so it must use
 * the identical algorithm or every published file is reported as "Changed"
 * forever (see issue #1310).
 *
 * These expected values are `git hash-object` of the exact content.
 */
describe("git blob SHA compatibility with server", () => {
  it("calculateTextSha matches git hash-object for text", async () => {
    // printf '# My new blog post\n\nHello world\n' | git hash-object --stdin
    const text = "# My new blog post\n\nHello world\n";
    expect(await calculateTextSha(text)).toBe(
      "c51e3b0a743630c2259c5ed784c42561ba0c7738",
    );
  });

  it("calculateTextSha matches git hash-object for an empty string", async () => {
    // git hash-object of empty content
    expect(await calculateTextSha("")).toBe(
      "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
    );
  });

  it("calculateFileSha matches git hash-object for bytes", async () => {
    // printf '# My new blog post\n\nHello world\n' | git hash-object --stdin
    const bytes = new TextEncoder().encode("# My new blog post\n\nHello world\n");
    expect(await calculateFileSha(bytes)).toBe(
      "c51e3b0a743630c2259c5ed784c42561ba0c7738",
    );
  });
});
