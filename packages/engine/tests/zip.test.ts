import { describe, expect, it } from "vitest";
import { bytesToBase64, createStoredZip } from "../src/zip";

function u8(text: string): Uint8Array {
  return Uint8Array.from(text.split("").map((c) => c.charCodeAt(0)));
}

describe("stored ZIP writer", () => {
  it("writes local headers and a central directory", () => {
    const zip = createStoredZip([
      { name: "manifest.json", data: u8("{\"ok\":true}") },
      { name: "photos/a.txt", data: u8("hello") },
    ]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    // End-of-central-directory signature is the last 22 bytes.
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(zip.length - 12, true)).toBe(2); // entries
    const text = new TextDecoder().decode(zip);
    expect(text).toContain("manifest.json");
    expect(text).toContain("photos/a.txt");
    expect(text).toContain("hello");
  });

  it("base64-encodes binary bytes", () => {
    expect(bytesToBase64(Uint8Array.from([0, 1, 2, 3, 254, 255]))).toBe("AAECA/7/");
  });
});
